import { IsString, IsNotEmpty, IsIn, IsBoolean, IsNumber, IsOptional, Min } from 'class-validator';

export class UpdateItemResponseTypeDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['enlistment', 'preventive', 'corrective'])
  @IsOptional()
  tipo_mantenimiento?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  valor?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  label?: string;

  @IsBoolean()
  @IsOptional()
  es_positivo?: boolean;

  @IsNumber()
  @Min(0)
  @IsOptional()
  orden?: number;
}
