// src/schema/corrective_people_snapshot.schema.ts

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CorrectivePeopleSnapshotDocument =
  HydratedDocument<CorrectivePeopleSnapshot>;

@Schema({
  collection: 'corrective_people_snapshots',
  timestamps: true,
})
export class CorrectivePeopleSnapshot {
  @Prop({ required: true, index: true })
  mantenimientoId!: string;

  @Prop() conductorNombre!: string;
  @Prop() conductorCedula!: string;

  @Prop() empresaNombre!: string;
  @Prop() empresaNit!: string;
  @Prop() empresaDireccion!: string;
  @Prop() empresaTelefono!: string;
}

export const CorrectivePeopleSnapshotSchema =
  SchemaFactory.createForClass(CorrectivePeopleSnapshot);
