import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { ProgramFile, ProgramFileDocument } from '../schema/program-file.schema';

type UserCtx = { enterprise_id?: string; sub?: string };

@Injectable()
export class ProgramsService {
  constructor(@InjectModel(ProgramFile.name) private readonly model: Model<ProgramFileDocument>) {}

  async save(body: { tipoId: 1|2|3; documento: string; nombreOriginal: string; ruta: string; vigiladoId: number }, user?: UserCtx) {
    const doc = await this.model.create({ ...body, enterprise_id: user?.enterprise_id, createdBy: user?.sub });
    return doc.toJSON();
  }

  async list(q: { tipoId?: 1|2|3; vigiladoId?: number }, user?: UserCtx) {
    const filter: FilterQuery<ProgramFileDocument> = { enterprise_id: user?.enterprise_id };
    if (q.tipoId) filter.tipoId = q.tipoId;
    if (typeof q.vigiladoId === 'number') filter.vigiladoId = q.vigiladoId;
    const items = await this.model.find(filter).sort({ createdAt: -1 }).lean({ getters: true });
    return { items };
  }
}