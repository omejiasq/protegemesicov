import moment from 'moment';
import PDFDocument from 'pdfkit';
import { Response } from 'express';
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { MaintenanceExternalApiService } from '../libs/external-api';
import { MaintenanceService } from '../maintenance/maintenance.service';
import { SicovSyncService } from '../sicov-sync/sicov-sync.service';

import {
  EnlistmentDetail,
  EnlistmentDetailDocument,
} from '../schema/enlistment-schema';

import {
  EnlistmentDailySnapshot,
  EnlistmentDailySnapshotDocument,
} from '../schema/enlistment_daily_snapshot.schema';

import {
  EnlistmentItemResult,
  EnlistmentItemResultDocument,
} from '../schema/enlistment_item_result.schema';

import {
  TipoVehiculoTipoInspeccion,
  TipoVehiculoTipoInspeccionDocument,
} from '../schema/tipos-vehiculos-tipos-inspecciones.schema';

import { VehicleRef, VehicleRefDocument } from '../schema/vehicle-ref.schema';

import {
  ItemResponseType,
  ItemResponseTypeDocument,
} from '../schema/item-response-type.schema';

import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';

const ACTIVIDADES_MAP: Record<number, string> = {
  1: 'Fugas del motor',
  2: 'Tensión correas',
  3: 'Ajuste de tapas',
  4: 'Niveles de aceite de motor, transmisión, dirección, frenos',
  5: 'Nivel agua limpiaparabrisas',
  6: 'Aditivos de radiador',
  7: 'Filtros húmedos y secos',
  8: 'Baterías: niveles de electrolito, ajustes de bordes y sulfatación',
  9: 'Llantas: desgaste, presión de aire',
  10: 'Equipo de carretera',
  11: 'Botiquín',
};

@Injectable()
export class AlistamientoService {
  private readonly logger = new Logger(AlistamientoService.name);

  constructor(
    @InjectModel(EnlistmentDetail.name)
    private readonly model: Model<EnlistmentDetailDocument>,

    @InjectModel(EnlistmentDailySnapshot.name)
    private readonly snapshotModel: Model<EnlistmentDailySnapshotDocument>,

    @InjectModel(EnlistmentItemResult.name)
    private readonly itemResultModel: Model<EnlistmentItemResultDocument>,

    @InjectModel(TipoVehiculoTipoInspeccion.name)
    private readonly inspectionTypeModel: Model<TipoVehiculoTipoInspeccionDocument>,

    @InjectModel(VehicleRef.name)
    private readonly vehicleRefModel: Model<VehicleRefDocument>,

    @InjectModel(ItemResponseType.name)
    private readonly itemResponseTypeModel: Model<ItemResponseTypeDocument>,

    private readonly external: MaintenanceExternalApiService,
    private readonly maintenanceService: MaintenanceService,
    private readonly sicovSync: SicovSyncService,
  ) {}

