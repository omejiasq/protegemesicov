import { IsInt, IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class CreatePreventiveDto {
  @IsOptional() @IsString() mantenimientoId?: string;
  @IsString() @IsNotEmpty() placa!: string;
  @IsString() @IsNotEmpty() fecha!: string;
  @IsString() @IsNotEmpty() hora!: string;
  @IsInt() nit!: number;
  @IsString() @IsNotEmpty() razonSocial!: string;
  @IsInt() tipoIdentificacion!: number;
  @IsString() @IsNotEmpty() numeroIdentificacion!: string;
  @IsString() @IsNotEmpty() nombresResponsable!: string;
  @IsString() @IsNotEmpty() detalleActividades!: string;

  @IsOptional() @IsBoolean() isPlanned?: boolean;
}