// enlistment_daily_snapshot.schema.ts

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type EnlistmentDailySnapshotDocument =
  HydratedDocument<EnlistmentDailySnapshot>;

@Schema({ collection: 'enlistment_daily_snapshots', timestamps: true })
export class EnlistmentDailySnapshot {
  @Prop({ required: true, index: true })
  mantenimientoId!: string;

  // =======================
  // CAMPOS DEL EXCEL
  // =======================
  @Prop({ required: true }) fecha!: string;
  @Prop({ required: true, trim: true }) ciudad!: string;
  @Prop({ required: true, trim: true }) numeroInterno!: string;
  @Prop({ required: true, trim: true }) modalidad!: string;
  @Prop({ required: true }) hora!: string;

  // =======================
  // OPERADOR 1
  // =======================
  @Prop({ required: true, trim: true }) nombreOperador1!: string;
  @Prop({ required: true, trim: true }) identificacionOperador1!: string;
  @Prop({ required: true, enum: ['B', 'R', 'M'] })
  presentacionOperador1!: 'B' | 'R' | 'M';

  // =======================
  // OPERADOR 2
  // =======================
  @Prop({ trim: true }) nombreOperador2?: string;
  @Prop({ trim: true }) identificacionOperador2?: string;
  @Prop({ enum: ['B', 'R', 'M'] })
  presentacionOperador2?: 'B' | 'R' | 'M';

  // =======================
  // CAMPOS GENERALES
  // =======================
  @Prop({ required: true, enum: ['SI', 'NO'] })
  documentos!: 'SI' | 'NO';

  @Prop({ trim: true }) rutas?: string;
  @Prop({ trim: true }) varias?: string;

  // =======================
  // FIRMAS (PATH IMAGEN)
  // =======================
  @Prop({ required: true })
  firmaConductorUrl!: string;

  @Prop({ required: true })
  firmaInspectorUrl!: string;
}

export const EnlistmentDailySnapshotSchema =
  SchemaFactory.createForClass(EnlistmentDailySnapshot);
