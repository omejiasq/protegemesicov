import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type WorkshopFormatDocument = HydratedDocument<WorkshopFormat>;

@Schema({ collection: 'workshop_formats', timestamps: true })
export class WorkshopFormat {
  /** Empresa dueña del formato. null = global (aplica a todas las empresas) */
  @Prop({ type: String, default: null, index: true })
  enterprise_id?: string | null;

  /** Nombre descriptivo del formato, ej: "Inspección Cootranshuila v1.0" */
  @Prop({ required: true, trim: true })
  nombre!: string;

  /** Descripción corta del formato para mostrar al usuario */
  @Prop({ trim: true })
  descripcion?: string;

  /** Prompt de extracción que se enviará a Claude junto con la imagen */
  @Prop({ required: true })
  prompt_extraccion!: string;

  /** Campos esperados en la respuesta JSON (para validación y UI) */
  @Prop({ type: [String], default: [] })
  campos_esperados!: string[];

  /** Activo/Inactivo */
  @Prop({ default: true, index: true })
  enabled!: boolean;
}

export const WorkshopFormatSchema = SchemaFactory.createForClass(WorkshopFormat);
