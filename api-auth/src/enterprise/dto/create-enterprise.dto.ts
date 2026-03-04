import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateEnterpriseDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  nit?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  // ── Centro especializado ──────────────────────────────
  @IsOptional()
  @IsString()
  specialized_center_name?: string;

  @IsOptional()
  @IsNumber()
  specialized_center_document_type?: number;

  @IsOptional()
  @IsString()
  specialized_center_document_number?: string;

  // ── Ingeniero mecánico ────────────────────────────────
  @IsOptional()
  @IsNumber()
  mechanic_document_type?: number;

  @IsOptional()
  @IsString()
  mechanic_document_number?: string;

  @IsOptional()
  @IsString()
  mechanic_name?: string;
}
