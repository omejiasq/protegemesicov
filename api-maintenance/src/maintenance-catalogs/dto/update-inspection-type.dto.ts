import {
  IsArray,
  IsBoolean,
  IsInt,
  Max,
  Min,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class UpdateInspectionTypeDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  tipo_parte?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  dispositivo?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  clase_vehiculo?: string;

  @IsOptional()
  @IsBoolean()
  obligatorio?: boolean;

  @IsOptional()
  @IsNumber()
  orden?: number;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(11, { each: true })
  codigos_sicov?: number[];
}
