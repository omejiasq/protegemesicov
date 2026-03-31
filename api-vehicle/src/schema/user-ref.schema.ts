/**
 * Referencia mínima a la colección 'users' (gestionada por api-auth).
 * Solo se usa para lectura (obtener correos de admins).
 */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export type UserRefDocument = HydratedDocument<UserRef>;

@Schema({ collection: 'users', timestamps: false })
export class UserRef {
  @Prop({ type: Object })
  usuario: {
    correo?: string;
    nombre?: string;
    apellido?: string;
    usuario?: string;
    documentNumber?: string;
  };

  @Prop({ type: String })
  roleType: string;

  @Prop({ type: MongooseSchema.Types.ObjectId })
  enterprise_id?: Types.ObjectId;

  @Prop({ type: Boolean, default: true })
  active: boolean;

  // Campos del conductor para FUEC
  @Prop({ type: String, default: null }) no_licencia_conduccion?: string;
  @Prop({ type: Date, default: null })   vencimiento_licencia_conduccion?: Date;
  @Prop({ type: String, default: null }) categoria_licencia?: string;
}

export const UserRefSchema = SchemaFactory.createForClass(UserRef);
