import { IsString, Length } from 'class-validator';

import { IsMongoId } from 'class-validator';

export class ViewPreventiveDto {
  @IsMongoId()
  mantenimientoId!: string;
}
