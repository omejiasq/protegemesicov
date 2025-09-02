import { IsString } from 'class-validator';

export class ViewPreventiveDto {
  @IsString() mantenimientoId!: string;
}