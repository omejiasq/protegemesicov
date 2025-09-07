import { IsString } from 'class-validator';

export class ViewEnlistmentDto {
  @IsString()
  id!: string;
}