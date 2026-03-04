import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateMaintenanceTypeDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  tipo_parte?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  dispositivo?: string;

  @IsOptional()
  @IsNumber()
  orden?: number;
}
