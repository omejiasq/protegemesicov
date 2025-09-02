import { IsInt, IsString, IsNotEmpty } from 'class-validator';

export class CreatePreventiveDto {
  @IsString() @IsNotEmpty() mantenimientoId!: string;
  @IsString() placa!: string;
  @IsString() fecha!: string;
  @IsString() hora!: string;

  @IsInt() nit!: number;
  @IsString() razonSocial!: string;

  @IsInt() tipoIdentificacion!: number;
  @IsString() numeroIdentificacion!: string;
  @IsString() nombresResponsable!: string;

  @IsString() detalleActividades!: string;
}