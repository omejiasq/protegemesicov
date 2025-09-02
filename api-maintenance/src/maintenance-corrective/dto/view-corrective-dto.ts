import { IsString } from 'class-validator';

export class ViewCorrectiveDto {
  @IsString() mantenimientoId!: string;
}