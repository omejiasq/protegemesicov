import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type FileAssetDocument = HydratedDocument<FileAsset>;

@Schema({ collection: 'file_assets', timestamps: true })
export class FileAsset {
  @Prop({ required: false}) vigiladoId!: number;
  @Prop({ required: true }) nombreOriginalArchivo!: string;
  @Prop({ required: true }) nombreAlmacenado!: string; // documento
  @Prop({ required: true }) ruta!: string;             // path relativo
  @Prop({ required: true }) mimeType!: string;
  @Prop({ required: true }) size!: number;

  @Prop({ index: true }) enterprise_id?: string;
  @Prop() createdBy?: string;
}
export const FileAssetSchema = SchemaFactory.createForClass(FileAsset);
FileAssetSchema.index({ enterprise_id: 1,  createdAt: -1 });