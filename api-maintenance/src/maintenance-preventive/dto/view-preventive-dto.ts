import { IsString } from 'class-validator';

export class ViewPreventiveDto {
  @IsString()
  id!: string;
}