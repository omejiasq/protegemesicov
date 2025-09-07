import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { MaintenanceExternalApiService } from '../libs/external-api';
import { EnlistmentDetail, EnlistmentDetailDocument } from '../schema/enlistment-schema';

@Injectable()
export class AlistamientoService {
  constructor(
    @InjectModel(EnlistmentDetail.name)
    private readonly model: Model<EnlistmentDetailDocument>,
    private readonly external: MaintenanceExternalApiService,
  ) {}

  /** Crea un nuevo alistamiento local y lo sincroniza con SICOV */
  async create(dto: any, user?: { enterprise_id?: string; sub?: string }) {
    // evitar duplicados por placa dentro del mismo tenant
    const exists = await this.model.exists({
      placa: dto.placa,
      enterprise_id: user?.enterprise_id,
    });
    if (exists) throw new ConflictException('Ya existe un alistamiento para esa placa');

    // persistimos localmente
    const doc = await this.model.create({
      enterprise_id: user?.enterprise_id,
      createdBy: user?.sub,
      placa: dto.placa,
      tipoIdentificacionResponsable: dto.tipoIdentificacionResponsable,
      numeroIdentificacionResponsable: dto.numeroIdentificacionResponsable,
      nombreResponsable: dto.nombreResponsable,
      tipoIdentificacionConductor: dto.tipoIdentificacionConductor,
      numeroIdentificacionConductor: dto.numeroIdentificacionConductor,
      nombresConductor: dto.nombresConductor,
      detalleActividades: dto.detalleActividades,
      actividades: dto.actividades, // array { codigo: string; valor: boolean }
      estado: true,
    });

    // sincronización con SICOV: obtenemos primero el mantenimiento base
    try {
      const baseRes = await this.external.guardarMantenimiento({
        placa: dto.placa,
        tipoId: 3, // 3 para alistamiento
        vigiladoId: process.env.SICOV_VIGILADO_ID,
      });
      const mantenimientoId = baseRes.ok && baseRes.data?.id;
      if (mantenimientoId) {
        const detRes = await this.external.guardarAlistamiento({
          tipoIdentificacionResponsable: dto.tipoIdentificacionResponsable,
          numeroIdentificacionResponsable: dto.numeroIdentificacionResponsable,
          nombreResponsable: dto.nombreResponsable,
          tipoIdentificacionConductor: dto.tipoIdentificacionConductor,
          numeroIdentificacionConductor: dto.numeroIdentificacionConductor,
          nombresConductor: dto.nombresConductor,
          mantenimientoId,
          detalleActividades: dto.detalleActividades,
          actividades: dto.actividades,
          vigiladoId: process.env.SICOV_VIGILADO_ID,
        });
        const externalId = detRes.ok && detRes.data?.id;
        if (externalId) {
          await this.model.updateOne(
            { _id: doc._id },
            { $set: { mantenimientoId, externalId: String(externalId) } },
          );
        }
      }
    } catch {
      // modo defensivo: la sincronización falla sin abortar la creación local
    }

    return (await this.model.findById(doc._id).lean())!;
  }

  /** Devuelve un alistamiento local y, si existe, lo complementa con la respuesta de SICOV */
  async view(dto: { id: string }, user?: { enterprise_id?: string }) {
    if (!Types.ObjectId.isValid(dto.id)) throw new NotFoundException('No encontrado');
    const item = await this.model
      .findOne({ _id: new Types.ObjectId(dto.id), enterprise_id: user?.enterprise_id })
      .lean();
    if (!item) throw new NotFoundException('No encontrado');

    let externalData: any = null;
    if (item.mantenimientoId) {
      try {
        const res = await this.external.visualizarAlistamiento(
          item.mantenimientoId,
          process.env.SICOV_VIGILADO_ID,
        );
        if (res.ok) externalData = res.data;
      } catch {
        /* ignorar fallos externos */
      }
    }

    // devolvemos el registro local junto con la data externa (sin modificar el esquema)
    return { ...item, externalData };
  }

  async listActivities(user?: { enterprise_id?: string }) {
  // Puedes ignorar user si no lo necesitas aquí
  return this.external.listarActividades(process.env.SICOV_VIGILADO_ID);
}
}
