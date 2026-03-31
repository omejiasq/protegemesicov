import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateEnlistmentDto {
  @IsString() @IsNotEmpty() mantenimientoId!: string;
  @IsString() @IsNotEmpty() placa!: string;
  @IsString() @IsNotEmpty() fecha!: string;
  @IsString() @IsNotEmpty() hora!: string;
  @IsInt() tipoIdentificacion!: number;
  @IsString() @IsNotEmpty() numeroIdentificacion!: string;
  @IsString() @IsNotEmpty() nombresResponsable!: string;
  @IsString() detalleActividades?: string;
  actividades?: string[];

  @IsOptional() @IsNumber() latitud?: number;
  @IsOptional() @IsNumber() longitud?: number;
}