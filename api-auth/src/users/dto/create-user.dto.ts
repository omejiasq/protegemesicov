import { IsOptional, IsString, IsDateString } from 'class-validator';

export class CreateUserDto {
  usuario: string;
  password: string;

  @IsOptional()
  firstName?: string;

  @IsOptional()
  lastName?: string;

  @IsOptional()
  phone?: string;

  @IsOptional()
  email?: string;

  @IsOptional()
  documentType?: number;

  @IsOptional()
  documentNumber?: string;

  @IsOptional()
  roleType?: string;

  @IsOptional()
  enterprise_id?: string;

  // ✅ NUEVOS CAMPOS
  @IsOptional()
  @IsString()
  no_licencia_conduccion?: string;

  @IsOptional()
  @IsDateString()
  vencimiento_licencia_conduccion?: string;
}