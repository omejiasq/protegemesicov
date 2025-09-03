import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ModuleDocument = Module & Document;

@Schema()
export class Module {

  @Prop({ required: true })
  nombre: string;

  @Prop({ required: true })
  ruta: string;

 @Prop({ type: Object })
  permisos: {
    crear: boolean;
    leer: boolean;
    modificar: boolean;
  };
}

export const ModuleSchema = SchemaFactory.createForClass(Module);