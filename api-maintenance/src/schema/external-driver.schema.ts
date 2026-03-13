/**
 * Schema mínimo para escritura en la colección 'drivers' desde api-maintenance.
 * Solo se usa en el módulo de ingesta externa (API Key).
 * La gestión completa de conductores vive en api-driver.
 */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ExternalDriverDocument = HydratedDocument<ExternalDriver>;

@Schema({ collection: 'drivers', timestamps: true })
export class ExternalDriver {
  @Prop({ type: Types.ObjectId }) enterprise_id: Types.ObjectId;

  // Conductor principal
  @Prop({ type: String }) tipoIdentificacionPrincipal: string;
  @Prop({ type: String }) numeroIdentificacion: string;
  @Prop({ type: String }) primerNombrePrincipal: string;
  @Prop({ type: String }) segundoNombrePrincipal: string;
  @Prop({ type: String }) primerApellidoPrincipal: string;
  @Prop({ type: String }) segundoApellidoPrincipal: string;

  // Conductor secundario (copiloto)
  @Prop({ type: String }) tipoIdentificacionSecundario: string;
  @Prop({ type: String }) numeroIdentificacionSecundario: string;
  @Prop({ type: String }) primerNombreSecundario: string;
  @Prop({ type: String }) segundoNombreSecundario: string;
  @Prop({ type: String }) primerApellidoSecundario: string;
  @Prop({ type: String }) segundoApellidoSecundario: string;

  // Alcoholimetría
  @Prop({ type: String }) idPruebaAlcoholimetria: string;
  @Prop({ type: String }) resultadoPruebaAlcoholimetria: string;
  @Prop({ type: Date })   fechaUltimaPruebaAlcoholimetria: Date;

  // Examen médico
  @Prop({ type: String }) idExamenMedico: string;
  @Prop({ type: Date })   fechaUltimoExamenMedico: Date;

  // Licencia
  @Prop({ type: String }) licenciaConduccion: string;
  @Prop({ type: Date })   licenciaVencimiento: Date;
  @Prop({ type: String }) licenciaConduccionSecundario: string;

  @Prop({ type: String }) observaciones: string;
  @Prop({ type: Boolean, default: true }) active: boolean;
  @Prop({ type: String }) createdBy: string;
  @Prop({ type: String }) source: string;
}

export const ExternalDriverSchema = SchemaFactory.createForClass(ExternalDriver);
ExternalDriverSchema.index({ numeroIdentificacion: 1, enterprise_id: 1 }, { unique: true });
