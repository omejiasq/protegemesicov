import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CorrectiveDetail, CorrectiveDetailDocument } from '../schema/corrective.schema';
import { MaintenanceExternalApiService } from '../libs/external-api';

@Injectable()
export class CorrectiveService {
  constructor(
    @InjectModel(CorrectiveDetail.name)
    private readonly model: Model<CorrectiveDetailDocument>,
    private readonly external: MaintenanceExternalApiService,
  ) {}

  async create(dto: any, user?: { enterprise_id?: string; sub?: string }) {
    // validar que no exista ya un correctivo para el mismo mantenimiento
    const exists = await this.model.exists({ mantenimientoId: dto.mantenimientoId, enterprise_id: user?.enterprise_id });
    if (exists) throw new ConflictException('El mantenimiento ya tiene un correctivo registrado');

    // persiste el documento local con TODOS los campos requeridos
    const doc = await this.model.create({
      mantenimientoId: dto.mantenimientoId,
      placa: dto.placa,
      fecha: dto.fecha,
      hora: dto.hora,
      nit: dto.nit,
      razonSocial: dto.razonSocial,
      descripcionFalla: dto.descripcionFalla,
      accionesRealizadas: dto.accionesRealizadas,
      enterprise_id: user?.enterprise_id,
      createdBy: user?.sub,
      estado: true,
    });

    // sincroniza con SICOV en modo defensivo
    try {
      // Obtiene o confirma el ID de mantenimiento base
      const base = await this.external.guardarMantenimiento({
        placa: dto.placa,
        tipoId: 2,
        vigiladoId: process.env.SICOV_VIGILADO_ID,
      });
      const mantenimientoId = base.ok && base.data?.id ? base.data.id : dto.mantenimientoId;

      // Envía el correctivo completo
      const res = await this.external.guardarCorrectivo({
        fecha: dto.fecha,
        hora: dto.hora,
        nit: dto.nit,
        razonSocial: dto.razonSocial,
        tipoIdentificacion: dto.tipoIdentificacion,
        numeroIdentificacion: dto.numeroIdentificacion,
        nombresResponsable: dto.nombresResponsable,
        mantenimientoId,
        detalleActividades: dto.detalleActividades, // opcional, si tu esquema externo lo exige
        descripcionFalla: dto.descripcionFalla,
        accionesRealizadas: dto.accionesRealizadas,
        vigiladoId: process.env.SICOV_VIGILADO_ID,
      });

      const externalId = res.ok && res.data?.id;
      if (externalId) {
        await this.model.updateOne({ _id: doc._id }, { $set: { externalId: String(externalId) } });
      }
    } catch {
      // no afectar el flujo local si la integración falla
    }

    return (await this.model.findById(doc._id).lean())!;
  }

  async view(dto: { id: string }, user?: { enterprise_id?: string }) {
    if (!Types.ObjectId.isValid(dto.id)) throw new NotFoundException('No encontrado');
    const item = await this.model.findOne({ _id: new Types.ObjectId(dto.id), enterprise_id: user?.enterprise_id }).lean();
    if (!item) throw new NotFoundException('No encontrado');

    // consulta opcional al sistema externo
    if (item.mantenimientoId) {
      try {
        const res = await this.external.visualizarCorrectivo(item.mantenimientoId, process.env.SICOV_VIGILADO_ID);
        if (res.ok) (item as any).externalData = res.data;
      } catch {
        /* ignorar fallos externos */
      }
    }
    return item;
  }
}
