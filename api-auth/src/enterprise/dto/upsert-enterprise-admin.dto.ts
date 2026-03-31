import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsNumber,
  IsIn,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpsertEnterpriseAdminDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  document_number?: string;

  @IsOptional()
  @IsString()
  phone_number?: string;

  @IsOptional()
  @IsString()
  movil_number?: string;

  @IsOptional()
  @IsIn(['enterprise', 'basic'])
  packageType?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  vigiladoId?: number;

  @IsOptional()
  @IsString()
  vigiladoToken?: string;

  @IsOptional()
  @IsString()
  format_enlistment_consecutive?: string;

  @IsOptional()
  @IsString()
  format_enlistment_maintenance?: string;

  @IsOptional()
  @IsString()
  formato_type?: string;

  @IsOptional()
  @IsObject()
  formato_alistamiento?: Record<string, any>;

  @IsOptional()
  @IsObject()
  formato_correctivo?: Record<string, any>;

  @IsOptional()
  @IsObject()
  formato_preventivo?: Record<string, any>;

  @IsOptional()
  @IsIn(['CARRETERA', 'ESPECIAL', 'MIXTO'])
  tipo_habilitacion?: 'CARRETERA' | 'ESPECIAL' | 'MIXTO';
}
