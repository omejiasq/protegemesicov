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

    private readonly external: MaintenanceExternalApiService,
    private readonly maintenanceService: MaintenanceService,
  ) {}

  // ======================================================
  // CREATE
  // ======================================================
  async create(dto: any, user: any) {
    const placa = String(dto.placa || '').trim().toUpperCase();

    if (!placa) {
      throw new BadRequestException('Placa requerida');
    }

    // 1️⃣ PREVENIR DUPLICADO POR PLACA / DÍA
    const existsToday = await this.model.findOne({
      placa,
      enterprise_id: user.enterprise_id,
      createdAt: {
        $gte: moment().startOf('day').toDate(),
        $lte: moment().endOf('day').toDate(),
      },
    });

    if (existsToday) {
      throw new ConflictException(
        `Ya existe un alistamiento para la placa ${placa} el día de hoy`,
      );
    }

    // 2️⃣ CREAR MANTENIMIENTO (LOCAL + SICOV)
    const { doc, externalId } =
      await this.maintenanceService.create(
        {
          placa,
          tipoId: 3, // ALISTAMIENTO
          vigiladoId: user.vigiladoId,
        },
        user,
        { awaitExternal: true },
      );

    if (!doc?._id || !externalId || isNaN(Number(externalId))) {
      throw new ConflictException(
        'No fue posible crear el mantenimiento en SICOV',
      );
    }

    // 3️⃣ PAYLOAD SICOV (SIN FECHA / HORA)
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

      actividades: Array.isArray(dto.actividades)
        ? dto.actividades.map((x: any) => Number(x))
        : [],

      vigiladoId: user.vigiladoId,
      vigiladoToken: user.vigiladoToken,
    };

    this.logger.log(`SICOV payload → ${JSON.stringify(sicovPayload)}`);

    // 4️⃣ ENVÍO A SICOV
    try {
      await Promise.race([
        this.external.guardarAlistamiento(sicovPayload),
        new Promise((_, reject) =>
          setTimeout(
            () =>
              reject(
                new Error('Timeout al enviar alistamiento a SICOV'),
              ),
            15000,
          ),
        ),
      ]);
    } catch (error) {
      this.logger.error(
        'ERROR SICOV',
        error?.response?.data || error?.message || error,
      );

      throw new ConflictException(
        error?.response?.data?.message ||
          'Error al registrar el alistamiento en SICOV',
      );
    }

    // 5️⃣ DESACTIVAR ALISTAMIENTOS ANTERIORES
    await this.model.updateMany(
      {
        placa,
        enterprise_id: user.enterprise_id,
        estado: true,
      },
      { $set: { estado: false } },
    );

    // 6️⃣ GUARDAR LOCAL
    const actividadesFinales =
      dto.fromMobile === true
        ? [6, 3, 8, 11, 10, 7, 1, 9, 5, 4, 2]
        : Array.isArray(dto.actividades)
        ? dto.actividades.map(Number)
        : [];

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

      estado: true,
    });

    // 7️⃣ SNAPSHOT
    if (dto.dailySnapshot) {
      await this.snapshotModel.create({
        mantenimientoId: String(doc._id),
        ...dto.dailySnapshot,
      });
    }

    // 8️⃣ ITEMS
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

    return this.model.find(match).sort({ createdAt: -1 }).lean();
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
    if (!Types.ObjectId.isValid(id)) {
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
                { $toObjectId: '$enterprise_id' },
              ],
            },
          },
          pipeline: [
            { $match: { $expr: { $eq: ['$_id', '$$enterpriseId'] } } },
          ],
          as: 'enterprise',
        },
      },
      { $unwind: '$enterprise' },
    ]);
  
    if (!data.length) {
      throw new NotFoundException('Alistamiento no encontrado');
    }
  
    const e = data[0];
  
    const doc = new PDFDocument({
      size: [226, 620],
      margins: { top: 12, left: 12, right: 12, bottom: 12 },
    });
  
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename=alistamiento-${e.placa}.pdf`,
    );
  
    doc.pipe(res);
  
    // ================= ENCABEZADO =================
    doc
      .font('Helvetica-Bold')
      .fontSize(11)
      .text(e.enterprise.name, { align: 'center' });
  
    doc.moveDown(0.3);
  
    doc
      .fontSize(9)
      .text(
        'Certificado de alistamiento avalado por la\nSuperintendencia de Transporte',
        { align: 'center' },
      );
  
    doc.moveDown(1);
  
    // ================= VEHÍCULO =================
    doc.font('Helvetica-Bold').fontSize(9).text('DATOS DEL VEHÍCULO');
    doc.moveDown(0.3);
  
    doc.font('Helvetica').text(`Placa: ${e.placa}`);
    doc.text(`Fecha: ${moment(e.createdAt).format('YYYY/MM/DD')}`);
  
    doc.moveDown(1);
  
    // ================= CONDUCTOR =================
    doc.font('Helvetica-Bold').text('CONDUCTOR');
    doc.moveDown(0.3);
  
    doc.font('Helvetica').text(
      `Documento: ${e.numeroIdentificacionConductor || '—'}`,
    );
    doc.text(`Nombre: ${e.nombresConductor || '—'}`);
  
    doc.moveDown(1);
  
    // ================= RESPONSABLE =================
    doc.font('Helvetica-Bold').text('RESPONSABLE');
    doc.moveDown(0.3);
  
    doc.font('Helvetica').text(`Documento: ${e.numeroIdentificacion}`);
    doc.text(`Nombre: ${e.nombresResponsable}`);
  
  
    // ================= ACTIVIDADES =================
    const actividadesIds: number[] = Array.isArray(e.actividades)
      ? e.actividades.map((id: any) => Number(id)).filter(Boolean)
      : [];

    // Todas las actividades del catálogo
    const todasLasActividades = Object.entries(ACTIVIDADES_MAP).map(
      ([id, nombre]) => ({
        id: Number(id),
        nombre,
      }),
    );

    // Actividades chequeadas
    const actividadesChequeadas = todasLasActividades.filter((a) =>
      actividadesIds.includes(a.id),
    );

    // Actividades no chequeadas
    const actividadesNoChequeadas = todasLasActividades.filter(
      (a) => !actividadesIds.includes(a.id),
    );

    // ===== ACTIVIDADES CHEQUEADAS =====
    doc.moveDown(1);
    doc.font('Helvetica-Bold').fontSize(9).text('ACTIVIDADES CHEQUEADAS');
    doc.moveDown(0.3);

    if (!actividadesChequeadas.length) {
      doc.font('Helvetica').fontSize(8).text('— Sin actividades registradas —');
    } else {
      doc.font('Helvetica').fontSize(8);
      actividadesChequeadas.forEach((actividad, index) => {
        doc.text(`${index + 1}. ${actividad.nombre}`);
      });
    }

    // ===== ACTIVIDADES NO CHEQUEADAS =====
    doc.moveDown(0.8);
    doc.font('Helvetica-Bold').fontSize(9).text('ACTIVIDADES NO CHEQUEADAS');
    doc.moveDown(0.3);

    if (!actividadesNoChequeadas.length) {
      doc.font('Helvetica').fontSize(8).text('— Todas las actividades fueron chequeadas —');
    } else {
      doc.font('Helvetica').fontSize(8);
      actividadesNoChequeadas.forEach((actividad, index) => {
        doc.text(`${index + 1}. ${actividad.nombre}`);
      });
    }

    doc.moveDown(1);


    // ================= TEXTO LEGAL =================
    doc
      .fontSize(8)
      .text(
        'Este documento certifica que el vehículo fue\ninspeccionado y se encuentra apto para la operación\nsegún los lineamientos vigentes.',
        {
          align: 'center',
        },
      );
  
    doc.moveDown(1);
  
    doc
      .fontSize(7)
      .text('Documento generado automáticamente', {
        align: 'center',
      });
  
    doc.end();
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
}
