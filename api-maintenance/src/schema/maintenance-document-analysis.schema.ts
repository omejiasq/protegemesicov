import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type MaintenanceDocumentAnalysisDocument =
  HydratedDocument<MaintenanceDocumentAnalysis>;

@Schema({ collection: 'maintenance_document_analyses', timestamps: true })
export class MaintenanceDocumentAnalysis {
  @Prop({ required: true, index: true })
  enterprise_id!: string;

  /** Placa del vehículo extraída por IA */
  @Prop({ trim: true, index: true })
  placa?: string;

  /** ID del formato usado para la extracción */
  @Prop({ type: String, index: true })
  workshop_format_id?: string;

  /** URL/path del documento original (imagen o PDF) */
  @Prop({ trim: true })
  documento_url?: string;

  /** JSON extraído por Claude (estructura libre según el formato) */
  @Prop({ type: Object })
  datos_extraidos?: Record<string, any>;

  /** Nivel de confianza reportado por Claude: 'alta' | 'media' | 'baja' */
  @Prop({ enum: ['alta', 'media', 'baja'], default: 'media' })
  confianza!: 'alta' | 'media' | 'baja';

  /** Texto de observaciones extraído (el campo más valioso para alarmas) */
  @Prop()
  observaciones?: string;

  /** Fecha del documento según lo extraído */
  @Prop()
  fecha_documento?: string;

  /** Usuario que subió el documento */
  @Prop()
  subido_por?: string;

  /** Si ya fue revisado por un humano */
  @Prop({ default: false })
  revisado!: boolean;

  /** Vinculado a un mantenimiento preventivo/correctivo específico */
  @Prop({ type: String, default: null })
  preventive_id?: string | null;

  @Prop({ type: String, default: null })
  corrective_id?: string | null;
}

export const MaintenanceDocumentAnalysisSchema =
  SchemaFactory.createForClass(MaintenanceDocumentAnalysis);

MaintenanceDocumentAnalysisSchema.index({ enterprise_id: 1, placa: 1, createdAt: -1 });
