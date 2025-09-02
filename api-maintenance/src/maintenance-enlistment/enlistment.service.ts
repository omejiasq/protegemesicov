import { ConflictException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { EnlistmentDetail, EnlistmentDetailDocument } from '../schema/enlistment-schema';
import { Maintenance, MaintenanceDocument } from '../schema/maintenance.schema';
import { CreateEnlistmentDto } from './dto/create-enlistment-dto';
import { ViewEnlistmentDto } from './dto/view-enlistment-dto';

type UserCtx = { enterprise_id?: string; sub?: string };

@Injectable()
export class EnlistmentService {
  constructor(
    @InjectModel(EnlistmentDetail.name) private readonly model: Model<EnlistmentDetailDocument>,
    @InjectModel(Maintenance.name) private readonly maintModel: Model<MaintenanceDocument>,
  ) {}

  private tenant(user?: UserCtx): FilterQuery<EnlistmentDetailDocument> {
    return { enterprise_id: user?.enterprise_id };
  }

  async create(dto: CreateEnlistmentDto, user?: UserCtx) {

    if (!Types.ObjectId.isValid(dto.mantenimientoId)) {
      throw new UnprocessableEntityException('mantenimientoId inválido');
    }

    const maint = await this.maintModel.findOne({
      _id: new Types.ObjectId(dto.mantenimientoId),
      tipoId: 3,
      enterprise_id: user?.enterprise_id,
    }).lean();
    if (!maint) {
      throw new UnprocessableEntityException('Maintenance (tipoId=3) no encontrado para este tenant');
    }

    const dup = await this.model.exists({ mantenimientoId: dto.mantenimientoId, ...this.tenant(user) });
    if (dup) throw new ConflictException('Ya existe un alistamiento para este mantenimiento');

    const doc = await this.model.create({
      ...dto,
      enterprise_id: user?.enterprise_id,
      createdBy: user?.sub,
      estado: true,
    });
    return doc.toJSON();
  }

  async view(dto: ViewEnlistmentDto, user?: UserCtx) {
    const item = await this.model.findOne({ mantenimientoId: dto.mantenimientoId, ...this.tenant(user) }).lean();
    if (!item) throw new NotFoundException('Alistamiento no encontrado');
    return item;
  }

  listActivities() {
    return {
      items: [
        { id: 1, nombre: 'Verificación de luces', estado: true },
        { id: 2, nombre: 'Inspección de frenos', estado: true },
        { id: 3, nombre: 'Revisión de niveles (aceite, refrigerante)', estado: true },
        { id: 4, nombre: 'Estado de llantas y presión', estado: true },
        { id: 5, nombre: 'Elementos de seguridad (botiquín, extintor)', estado: true },
        { id: 6, nombre: 'Documentación al día (SOAT, RTM, TO)', estado: true },
      ],
    };
  }
}