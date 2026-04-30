// src/reports/schemas/report-template.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import * as mongoose from 'mongoose';

export type ReportTemplateDocument = HydratedDocument<ReportTemplate>;

@Schema({ _id: false })
export class FieldConfig {
  @Prop({ required: true })
  path!: string;

  @Prop({ required: true })
  label!: string;

  @Prop({ required: true })
  type!: string;

  @Prop({ default: true })
  visible!: boolean;

  @Prop()
  format?: string;

  @Prop()
  aggregation?: string; // sum, count, avg, etc.
}

@Schema({ _id: false })
export class FilterCondition {
  @Prop({ required: true })
  field!: string;

  @Prop({ required: true })
  operator!: string; // eq, ne, gt, gte, lt, lte, in, nin, like

  @Prop({ type: mongoose.Schema.Types.Mixed })
  value?: any;

  @Prop({ default: 'and' })
  logic!: 'and' | 'or';
}

@Schema({ _id: false })
export class ReportConfig {
  @Prop({ required: true })
  tipo!: string;

  @Prop({ type: [String], default: [] })
  collections!: string[]; // Colecciones a incluir

  @Prop({ type: [FieldConfig], default: [] })
  campos!: FieldConfig[];

  @Prop({ type: [FilterCondition], default: [] })
  filtros!: FilterCondition[];

  @Prop()
  ordenamiento?: { campo: string; direccion: 'asc' | 'desc' }[];

  @Prop()
  agrupacion?: string[];

  @Prop()
  limite?: number;
}

@Schema({ _id: false })
export class BrandingConfig {
  @Prop({ default: true })
  includeHeader!: boolean;

  @Prop({ default: true })
  includeLogo!: boolean;

  @Prop()
  headerColor?: string;

  @Prop()
  textColor?: string;

  @Prop()
  customTitle?: string;
}

@Schema({ collection: 'report_templates', timestamps: true })
export class ReportTemplate {
  @Prop({ required: true, trim: true, maxlength: 100 })
  nombre!: string;

  @Prop({ trim: true, maxlength: 500 })
  descripcion?: string;

  @Prop({
    enum: ['operacional', 'gerencial', 'regulatorio', 'personalizado'],
    default: 'operacional',
    index: true
  })
  categoria!: string;

  @Prop({ type: ReportConfig, required: true })
  configuracion!: ReportConfig;

  @Prop({ type: BrandingConfig })
  branding?: BrandingConfig;

  @Prop({ required: true, index: true })
  enterprise_id!: string;

  @Prop()
  createdBy?: string;

  @Prop({ default: true, index: true })
  activo!: boolean;

  @Prop({ type: Date })
  lastUsed?: Date;

  @Prop({ default: 0 })
  usageCount!: number;

  @Prop({ default: false })
  isPublic!: boolean; // Para templates compartidos

  @Prop({ type: [String], default: [] })
  tags!: string[];

  @Prop({ type: mongoose.Schema.Types.Mixed })
  scheduledConfig?: {
    enabled: boolean;
    frequency: 'daily' | 'weekly' | 'monthly';
    recipients: string[];
    nextRun: Date;
  };
}

export const ReportTemplateSchema = SchemaFactory.createForClass(ReportTemplate);
ReportTemplateSchema.index({ enterprise_id: 1, categoria: 1 });
ReportTemplateSchema.index({ enterprise_id: 1, lastUsed: -1 });
ReportTemplateSchema.index({ tags: 1 });