import { IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateProveedorDto {
  @IsOptional()
  @IsString()
  nit?: string;

  @IsOptional()
  @IsString()
  razon_social?: string;

  @IsOptional()
  @IsString()
  nombre_mecanico?: string;

  @IsOptional()
  @IsNumber()
  tipo_id_mecanico?: number;

  @IsOptional()
  @IsString()
  num_id_mecanico?: string;
}
