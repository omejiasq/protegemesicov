import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type AuthorizationDocument = HydratedDocument<Authorization>;

type SiNo = 'SI' | 'NO';

@Schema({ _id: false })
export class AuthorizationItem {
  @Prop({ required: true }) fechaViaje!: string;
  @Prop({ required: true }) origen!: string;
  @Prop({ required: true }) destino!: string;
  @Prop({ required: true })
  placa?: string;

  @Prop({ required: true, type: Number }) tipoIdentificacionNna!: number;
  @Prop({ required: true }) numeroIdentificacionNna!: string;
  @Prop({ required: true }) nombresApellidosNna!: string;
  @Prop({ required: true, enum: ['SI', 'NO'] }) situacionDiscapacidad!: SiNo;
  @Prop({ required: true, type: Number }) tipoDiscapacidad!: number;
  @Prop({ required: true, enum: ['SI', 'NO'] }) perteneceComunidadEtnica!: SiNo;
  @Prop({ required: true, type: Number }) tipoPoblacionEtnica!: number;

  @Prop({ required: true, type: Number }) tipoIdentificacionOtorgante!: number;
  @Prop({ required: true }) numeroIdentificacionOtorgante!: string;
  @Prop({ required: true }) nombresApellidosOtorgante!: string;
  @Prop({ required: true }) numeroTelefonicoOtorgante!: string;
  @Prop({ required: true }) correoElectronicoOtorgante!: string;
  @Prop({ required: true }) direccionFisicaOtorgante!: string;
  @Prop({ required: true, type: Number }) sexoOtorgante!: number;
  @Prop({ required: true, type: Number }) generoOtorgante!: number;
  @Prop({ required: true, type: Number }) calidadActua!: number;

  @Prop({ required: true, type: Number })
  tipoIdentificacionAutorizadoViajar!: number;
  @Prop({ required: true }) numeroIdentificacionAutorizadoViajar!: string;
  @Prop({ required: true }) nombresApellidosAutorizadoViajar!: string;
  @Prop({ required: true }) numeroTelefonicoAutorizadoViajar!: string;
  @Prop({ required: true }) direccionFisicaAutorizadoViajar!: string;

  @Prop({ required: true, type: Number })
  tipoIdentificacionAutorizadoRecoger!: number;
  @Prop({ required: true }) numeroIdentificacionAutorizadoRecoger!: string;
  @Prop({ required: true }) nombresApellidosAutorizadoRecoger!: string;
  @Prop({ required: true }) numeroTelefonicoAutorizadoRecoger!: string;
  @Prop({ required: true }) direccionFisicaAutorizadoRecoger!: string;

  @Prop({ required: true }) copiaAutorizacionViajeNombreOriginal!: string;
  @Prop({ required: true }) copiaDocumentoParentescoNombreOriginal!: string;
  @Prop({ required: true })
  copiaDocumentoIdentidadAutorizadoNombreOriginal!: string;
  @Prop({ required: true }) copiaConstanciaEntregaNombreOriginal!: string;
}

export const AuthorizationItemSchema =
  SchemaFactory.createForClass(AuthorizationItem);
AuthorizationItemSchema.index({ numeroIdentificacionNna: 1 });
AuthorizationItemSchema.index({ numeroIdentificacionOtorgante: 1 });

@Schema({ timestamps: true, collection: 'authorizations' })
export class Authorization {
  @Prop({ required: true, type: Number })
  idDespacho!: number;

  @Prop({ type: [AuthorizationItemSchema], required: true, default: [] })
  autorizacion!: AuthorizationItem[];

  @Prop({ required: true }) enterprise_id!: string;
  @Prop() createdBy?: string;

  @Prop({ type: Boolean, default: true })
  estado!: boolean;
}

export const AuthorizationSchema = SchemaFactory.createForClass(Authorization);
AuthorizationSchema.index({ enterprise_id: 1, idDespacho: 1, createdAt: -1 });
