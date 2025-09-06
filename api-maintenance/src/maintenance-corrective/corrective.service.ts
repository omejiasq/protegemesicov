import { Injectable, ConflictException, NotFoundException, Logger, Optional } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { CorrectiveDetail, CorrectiveDetailDocument } from '../schema/corrective.schema';
import { CreateCorrectiveDto } from './dto/create-corrective-dto';
import { ViewCorrectiveDto } from './dto/view-corrective-dto';
// ⬇️ ajustá la ruta si tu helper está en otro lado
import { ExternalApiService } from '../libs/external-api';

type UserCtx = { enterprise_id?: string; sub?: string };

@Injectable()
export class CorrectiveService {
  private readonly logger = new Logger(CorrectiveService.name);

  constructor(
    @InjectModel(CorrectiveDetail.name)
    private readonly model: Model<CorrectiveDetailDocument>,
    @Optional() private readonly externalApi?: ExternalApiService,
  ) {}

  private tenant(user?: UserCtx): FilterQuery<CorrectiveDetailDocument> {
    return { enterprise_id: user?.enterprise_id };
  }

  async create(dto: CreateCorrectiveDto, user?: UserCtx) {
    const exists = await this.model.exists({ mantenimientoId: dto.mantenimientoId, ...this.tenant(user) });
    if (exists) throw new ConflictException('El mantenimiento ya tiene un correctivo registrado');

    const doc = await this.model.create({
      ...dto,
      enterprise_id: user?.enterprise_id,
      createdBy: user?.sub,
      estado: true,
    });

    // Integración externa (no bloquea el éxito local)
    if (this.externalApi) {
      (async () => {
        try {
          const base = await this.externalApi!.crearMantenimientoBase(doc.placa, 2); // tipo 2: correctivo
          const externalId = base?.data?.id ?? (base as any)?.id;

          await this.externalApi!.guardarCorrectivo({
            mantenimientoId: externalId ?? dto.mantenimientoId,
            placa: doc.placa,
            fecha: (dto as any).fecha,
            hora: (dto as any).hora,
            nit: (dto as any).nit,
            razonSocial: (dto as any).razonSocial,
            descripcionFalla: (dto as any).descripcionFalla,
            accionesRealizadas: (dto as any).accionesRealizadas,
          });

          if (externalId) {
            await this.model.updateOne({ _id: doc._id }, { $set: { externalId } });
          }
        } catch (err) {
          this.logger.warn(
            `Integración externa (correctivo) falló: ${(err as any)?.message || err}`,
          );
        }
      })();
    }

    return doc.toJSON();
  }

  async view(body: ViewCorrectiveDto, user?: UserCtx) {
    const item = await this.model.findOne({ mantenimientoId: body.mantenimientoId, ...this.tenant(user) }).lean();
    if (!item) throw new NotFoundException('Correctivo no encontrado');
    return item;
  }
}
