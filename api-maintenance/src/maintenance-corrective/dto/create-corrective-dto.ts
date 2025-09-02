import { IsInt, IsString } from 'class-validator';

export class CreateCorrectiveDto {
  @IsString() mantenimientoId!: string;
  @IsString() placa!: string;
  @IsString() fecha!: string; // YYYY-MM-DD
  @IsString() hora!: string;  // HH:mm
  @IsInt() nit!: number;
  @IsString() razonSocial!: string;
  @IsString() descripcionFalla!: string;
  @IsString() accionesRealizadas!: string;
}