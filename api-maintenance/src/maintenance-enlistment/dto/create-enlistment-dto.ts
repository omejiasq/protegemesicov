import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, IsArray, Allow } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateEnlistmentDto {
  @IsString() @IsNotEmpty() placa!: string;
  @IsInt() tipoIdentificacion!: number;
  @IsString() @IsNotEmpty() numeroIdentificacion!: string;
  @IsString() @IsNotEmpty() nombresResponsable!: string;
  @IsOptional() @IsString() detalleActividades?: string;
  @IsOptional() @IsArray() actividades?: any[];

  // Campos del conductor que envía el frontend - pueden venir como number o string
  @IsOptional() @Transform(({ value }) => value ? String(value) : undefined) @IsString() tipoIdentificacionConductor?: string;
  @IsOptional() @Transform(({ value }) => value ? String(value) : undefined) @IsString() numeroIdentificacionConductor?: string;
  @IsOptional() @IsString() nombresConductor?: string;

  @IsOptional() @IsNumber() latitud?: number;
  @IsOptional() @IsNumber() longitud?: number;

  // Campos adicionales de la app móvil - permitir cualquier estructura
  @IsOptional() @Allow() fromMobile?: any;
  @IsOptional() @Allow() firma_conductor_foto?: any;
  @IsOptional() @Allow() firma_inspector_foto?: any;
  @IsOptional() @Allow() dailySnapshot?: any;
  @IsOptional() @Allow() items?: any;
}