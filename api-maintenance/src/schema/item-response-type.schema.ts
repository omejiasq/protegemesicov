import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ItemResponseTypeDocument = HydratedDocument<ItemResponseType>;

/**
 * Tipos de respuesta parametrizables por empresa para los ítems de
 * alistamiento, preventivo y correctivo.
 * Colección: tipos_respuesta_items
 */
@Schema({ collection: 'tipos_respuesta_items', timestamps: true })
export class ItemResponseType {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  company!: Types.ObjectId;

  /**
   * A qué tipo de mantenimiento aplica:
   *   'enlistment' | 'preventive' | 'corrective'
   */
  @Prop({
    required: true,
    enum: ['enlistment', 'preventive', 'corrective'],
    index: true,
  })
  tipo_mantenimiento!: string;

  /** Valor enviado al backend al guardar el ítem (ej: 'OK', 'NC', 'B') */
  @Prop({ required: true, trim: true })
  valor!: string;

  /** Etiqueta visible al usuario (ej: 'OK', 'No Conforme', 'Bueno') */
  @Prop({ required: true, trim: true })
  label!: string;

  /**
   * Indica que esta respuesta equivale a "OK" / conforme.
   * Para alistamiento: los ítems con esta respuesta aportan sus codigos_sicov.
   * Para preventivo/correctivo: los ítems con esta respuesta NO se incluyen
   * en el reporte de fallas.
   */
  @Prop({ default: false })
  es_positivo!: boolean;

  @Prop({ type: Number, default: 0, index: true })
  orden!: number;

  @Prop({ default: true, index: true })
  enabled!: boolean;
}

export const ItemResponseTypeSchema =
  SchemaFactory.createForClass(ItemResponseType);

// Unicidad: una empresa no puede tener el mismo valor para el mismo tipo
ItemResponseTypeSchema.index(
  { company: 1, tipo_mantenimiento: 1, valor: 1 },
  { unique: true },
);
