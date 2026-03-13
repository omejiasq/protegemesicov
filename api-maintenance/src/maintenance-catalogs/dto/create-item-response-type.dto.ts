import { IsString, IsNotEmpty, IsIn, IsBoolean, IsNumber, IsOptional, Min } from 'class-validator';

export class CreateItemResponseTypeDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['enlistment', 'preventive', 'corrective'])
  tipo_mantenimiento!: string;

  @IsString()
  @IsNotEmpty()
  valor!: string;

  @IsString()
  @IsNotEmpty()
  label!: string;

  @IsBoolean()
  @IsOptional()
  es_positivo?: boolean;

  @IsNumber()
  @Min(0)
  @IsOptional()
  orden?: number;
}
