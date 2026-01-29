import { IsBoolean, IsMongoId, IsNotEmpty, IsString } from 'class-validator';

export class CreateInspectionTypeDto {
  @IsMongoId()
  company: string;

  @IsString()
  @IsNotEmpty()
  clase_vehiculo: string;

  @IsString()
  @IsNotEmpty()
  dispositivo: string;

  @IsString()
  @IsNotEmpty()
  tipo_parte: string;

  @IsBoolean()
  obligatorio?: boolean;
}
