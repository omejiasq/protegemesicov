// src/preventive/preventive.service.ts
import {
  Injectable,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import {
  PreventiveDetail,
  PreventiveDetailDocument,
} from '../schema/preventive.schema';
import { CreatePreventiveDto } from './dto/create-preventive-dto';
import { ViewPreventiveDto } from './dto/view-preventive-dto';

// ⚠️ Ajustá la ruta si tu helper quedó en otro lado
import { ExternalApiService } from '../libs/external-api';

type UserCtx = { enterprise_id?: string; sub?: string };

@Injectable()
export class PreventiveService {
  private readonly logger = new Logger(PreventiveService.name);

  constructor(
    @InjectModel(PreventiveDetail.name)
    private readonly model: Model<PreventiveDetailDocument>,
    private readonly externalApi?: ExternalApiService, // opcional
  ) {}

  private tenant(user?: UserCtx): FilterQuery<PreventiveDetailDocument> {
    return { enterprise_id: user?.enterprise_id };
  }

  /** Crea preventivo (1 por mantenimiento) y dispara integración externa en background */
  async create(dto: CreatePreventiveDto, user?: UserCtx) {
    // 1) Evitar duplicados por mantenimientoId+tenant
    const dup = await this.model.exists({
      mantenimientoId: dto.mantenimientoId,
      ...this.tenant(user),
    });
    if (dup) {
      throw new ConflictException(
        'El mantenimiento ya tiene un preventivo registrado',
      );
    }

    // 2) Guardar en Mongo
    const doc = await this.model.create({
      ...dto,
      enterprise_id: user?.enterprise_id,
      createdBy: user?.sub,
      estado: true,
    });

    // 3) Integración externa (no bloquea el éxito local)
    //    - Crea mantenimiento base (tipo 1 = preventivo) si tu helper lo requiere
    //    - Registra el detalle preventivo con el id externo
    //    - Persiste externalId en Mongo si lo obtenemos
    if (this.externalApi) {
      (async () => {
        try {
          // si tu helper necesita crear el mantenimiento base en SICOV:
          const base = await this.externalApi!.crearMantenimientoBase(
            doc.placa,
            1, // tipo 1: preventivo
          );
          const externalId = base?.data?.id ?? (base as any)?.id;

          await this.externalApi!.guardarPreventivo({
            mantenimientoId: externalId ?? dto.mantenimientoId, // usa externo si lo tenemos
            placa: doc.placa,
            fecha: dto.fecha,
            hora: dto.hora,
            nit: dto.nit,
            razonSocial: dto.razonSocial,
            tipoIdentificacion: dto.tipoIdentificacion,
            numeroIdentificacion: dto.numeroIdentificacion,
            nombresResponsable: dto.nombresResponsable,
            detalleActividades: dto.detalleActividades,
          });

          if (externalId) {
            await this.model.updateOne(
              { _id: doc._id },
              { $set: { externalId } },
            );
          }
        } catch (err) {
          this.logger.warn(
            `Integración externa (preventivo) falló: ${
              (err as any)?.message || err
            }`,
          );
        }
      })();
    }

    return doc.toJSON();
  }

  /** Devuelve el preventivo por mantenimientoId (fallback por placa si no llega id) */
  async view(body: ViewPreventiveDto, user?: UserCtx) {
    const byId = body.mantenimientoId && String(body.mantenimientoId).trim();
    const filter: FilterQuery<PreventiveDetailDocument> = this.tenant(user);

    if (byId) {
      Object.assign(filter, { mantenimientoId: byId });
    }

    const item = await this.model.findOne(filter).lean();
    if (!item) throw new NotFoundException('Preventivo no encontrado');
    return item;
  }
}
