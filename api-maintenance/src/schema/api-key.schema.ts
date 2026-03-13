// src/schema/api-key.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ApiKeyDocument = HydratedDocument<ApiKey>;

@Schema({ collection: 'api_keys', timestamps: true })
export class ApiKey {
  /** Hash SHA-256 de la clave raw. La clave raw nunca se almacena. */
  @Prop({ required: true, unique: true, index: true })
  keyHash!: string;

  /** Empresa a la que pertenece esta clave */
  @Prop({ required: true, index: true })
  enterprise_id!: string;

  /** vigiladoId SICOV de la empresa (número NIT sin dígito) */
  @Prop()
  vigiladoId?: string;

  /** Token de vigilado SICOV de la empresa */
  @Prop()
  vigiladoToken?: string;

  /** Nombre descriptivo para identificar la integración */
  @Prop({ required: true })
  name!: string;

  /** Activa / revocada */
  @Prop({ default: true, index: true })
  active!: boolean;

  /** Último uso (se actualiza en cada request) */
  @Prop()
  lastUsedAt?: Date;

  /** Usuario que la creó */
  @Prop()
  createdBy?: string;

  /**
   * Modo demo: cuando es true, los registros se guardan localmente
   * pero NO se envían a la Supertransporte (SICOV). Útil para pruebas
   * de integración y demostraciones sin afectar datos reales.
   */
  @Prop({ default: false })
  demoMode?: boolean;
}

export const ApiKeySchema = SchemaFactory.createForClass(ApiKey);
