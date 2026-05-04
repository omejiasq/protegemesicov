import { IsString, IsArray, IsOptional, IsIn, IsNumber, Min, Max, ValidateNested, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class FilterConditionDto {
  @IsString()
  field: string;

  @IsString()
  @IsIn(['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'like', 'in', 'nin'])
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'in' | 'nin';

  value: any;

  @IsOptional()
  @IsString()
  @IsIn(['and', 'or'])
  logic?: 'and' | 'or';
}

export class AggregationDto {
  @IsString()
  field: string;

  @IsString()
  @IsIn(['sum', 'avg', 'count', 'min', 'max'])
  type: 'sum' | 'avg' | 'count' | 'min' | 'max';
}

export class DynamicQueryDto {
  @IsString()
  @IsIn(['alistamientos', 'preventive_details'])
  dataset: string;

  @IsArray()
  @IsString({ each: true })
  fields: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FilterConditionDto)
  filters?: FilterConditionDto[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  groupBy?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AggregationDto)
  aggregations?: AggregationDto[];

  @IsOptional()
  @IsString()
  @IsIn(['detail', 'grouped'])
  mode?: 'detail' | 'grouped';

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10000)
  limit?: number;
}

export class ExportQueryDto extends DynamicQueryDto {
  @IsOptional()
  @IsString()
  @IsIn(['excel', 'pdf'])
  format?: 'excel' | 'pdf';

  @IsOptional()
  @IsBoolean()
  includeHeader?: boolean;

  @IsOptional()
  @IsBoolean()
  includeLogo?: boolean;

  @IsOptional()
  @IsString()
  customTitle?: string;

  @IsOptional()
  @IsString()
  headerColor?: string;

  @IsOptional()
  @IsString()
  textColor?: string;
}

export class DatasetResponseDto {
  id: string;
  name: string;
  source: string;
  fields: {
    key: string;
    label: string;
    type: 'string' | 'number' | 'date' | 'boolean';
    groupable: boolean;
    aggregations?: string[];
  }[];
}

export class QueryResultDto {
  dataset: string;
  totalRecords: number;
  data: any[];
  query: DynamicQueryDto;
}