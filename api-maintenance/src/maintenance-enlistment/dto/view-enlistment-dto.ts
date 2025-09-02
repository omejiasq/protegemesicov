import { IsNotEmpty, IsString } from 'class-validator';

export class ViewEnlistmentDto {
  @IsString() @IsNotEmpty() mantenimientoId!: string;
}