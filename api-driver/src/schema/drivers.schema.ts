import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type DriverDocument = HydratedDocument<Driver>;

@Schema({ timestamps: true })
export class Driver {
    
  @Prop({ type: String, index: true, required: true })
  enterprise_id!: string;

  @Prop({ type: Number, index: true, required: true })
  idDespacho!: number;

  @Prop({ type: String, required: true })  tipoIdentificacionPrincipal!: string;
  @Prop({ type: String, required: true })  numeroIdentificacion!: string;
  @Prop({ type: String, required: true })  primerNombrePrincipal!: string;
  @Prop({ type: String })                  segundoNombrePrincipal?: string;
  @Prop({ type: String, required: true })  primerApellidoPrincipal!: string;
  @Prop({ type: String })                  segundoApellidoPrincipal?: string;

  @Prop({ type: String }) tipoIdentificacionSecundario?: string;
  @Prop({ type: String }) numeroIdentificacionSecundario?: string;
  @Prop({ type: String }) primerNombreSecundario?: string;
  @Prop({ type: String }) segundoNombreSecundario?: string;
  @Prop({ type: String }) primerApellidoSecundario?: string;
  @Prop({ type: String }) segundoApellidoSecundario?: string;

  @Prop({ type: String }) idPruebaAlcoholimetria?: string;
  @Prop({ type: String }) resultadoPruebaAlcoholimetria?: string;
  @Prop({ type: Date })   fechaUltimaPruebaAlcoholimetria?: Date;
  @Prop({ type: String }) idExamenMedico?: string;
  @Prop({ type: Date })   fechaUltimoExamenMedico?: Date;

  @Prop({ type: String }) idPruebaAlcoholimetriaSecundario?: string;
  @Prop({ type: String }) resultadoPruebaAlcoholimetriaSecundario?: string;
  @Prop({ type: Date })   fechaUltimaPruebaAlcoholimetriaSecundario?: Date;
  @Prop({ type: String }) idExamenMedicoSecundario?: string;
  @Prop({ type: Date })   fechaUltimoExamenMedicoSecundario?: Date;

  @Prop({ type: String }) licenciaConduccion?: string;
  @Prop({ type: String }) licenciaConduccionSecundario?: string;
  @Prop({ type: String }) observaciones?: string;

  @Prop({ type: Boolean, default: true, index: true })
  estado!: boolean;

  @Prop({ type: String }) createdBy?: string;
}

const DriverSchema = SchemaFactory.createForClass(Driver);
DriverSchema.index({ enterprise_id: 1, idDespacho: 1, numeroIdentificacion: 1 }, { unique: true });

export { DriverSchema };