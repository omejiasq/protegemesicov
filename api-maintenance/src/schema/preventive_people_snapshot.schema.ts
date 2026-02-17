import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type PreventivePeopleSnapshotDocument =
  HydratedDocument<PreventivePeopleSnapshot>;

@Schema({ collection: 'preventive_people_snapshots', timestamps: true })
export class PreventivePeopleSnapshot {
  @Prop({ required: true, index: true })
  mantenimientoId!: string;

  @Prop() conductorNombre!: string;
  @Prop() conductorCedula!: string;

  @Prop() empresaNombre!: string;
  @Prop() empresaNit!: string;
  @Prop() empresaDireccion!: string;
  @Prop() empresaTelefono!: string;
}

export const PreventivePeopleSnapshotSchema =
  SchemaFactory.createForClass(PreventivePeopleSnapshot);
