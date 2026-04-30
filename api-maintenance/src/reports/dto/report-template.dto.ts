// src/reports/dto/report-template.dto.ts
import { IsString, IsOptional, IsArray, IsBoolean, IsNumber, IsEnum, ValidateNested, IsObject } from 'class-validator';
import { Type } from 'class-transformer';

export class FieldConfigDto {
  @IsString()
  path: string;

  @IsString()
  label: string;

  @IsString()
  type: string;

  @IsOptional()
  @IsBoolean()
  visible?: boolean;

  @IsOptional()
  @IsString()
  format?: string;

  @IsOptional()
  @IsString()
  aggregation?: string;
}

export class FilterConditionDto {
  @IsString()
  field: string;

  @IsString()
  operator: string;

  @IsOptional()
  value?: any;

  @IsOptional()
  @IsEnum(['and', 'or'])
  logic?: 'and' | 'or';
}

export class ReportConfigDto {
  @IsString()
  tipo: string;

  @IsArray()
  @IsString({ each: true })
  collections: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FieldConfigDto)
  campos: FieldConfigDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FilterConditionDto)
  filtros?: FilterConditionDto[];

  @IsOptional()
  @IsArray()
  ordenamiento?: { campo: string; direccion: 'asc' | 'desc' }[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  agrupacion?: string[];

  @IsOptional()
  @IsNumber()
  limite?: number;
}

export class BrandingConfigDto {
  @IsOptional()
  @IsBoolean()
  includeHeader?: boolean;

  @IsOptional()
  @IsBoolean()
  includeLogo?: boolean;

  @IsOptional()
  @IsString()
  headerColor?: string;

  @IsOptional()
  @IsString()
  textColor?: string;

  @IsOptional()
  @IsString()
  customTitle?: string;
}

export class ScheduledConfigDto {
  @IsBoolean()
  enabled: boolean;

  @IsEnum(['daily', 'weekly', 'monthly'])
  frequency: 'daily' | 'weekly' | 'monthly';

  @IsArray()
  @IsString({ each: true })
  recipients: string[];

  @IsOptional()
  nextRun?: Date;
}

export class CreateReportTemplateDto {
  @IsString()
  nombre: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsEnum(['operacional', 'gerencial', 'regulatorio', 'personalizado'])
  categoria?: string;

  @ValidateNested()
  @Type(() => ReportConfigDto)
  configuracion: ReportConfigDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => BrandingConfigDto)
  branding?: BrandingConfigDto;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @ValidateNested()
  @Type(() => ScheduledConfigDto)
  scheduledConfig?: ScheduledConfigDto;
}

export class UpdateReportTemplateDto {
  @IsOptional()
  @IsString()
  nombre?: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsEnum(['operacional', 'gerencial', 'regulatorio', 'personalizado'])
  categoria?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => ReportConfigDto)
  configuracion?: ReportConfigDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => BrandingConfigDto)
  branding?: BrandingConfigDto;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @ValidateNested()
  @Type(() => ScheduledConfigDto)
  scheduledConfig?: ScheduledConfigDto;
}

export class GenerateReportDto {
  @IsOptional()
  @IsObject()
  dateRange?: {
    start?: string;
    end?: string;
  };

  @IsOptional()
  @IsObject()
  additionalFilters?: Record<string, any>;

  @IsOptional()
  @IsEnum(['excel', 'pdf', 'csv'])
  format?: 'excel' | 'pdf' | 'csv';

  @IsOptional()
  @IsBoolean()
  includeCharts?: boolean;
}

export class ReportFieldsQueryDto {
  @IsArray()
  @IsString({ each: true })
  collections: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  types?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  excludePaths?: string[];

  @IsOptional()
  @IsBoolean()
  includeNested?: boolean;
}

export class DuplicateTemplateDto {
  @IsString()
  newName: string;
}