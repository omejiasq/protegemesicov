import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ReportTemplateDocument = ReportTemplate & Document;

@Schema({ collection: 'report_templates', timestamps: true })
export class ReportTemplate {
  @Prop({ required: true })
  name: string;

  @Prop()
  description?: string;

  @Prop({ required: true })
  dataset: string; // 'alistamientos'

  @Prop({ required: true })
  fields: string[]; // campos seleccionados

  @Prop({ default: [] })
  filters: any[]; // filtros aplicados

  @Prop({ default: [] })
  groupBy: string[]; // campos de agrupación

  @Prop({ default: [] })
  aggregations: any[]; // agregaciones

  @Prop({ default: 'detail' })
  mode: 'detail' | 'grouped';

  @Prop({ default: 100 })
  limit: number;

  @Prop({ required: true })
  enterprise_id: string; // filtro de empresa

  @Prop({ required: true })
  created_by: string; // usuario que creó la plantilla

  @Prop({ default: true })
  is_active: boolean;

  @Prop({ default: false })
  is_public: boolean; // si otros usuarios de la empresa pueden usarla
}

export const ReportTemplateSchema = SchemaFactory.createForClass(ReportTemplate);