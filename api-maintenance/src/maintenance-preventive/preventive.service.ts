import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import {
  PreventiveDetail,
  PreventiveDetailDocument,
} from '../schema/preventive.schema';
import { CreatePreventiveDto } from './dto/create-preventive-dto';
import { ViewPreventiveDto } from './dto/view-preventive-dto';

type UserCtx = { enterprise_id?: string; sub?: string };

@Injectable()
export class PreventiveService {
  constructor(
    @InjectModel(PreventiveDetail.name)
    private readonly model: Model<PreventiveDetailDocument>,
  ) {}

  private tenant(user?: UserCtx): FilterQuery<PreventiveDetailDocument> {
    return { enterprise_id: user?.enterprise_id };
  }

  async create(dto: CreatePreventiveDto, user?: UserCtx) {
    // Evitar duplicados por mantenimientoId+tenant (1:1)
    const exists = await this.model.exists({
      mantenimientoId: dto.mantenimientoId,
      ...this.tenant(user),
    });
    if (exists)
      throw new ConflictException(
        'El mantenimiento ya tiene un preventivo registrado',
      );

    const doc = await this.model.create({
      ...dto,
      enterprise_id: user?.enterprise_id,
      createdBy: user?.sub,
      estado: true,
    });
    return doc.toJSON();
  }

  async view(body: ViewPreventiveDto, user?: UserCtx) {
    const mantenimientoId = String(body.mantenimientoId).trim();
    const item = await this.model
      .findOne({ mantenimientoId, ...this.tenant(user) })
      .lean();

    if (!item) throw new NotFoundException('Preventivo no encontrado');
    return item;
  }
}
