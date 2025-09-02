import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { CorrectiveDetail, CorrectiveDetailDocument } from '../schema/corrective.schema';
import { CreateCorrectiveDto } from './dto/create-corrective-dto';
import { ViewCorrectiveDto } from './dto/view-corrective-dto';

type UserCtx = { enterprise_id?: string; sub?: string };

@Injectable()
export class CorrectiveService {
  constructor(
    @InjectModel(CorrectiveDetail.name)
    private readonly model: Model<CorrectiveDetailDocument>,
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
    return doc.toJSON();
  }

  async view(body: ViewCorrectiveDto, user?: UserCtx) {
    const item = await this.model.findOne({ mantenimientoId: body.mantenimientoId, ...this.tenant(user) }).lean();
    if (!item) throw new NotFoundException('Correctivo no encontrado');
    return item;
  }
}