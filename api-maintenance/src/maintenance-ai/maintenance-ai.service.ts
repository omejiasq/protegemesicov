import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import Anthropic from '@anthropic-ai/sdk';

import {
  WorkshopFormat,
  WorkshopFormatDocument,
} from '../schema/workshop-format.schema';
import {
  MaintenanceDocumentAnalysis,
  MaintenanceDocumentAnalysisDocument,
} from '../schema/maintenance-document-analysis.schema';

@Injectable()
export class MaintenanceAiService {
  private readonly anthropic: Anthropic;

  constructor(
    @InjectModel(WorkshopFormat.name)
    private readonly formatModel: Model<WorkshopFormatDocument>,

    @InjectModel(MaintenanceDocumentAnalysis.name)
    private readonly analysisModel: Model<MaintenanceDocumentAnalysisDocument>,
  ) {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  // ─────────────────────────────────────────────────────────
  // CRUD de formatos (solo superadmin)
  // ─────────────────────────────────────────────────────────

  async createFormat(dto: {
    enterprise_id?: string | null;
    nombre: string;
    descripcion?: string;
    prompt_extraccion: string;
    campos_esperados?: string[];
  }) {
    return this.formatModel.create(dto);
  }

  async listFormats(enterprise_id?: string) {
    return this.formatModel
      .find({
        enabled: true,
        $or: [
          { enterprise_id: enterprise_id ?? null },
          { enterprise_id: null }, // formatos globales
        ],
      })
      .sort({ nombre: 1 })
      .lean();
  }

  async listAllFormats() {
    return this.formatModel.find().sort({ nombre: 1 }).lean();
  }

  async updateFormat(id: string, dto: Partial<WorkshopFormat>) {
    const doc = await this.formatModel.findByIdAndUpdate(id, { $set: dto }, { new: true });
    if (!doc) throw new NotFoundException('Formato no encontrado');
    return doc;
  }

  async toggleFormat(id: string) {
    const doc = await this.formatModel.findById(id);
    if (!doc) throw new NotFoundException('Formato no encontrado');
    doc.enabled = !doc.enabled;
    return doc.save();
  }

  // ─────────────────────────────────────────────────────────
  // ANÁLISIS DE DOCUMENTO CON CLAUDE
  // ─────────────────────────────────────────────────────────

  async analyzeDocument(params: {
    imageBase64: string;
    mediaType: 'image/jpeg' | 'image/png' | 'application/pdf';
    workshop_format_id?: string;
    enterprise_id: string;
    subido_por?: string;
    preventive_id?: string;
    corrective_id?: string;
    documento_url?: string;
  }) {
    // 1. Obtener el prompt del formato (o usar prompt genérico)
    let prompt = DEFAULT_EXTRACTION_PROMPT;
    let format: WorkshopFormatDocument | null = null;

    if (params.workshop_format_id) {
      format = await this.formatModel.findById(params.workshop_format_id);
      if (!format) throw new NotFoundException('Formato de taller no encontrado');
      prompt = format.prompt_extraccion;
    }

    // 2. Llamar a Claude API con la imagen
    const mediaType = params.mediaType === 'application/pdf'
      ? 'image/jpeg' // PDFs se convierten a imagen antes de enviarse
      : params.mediaType;

    let extractedData: Record<string, any> = {};
    let confianza: 'alta' | 'media' | 'baja' = 'baja';

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-opus-4-6',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mediaType,
                  data: params.imageBase64,
                },
              },
              {
                type: 'text',
                text: prompt,
              },
            ],
          },
        ],
      });

      const rawText = response.content[0].type === 'text'
        ? response.content[0].text
        : '';

      // Parsear JSON de la respuesta
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extractedData = JSON.parse(jsonMatch[0]);
        confianza = extractedData.confianza ?? 'media';
      }
    } catch (err) {
      throw new BadRequestException(
        `Error al analizar documento con IA: ${(err as Error).message}`,
      );
    }

    // 3. Guardar análisis en la base de datos
    const analysis = await this.analysisModel.create({
      enterprise_id: params.enterprise_id,
      placa: extractedData.placa ?? null,
      workshop_format_id: params.workshop_format_id ?? null,
      documento_url: params.documento_url ?? null,
      datos_extraidos: extractedData,
      confianza,
      observaciones: extractedData.observaciones ?? null,
      fecha_documento: extractedData.fecha ?? null,
      subido_por: params.subido_por ?? null,
      preventive_id: params.preventive_id ?? null,
      corrective_id: params.corrective_id ?? null,
    });

    // 4. Analizar recurrencia de fallas para esta placa
    let alertas: string[] = [];
    if (extractedData.placa && extractedData.observaciones) {
      alertas = await this.detectarFallasRecurrentes(
        extractedData.placa,
        params.enterprise_id,
        extractedData.observaciones,
      );
    }

    return { analysis, alertas };
  }

  // ─────────────────────────────────────────────────────────
  // DETECCIÓN DE FALLAS RECURRENTES
  // ─────────────────────────────────────────────────────────

  async detectarFallasRecurrentes(
    placa: string,
    enterprise_id: string,
    observacionesNuevas: string,
  ): Promise<string[]> {
    // Obtener últimos 10 análisis del mismo vehículo
    const historial = await this.analysisModel
      .find({ enterprise_id, placa: placa.toUpperCase() })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    if (historial.length < 2) return [];

    // Pedir a Claude que analice si hay falla recurrente
    const observacionesHistorial = historial
      .map((h, i) => `[${i + 1}] ${h.observaciones ?? 'Sin observaciones'} (${h.fecha_documento ?? 'sin fecha'})`)
      .join('\n');

    const prompt = `Analiza si hay fallas recurrentes en este vehículo placa ${placa}.

Observaciones históricas (más reciente primero):
${observacionesHistorial}

Observación nueva:
${observacionesNuevas}

Identifica si alguna falla se repite. Devuelve un JSON con:
{
  "hay_recurrencia": true/false,
  "alertas": ["descripción de la alerta 1", "descripción de la alerta 2"]
}
Solo devuelve el JSON.`;

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        messages: [{ role: 'user', content: prompt }],
      });

      const text = response.content[0].type === 'text' ? response.content[0].text : '{}';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        return result.alertas ?? [];
      }
    } catch {
      // No bloquear el flujo principal si el análisis de recurrencia falla
    }

    return [];
  }

  // ─────────────────────────────────────────────────────────
  // LISTADO DE ANÁLISIS POR EMPRESA / PLACA
  // ─────────────────────────────────────────────────────────

  async listAnalyses(enterprise_id: string, placa?: string) {
    const filter: any = { enterprise_id };
    if (placa) filter.placa = placa.toUpperCase();
    return this.analysisModel.find(filter).sort({ createdAt: -1 }).lean();
  }
}

// ─────────────────────────────────────────────────────────
// PROMPT GENÉRICO (cuando no hay formato específico)
// ─────────────────────────────────────────────────────────
const DEFAULT_EXTRACTION_PROMPT = `Eres un asistente especializado en documentos de mantenimiento vehicular.
Analiza la imagen y extrae los datos del formulario. Devuelve ÚNICAMENTE un JSON válido:

{
  "placa": "string o null",
  "fecha": "YYYY-MM-DD o null",
  "tipo_documento": "string o null",
  "empresa": "string o null",
  "observaciones": "texto completo de observaciones/fallas encontradas, o null",
  "responsable": "string o null",
  "confianza": "alta | media | baja"
}

Si un campo está en blanco o ilegible, devuelve null. NO inventes datos. Solo el JSON.`;
