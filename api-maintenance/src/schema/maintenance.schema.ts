import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type MaintenanceDocument = HydratedDocument<Maintenance>;

@Schema({ collection: 'maintenances', timestamps: true })
export class Maintenance {
  @Prop({ required: true, enum: [1, 2, 3, 4], index: true })
  tipoId!: 1 | 2 | 3 | 4;

  @Prop({ required: true, trim: true, index: true })
  placa!: string;

  @Prop({ required: true, index: true })
  vigiladoId!: number;

  @Prop({ type: Boolean, default: true, index: true })
  estado!: boolean;

  @Prop({ index: true }) enterprise_id?: string;
  @Prop() createdBy?: string;
}

export const MaintenanceSchema = SchemaFactory.createForClass(Maintenance);
MaintenanceSchema.index({ enterprise_id: 1, tipoId: 1, createdAt: -1 });