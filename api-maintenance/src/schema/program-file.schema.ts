import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ProgramFileDocument = HydratedDocument<ProgramFile>;

@Schema({ collection: 'program_files', timestamps: true })
export class ProgramFile {
  @Prop({ required: true, enum: [1,2,3], index: true }) tipoId!: 1|2|3;
  @Prop({ required: true }) vigiladoId!: number;

  @Prop({ required: true }) documento!: string;   
  @Prop({ required: true }) nombreOriginal!: string; 
  @Prop({ required: true }) ruta!: string;           

  @Prop({ index: true }) enterprise_id?: string;
  @Prop() createdBy?: string;
}
export const ProgramFileSchema = SchemaFactory.createForClass(ProgramFile);
ProgramFileSchema.index({ enterprise_id: 1, tipoId: 1, vigiladoId: 1, createdAt: -1 });