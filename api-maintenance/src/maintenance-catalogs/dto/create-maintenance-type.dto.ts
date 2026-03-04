import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateMaintenanceTypeDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  clase_vehiculo?: string;

  @IsString()
  @IsNotEmpty()
  dispositivo: string;

  @IsString()
  @IsNotEmpty()
  tipo_parte: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsNumber()
  orden?: number;
}