  // ======================================================
  // CREATE
  // ======================================================
  async create(dto: any, user: any) {
    const placa = String(dto.placa || '').trim().toUpperCase();

    if (!placa) {
      throw new BadRequestException('Placa requerida');
    }

    // ── Verificar vehículo habilitado y determinar si aplica SICOV ────────
    let esVehiculoEspecial = false;
    if (user?.enterprise_id) {
      const vehicleRecord = await this.vehicleRefModel
        .findOne({
          placa: { $regex: `^${placa}$`, $options: 'i' },
          enterprise_id: new Types.ObjectId(user.enterprise_id),
        })
        .lean();

      if (vehicleRecord && vehicleRecord.active === false) {
        throw new BadRequestException(
          `El vehículo ${placa} no está habilitado para registrar alistamientos. Contacte al administrador del sistema.`,
        );
      }

      esVehiculoEspecial =
        (vehicleRecord as any)?.tipo_servicio === 'ESPECIAL' ||
        user?.tipo_habilitacion === 'ESPECIAL';
    }
    // 1️⃣ PREVENIR DUPLICADO: mismo usuario + placa en los últimos 2 minutos
    // Protege contra doble envío por timeout de red
    if (user?.sub) {
      const hace2min = new Date(Date.now() - 2 * 60 * 1000);
      const reciente = await this.model.findOne({
        placa,
        enterprise_id: user.enterprise_id,
        createdBy: String(user.sub),
        createdAt: { $gte: hace2min },
      }).lean();

      if (reciente) {
        this.logger.warn(
          `[DUPLICATE] Alistamiento duplicado bloqueado: placa=${placa} user=${user.sub}`,
        );
        throw new ConflictException(
          `Ya se registró un alistamiento para ${placa} hace menos de 2 minutos. Espere un momento antes de volver a intentarlo.`,
        );
      }
    }

    // 2️⃣ CREAR MANTENIMIENTO (LOCAL + intento SICOV)
    // Vehículos ESPECIAL o empresas ESPECIAL no reportan a SICOV
    const userForMaint = esVehiculoEspecial ? { ...user, demoMode: true } : user;

    const {
      doc,
      externalId,
      sicovDown,
    } = await this.maintenanceService.create(
      {
        placa,
        tipoId: 3, // ALISTAMIENTO
        vigiladoId: user.vigiladoId,
      },
      userForMaint,
      { awaitExternal: true },
    );

    if (!doc?._id) {
      throw new ConflictException('No fue posible crear el registro local');
    }

    // sicovDown: SICOV no disponible → se encola para reintento automático

    // 3️⃣ DERIVAR ACTIVIDADES DESDE LA BASE DE DATOS
    // Si vienen items (mobile), se consultan en DB qué valores tienen es_positivo=true
    // para ESTA empresa, y se calculan los codigos_sicov de los ítems positivos.
    // Si solo vienen actividades (web), se usan directamente como fallback.
    let actividadesFinales: number[] = [];

    if (Array.isArray(dto.items) && dto.items.length > 0) {
      // Obtener los valores que esta empresa considera "positivos" para alistamiento
      const positiveResponseDocs = await this.itemResponseTypeModel
        .find({
          company: new Types.ObjectId(user.enterprise_id),
          tipo_mantenimiento: 'enlistment',
          es_positivo: true,
          enabled: true,
        })
        .select('valor')
        .lean();

      const positiveValues = new Set(
        positiveResponseDocs.map((r) => r.valor),
      );

      // Si la empresa no tiene configuración propia, usar 'OK' como fallback universal
      if (positiveValues.size === 0) positiveValues.add('OK');

      this.logger.log(
        `[ENLISTMENT] Valores positivos empresa ${user.enterprise_id}: [${[...positiveValues].join(', ')}]`,
      );

      const positiveItemIds = (dto.items as Array<{ itemId: string; valor: string }>)
        .filter((i) => positiveValues.has(i.valor) && Types.ObjectId.isValid(i.itemId))
        .map((i) => new Types.ObjectId(i.itemId));

      if (positiveItemIds.length > 0) {
        const inspectionDocs = await this.inspectionTypeModel
          .find({ _id: { $in: positiveItemIds } })
          .select('codigos_sicov')
          .lean();

        const codigosSet = new Set<number>();
        for (const d of inspectionDocs) {
          if (Array.isArray(d.codigos_sicov)) {
            d.codigos_sicov.forEach((c) => {
              const n = Number(c);
              if (n > 0) codigosSet.add(n);
            });
          }
        }
        actividadesFinales = [...codigosSet].sort((a, b) => a - b);
      }
    } else if (Array.isArray(dto.actividades) && dto.actividades.length > 0) {
      // fallback: web envía actividades precalculadas
      const codigosSet = new Set<number>(
        dto.actividades.map((x: any) => Number(x)).filter((n: number) => n > 0),
      );
      actividadesFinales = [...codigosSet].sort((a, b) => a - b);
    }

    this.logger.log(`Actividades derivadas → ${JSON.stringify(actividadesFinales)}`);

    // 4️⃣ PAYLOAD SICOV (SIN FECHA / HORA)
    const sicovPayload = {
      mantenimientoId: Number(externalId),

      tipoIdentificacionResponsable: Number(dto.tipoIdentificacion),
      numeroIdentificacionResponsable: String(dto.numeroIdentificacion),
      nombreResponsable: String(dto.nombresResponsable),

      tipoIdentificacionConductor:
        Number(dto.tipoIdentificacionConductor) || 0,

      numeroIdentificacionConductor: dto.numeroIdentificacionConductor
        ? Number(dto.numeroIdentificacionConductor)
        : 0,

      nombresConductor: String(dto.nombresConductor ?? ''),

      detalleActividades: String(dto.detalleActividades ?? ''),

      actividades: actividadesFinales,

      vigiladoId: user.vigiladoId,
      vigiladoToken: user.vigiladoToken,
    };

    this.logger.log(`SICOV payload → ${JSON.stringify(sicovPayload)}`);

    // 5️⃣ ENVÍO A SICOV (con tolerancia a fallos)
    // Demo mode: omitir SICOV, marcar directamente como 'demo'
    const isDemoMode = !!(user as any)?.demoMode;
    let sicovDetailDown = sicovDown;

    if (!sicovDown && externalId && !isDemoMode) {
      try {
        await Promise.race([
          this.external.guardarAlistamiento(sicovPayload),
          new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error('Timeout al enviar alistamiento a SICOV')),
              15000,
            ),
          ),
        ]);
      } catch (error) {
        this.logger.warn(
          `[ENLISTMENT] SICOV no disponible para guardarAlistamiento: ` +
          `${error?.message ?? error}. Se encolará para reintento.`,
        );
        sicovDetailDown = true;
      }
    }

    // 6️⃣ DESACTIVAR ALISTAMIENTOS ANTERIORES
    await this.model.updateMany(
      {
        placa,
        enterprise_id: user.enterprise_id,
        estado: true,
      },
      { $set: { estado: false } },
    );

    // 7️⃣ GUARDAR LOCAL
    const syncStatus = esVehiculoEspecial ? 'no_aplica' : isDemoMode ? 'demo' : sicovDetailDown ? 'pending' : 'synced';
    const fechaSyncSicov = syncStatus === 'synced' ? new Date() : null;
    const enlistment = await this.model.create({
      enterprise_id: user.enterprise_id,
      createdBy: user.sub,

      placa,
      mantenimientoId: String(doc._id),

      tipoIdentificacion: dto.tipoIdentificacion,
      numeroIdentificacion: dto.numeroIdentificacion,
      nombresResponsable: dto.nombresResponsable,

      tipoIdentificacionConductor: dto.tipoIdentificacionConductor ?? '',
      numeroIdentificacionConductor:
        dto.numeroIdentificacionConductor ?? '',
      nombresConductor: dto.nombresConductor ?? '',

      detalleActividades: dto.detalleActividades ?? '',
      actividades: actividadesFinales,

      firma_conductor_foto: dto.firma_conductor_foto ?? null,
      firma_inspector_foto: dto.firma_inspector_foto ?? null,

      latitud:  dto.latitud  ?? null,
      longitud: dto.longitud ?? null,

      estado: true,
      sicov_sync_status: syncStatus,
      fechaSyncSicov,
      source: (dto as any).source ?? 'frontend',
    });

    // 8️⃣ ENCOLAR SI SICOV ESTABA CAÍDO (no encolar en demo mode)
    if (sicovDetailDown && !isDemoMode) {
      const maintenancePayload = {
        placa,
        tipoId: 3,
        vigiladoId: String(user.vigiladoId ?? process.env.SICOV_VIGILADO_ID),
        vigiladoToken: user.vigiladoToken,
      };

      await this.sicovSync.enqueue({
        enterprise_id: user.enterprise_id,
        recordType: 'enlistment',
        localMaintenanceId: String(doc._id),
        localDetailId: String(enlistment._id),
        maintenancePayload,
        // Si ya teníamos externalId de fase 1, saltamos directo a fase 2
        maintenanceExternalId: externalId ?? undefined,
        detailPayload: {
          ...sicovPayload,
          mantenimientoId: undefined, // se sobreescribe en el sync con el externalId real
        },
      });

      this.logger.warn(
        `[ENLISTMENT] Guardado local OK — SICOV caído, encolado para reintento: ${String(enlistment._id)}`,
      );
    }

    // 9️⃣ SNAPSHOT
    /*
    if (dto.dailySnapshot) {
      await this.snapshotModel.create({
        mantenimientoId: String(doc._id),
        ...dto.dailySnapshot,
      });
    }
    */

    // 🔟 ITEMS
    if (Array.isArray(dto.items) && dto.items.length) {
      await this.itemResultModel.insertMany(
        dto.items.map((i: any) => ({
          mantenimientoId: String(doc._id),
          itemId: new Types.ObjectId(i.itemId),
          estado: i.valor,
        })),
      );
    }

    return enlistment;
  }

  // ======================================================
  // LIST
  // ======================================================
  async list(q: any, user: any) {
    const match: any = {
      enterprise_id: user.enterprise_id,
    };

    if (q?.placa) {
      match.placa = q.placa.toUpperCase().trim();
    }

    if (q?.fechaDesde || q?.fechaHasta) {
      match.createdAt = {};
      if (q.fechaDesde)
        match.createdAt.$gte = new Date(`${q.fechaDesde}T00:00:00.000Z`);
      if (q.fechaHasta)
        match.createdAt.$lte = new Date(`${q.fechaHasta}T23:59:59.999Z`);
    }

    return this.model.aggregate([
      { $match: match },
      { $sort: { createdAt: -1 } },
      { $limit: 500 },
      {
        $lookup: {
          from: 'vehicles',
          localField: 'placa',
          foreignField: 'placa',
          as: '_vehicle',
          pipeline: [{ $project: { no_interno: 1 } }],
        },
      },
      {
        $addFields: {
          no_interno: {
            $ifNull: [{ $arrayElemAt: ['$_vehicle.no_interno', 0] }, ''],
          },
        },
      },
      { $unset: '_vehicle' },
    ]);
  }

  // ======================================================
  // LIST BY USER
  // ======================================================
  async listByUser(_: any, user: any) {
    return this.model
      .find({ enterprise_id: user.enterprise_id, createdBy: user.sub })
      .sort({ createdAt: -1 })
      .lean();
  }

  // ======================================================
  // VIEW
  // ======================================================
  async view(dto: { id: string }, user: any) {
    if (!Types.ObjectId.isValid(dto.id)) {
      throw new NotFoundException('No encontrado');
    }

    const item = await this.model.findOne({
      _id: dto.id,
      enterprise_id: user.enterprise_id,
    });

    if (!item) throw new NotFoundException('No encontrado');
    return item;
  }

  // ======================================================
  // LIST ACTIVITIES
  // ======================================================
  async listActivities() {
    return this.external.listarActividades(
      process.env.SICOV_VIGILADO_ID,
    );
  }

  // ======================================================
  // TOGGLE
  // ======================================================
  async toggle(id: string, user: any) {
    const item = await this.model.findOne({
      _id: id,
      enterprise_id: user.enterprise_id,
    });

    if (!item) throw new NotFoundException('No encontrado');

    item.estado = !item.estado;
    await item.save();
    return item;
  }

  // ======================================================
  // PRINT PDF
  // ======================================================
  async printPdf(id: string, user: any, res: Response): Promise<void> {
    this.logger.log(`[PDF] Solicitando PDF para alistamiento id=${id} user=${user?.sub} enterprise=${user?.enterprise_id}`);

    if (!Types.ObjectId.isValid(id)) {
      this.logger.warn(`[PDF] ID inválido: ${id}`);
      throw new NotFoundException('ID inválido');
    }
  
    const data = await this.model.aggregate([
      { $match: { _id: new Types.ObjectId(id) } },
      {
        $lookup: {
          from: 'enterprises',
          let: {
            enterpriseId: {
              $cond: [
                { $eq: [{ $type: '$enterprise_id' }, 'objectId'] },
                '$enterprise_id',
                {
                  $cond: [
                    { $and: [
                      { $eq: [{ $type: '$enterprise_id' }, 'string'] },
                      { $ne: ['$enterprise_id', ''] },
                    ]},
                    { $toObjectId: '$enterprise_id' },
                    null,
                  ],
                },
              ],
            },
          },
          pipeline: [
            { $match: { $expr: { $eq: ['$_id', '$$enterpriseId'] } } },
          ],
          as: 'enterprise',
        },
      },
      { $unwind: { path: '$enterprise', preserveNullAndEmptyArrays: true } },
    ]);

    if (!data.length) {
      this.logger.warn(`[PDF] Alistamiento no encontrado: id=${id}`);
      throw new NotFoundException('Alistamiento no encontrado');
    }

    const e = data[0];
    this.logger.log(`[PDF] Alistamiento encontrado: placa=${e.placa} enterprise_id=${e.enterprise_id} enterprise=${e.enterprise?.name ?? 'SIN EMPRESA'}`);

    // ── Altura dinámica: todo en una sola página ──────────────────────────
    const numActividades = Object.keys(ACTIVIDADES_MAP).length;
    const notesText = e.detalleActividades ? String(e.detalleActividades).trim() : '';
    const notasLineas = notesText ? Math.ceil(notesText.length / 32) + 2 : 0;

    const pageHeight = Math.max(700,
        80                                          // encabezado empresa + leyenda
      + 70                                          // datos vehículo
      + 60                                          // conductor
      + 60                                          // responsable
      + 20                                          // título checklist
      + numActividades * 13                         // ítems checklist
      + 20                                          // separador
      + (notasLineas > 0 ? 25 + notasLineas * 12 : 0) // notas
      + 100                                         // firma conductor
      + 100                                         // firma responsable
      + 40                                          // footer
    );

    const doc = new PDFDocument({
      size: [226, pageHeight],
      margins: { top: 12, left: 12, right: 12, bottom: 12 },
      autoFirstPage: true,
    });
  
    try {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename=alistamiento-${e.placa}.pdf`,
    );

    doc.pipe(res);
  
    // ================= ENCABEZADO =================
    const enterpriseName = e.enterprise?.name ?? '';
    const vigiladoId    = e.enterprise?.vigiladoId ?? '';

    doc.font('Helvetica-Bold')
       .fontSize(11)
       .text(vigiladoId ? `${enterpriseName}  NIT: ${vigiladoId}` : enterpriseName || 'Empresa', { align: 'center' });
  
    doc.moveDown(0.3);
  
    doc.font('Helvetica')
       .fontSize(8)
       .text(
         'Documento generado a través de la plataforma tecnológica de Itfusion SAS. NIT: 900416316, avalada por la Superintendecia de Transporte.',
         { align: 'center' },
       );
  
    doc.moveDown(1);
  
    // ================= VEHÍCULO =================
    doc.font('Helvetica-Bold').fontSize(9).text('DATOS DEL VEHÍCULO');
    doc.moveDown(0.3);
  
    doc.font('Helvetica').fontSize(8);
    doc.text(`Placa: ${e.placa}`);
    doc.text(`Fecha creación: ${moment(e.createdAt).utcOffset(-300).format('YYYY/MM/DD HH:mm')}`);

    // Estado de sincronización con SICOV (plan de contingencia)
    const syncStatus = (e as any).sicov_sync_status ?? 'synced';
    const fechaSync = (e as any).fechaSyncSicov;
    if (syncStatus === 'synced' && fechaSync) {
      //doc.text(`Enviado a Supertransporte: ${moment(fechaSync).utcOffset(-300).format('YYYY/MM/DD HH:mm')}`);
    }

    doc.moveDown(1);

    // ================= CONDUCTOR =================
    doc.font('Helvetica-Bold').text('CONDUCTOR');
    doc.moveDown(0.3);
  
    doc.font('Helvetica').fontSize(8);
    doc.text(`Documento: ${e.numeroIdentificacionConductor || '—'}`);
    doc.text(`Nombre: ${e.nombresConductor || '—'}`);
  
    doc.moveDown(1);
  
    // ================= RESPONSABLE =================
    doc.font('Helvetica-Bold').text('RESPONSABLE');
    doc.moveDown(0.3);
  
    doc.font('Helvetica').fontSize(8);
    doc.text(`Documento: ${e.numeroIdentificacion}`);
    doc.text(`Nombre: ${e.nombresResponsable}`);
  
    doc.moveDown(1);
  
    // ================= CHECKLIST =================
    doc.font('Helvetica-Bold')
       .fontSize(9)
       .text('LISTA DE VERIFICACIÓN');
    doc.moveDown(0.5);
  
    const actividadesIds: number[] = Array.isArray(e.actividades)
      ? e.actividades.map((id: any) => Number(id)).filter(Boolean)
      : [];
  
    const todasLasActividades = Object.entries(ACTIVIDADES_MAP).map(
      ([id, nombre]) => ({
        id: Number(id),
        nombre,
      }),
    );
  
    const margenIzq = 12;
    const anchoTexto = 160;
    const sizeBox = 8;
  
    doc.font('Helvetica').fontSize(8);
  
    todasLasActividades.forEach((actividad) => {
  
      const chequeado = actividadesIds.includes(actividad.id);
  
      let nombre = actividad.nombre.trim();
      if (nombre.length > 40) {
        nombre = nombre.substring(0, 37) + '...';
      }
  
      const y = doc.y;
  
      // Dibujar casilla
      doc.rect(margenIzq, y, sizeBox, sizeBox).stroke();
  
      // Si está chequeado, dibujar marca sólida tipo checklist real
      if (chequeado) {
        doc.moveTo(margenIzq + 2, y + sizeBox / 2)
           .lineTo(margenIzq + sizeBox / 2, y + sizeBox - 2)
           .lineTo(margenIzq + sizeBox - 2, y + 2)
           .stroke();
      }
  
      // Texto actividad
      doc.text(nombre, margenIzq + 14, y, {
        width: anchoTexto,
        lineBreak: false,
      });
  
      doc.moveDown(0.8);
    });
  
    doc.moveDown(1);

    // ================= DETALLE ACTIVIDADES =================
    if (e.detalleActividades && String(e.detalleActividades).trim()) {
      doc.font('Helvetica-Bold').fontSize(9).text('NOTAS DEL ESTADO DEL VEHÍCULO');
      doc.moveDown(0.3);
      doc.font('Helvetica').fontSize(8).text(String(e.detalleActividades).trim(), {
        width: 202,
        lineBreak: true,
      });
      doc.moveDown(1);
    }

    // ================= FIRMAS =================
    const firmaWidth = 170;
    const firmaHeight = 60;
    const margenFirma = 12;

    async function embedFirma(doc: any, fotoField: string | null | undefined, label: string) {
      if (!fotoField) {
        // Espacio en blanco para firma manual
        doc.font('Helvetica-Bold').fontSize(8).text(label);
        doc.moveDown(0.3);
        doc.rect(margenFirma, doc.y, firmaWidth, firmaHeight).stroke();
        doc.moveDown(firmaHeight / doc.currentLineHeight() + 0.5);
        return;
      }

      doc.font('Helvetica-Bold').fontSize(8).text(label);
      doc.moveDown(0.3);

      try {
        let imgBuffer: Buffer;

        if (fotoField.startsWith('data:')) {
          // Base64 data URL
          const base64 = fotoField.split(',')[1];
          imgBuffer = Buffer.from(base64, 'base64');
        } else {
          // Descargar desde MinIO vía S3 SDK interno (evita ETIMEDOUT por IP pública)
          console.log(`[PDF] Descargando firma desde MinIO SDK: ${fotoField}`);
          const bucket  = process.env.MINIO_BUCKET  || 'protegeme-files';
          const endpoint = process.env.MINIO_ENDPOINT || 'http://127.0.0.1:9000';
          const s3 = new S3Client({
            region: process.env.MINIO_REGION || 'us-east-1',
            endpoint,
            forcePathStyle: true,
            credentials: {
              accessKeyId:     process.env.MINIO_ACCESS_KEY || '',
              secretAccessKey: process.env.MINIO_SECRET_KEY || '',
            },
          });
          // Extraer key quitando la URL base del bucket
          const marker = `/${bucket}/`;
          const idx = fotoField.indexOf(marker);
          if (idx === -1) throw new Error(`URL de firma no contiene bucket "${bucket}"`);
          const key = fotoField.substring(idx + marker.length);
          const res2 = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
          imgBuffer = await new Promise<Buffer>((resolve, reject) => {
            const chunks: Buffer[] = [];
            (res2.Body as Readable).on('data', (c: Buffer) => chunks.push(c));
            (res2.Body as Readable).on('end', () => resolve(Buffer.concat(chunks)));
            (res2.Body as Readable).on('error', reject);
          });
        }

        doc.image(imgBuffer, margenFirma, doc.y, { width: firmaWidth, height: firmaHeight, fit: [firmaWidth, firmaHeight] });
        doc.y += firmaHeight + 4;
      } catch (err: any) {
        console.warn(`[PDF] No se pudo cargar firma "${label}": ${err?.message ?? err}`);
        doc.rect(margenFirma, doc.y, firmaWidth, firmaHeight).stroke();
        doc.moveDown(firmaHeight / doc.currentLineHeight() + 0.5);
      }
    }

    await embedFirma(doc, (e as any).firma_conductor_foto, 'FIRMA CONDUCTOR');
    doc.moveDown(0.5);
    await embedFirma(doc, (e as any).firma_inspector_foto, 'FIRMA RESPONSABLE');

    // ── Footer: posicionado directamente, sin moveDown que pueda desbordar ──
    const footerY = Math.min(doc.y + 8, pageHeight - 20);
    doc.fontSize(7)
       .text('Documento generado automáticamente', 12, footerY, {
         width: 202,
         align: 'center',
       });

    doc.end();
    this.logger.log(`[PDF] Generado correctamente: placa=${e.placa}`);

    } catch (err: any) {
      this.logger.error(`[PDF] Error generando PDF id=${id}: ${err?.message ?? err}`);
      this.logger.error(err?.stack ?? '');
      if (!res.headersSent) {
        res.status(500).json({ message: 'Error generando PDF', detail: err?.message });
      }
    }
  }
  
  

  // ======================================================
  // UPDATE
  // ======================================================
  async update(id: string, dto: any, user: any) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('ID inválido');
    }

    const item = await this.model.findOne({
      _id: id,
      enterprise_id: user.enterprise_id,
    });

    if (!item) throw new NotFoundException('No encontrado');

    Object.assign(item, dto);
    await item.save();
    return item;
  }

  async getFullReportByEnlistmentId(
    id: string,
    user?: { enterprise_id?: string },
  ) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('ID inválido');
    }
  
    const enlistment = await this.model
      .findOne({
        _id: new Types.ObjectId(id),
        enterprise_id: user?.enterprise_id,
      })
      .lean();
  
    if (!enlistment) {
      throw new NotFoundException('Alistamiento no encontrado');
    }
  
    const mantenimientoId = enlistment.mantenimientoId;
  
    if (!mantenimientoId) {
      throw new NotFoundException(
        'El alistamiento no tiene mantenimiento asociado',
      );
    }
  
    const [dailySnapshot, itemResults] = await Promise.all([
      this.snapshotModel.findOne({ mantenimientoId }).lean(),
  
      this.itemResultModel
        .find({ mantenimientoId })
        .populate({
          path: 'itemId',
          select: 'tipo_parte dispositivo',
        })
        .lean(),
    ]);
  
    return {
      enlistment: {
        _id: enlistment._id,
        placa: enlistment.placa,
        mantenimientoId: enlistment.mantenimientoId,
        tipoIdentificacion: enlistment.tipoIdentificacion,
        numeroIdentificacion: enlistment.numeroIdentificacion,
        nombresResponsable: enlistment.nombresResponsable,
        tipoIdentificacionConductor: enlistment.tipoIdentificacionConductor,
        numeroIdentificacionConductor: enlistment.numeroIdentificacionConductor,
        nombresConductor: enlistment.nombresConductor,
        detalleActividades: enlistment.detalleActividades,
        actividades: enlistment.actividades ?? [],
        firma_conductor_foto: (enlistment as any).firma_conductor_foto ?? null,
        firma_inspector_foto: (enlistment as any).firma_inspector_foto ?? null,
        estado: enlistment.estado,
        createdAt: (enlistment as any).createdAt ?? null,
      },
      dailySnapshot: dailySnapshot ?? null,
      items: itemResults ?? [],
    };
  }

}
