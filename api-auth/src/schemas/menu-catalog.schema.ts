import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type MenuCatalogDocument = MenuCatalog & Document;

@Schema({ collection: 'menu_catalog', timestamps: true })
export class MenuCatalog {
  /** Clave única usada para control de acceso (ej: web_enlistment) */
  @Prop({ required: true, unique: true, trim: true })
  key: string;

  /** Etiqueta visible al usuario */
  @Prop({ required: true, trim: true })
  label: string;

  /** Plataforma: 'web' | 'mobile' | 'both' */
  @Prop({
    type: String,
    enum: ['web', 'mobile', 'both'],
    default: 'web',
  })
  platform: 'web' | 'mobile' | 'both';

  /** Ícono PrimeVue (ej: pi pi-list-check) */
  @Prop({ trim: true, default: 'pi pi-circle' })
  icon: string;

  /** Ruta frontend (ej: /maintenance/enlistment) */
  @Prop({ trim: true, default: '' })
  route: string;

  /** Categoría / agrupación visual (ej: MANTENIMIENTOS, CONFIG, REPORTES) */
  @Prop({ trim: true, default: 'GESTIÓN' })
  category: string;

  /** Orden de aparición dentro de la categoría */
  @Prop({ type: Number, default: 99 })
  order: number;

  /** Si está habilitado globalmente (superadmin puede deshabilitar) */
  @Prop({ default: true })
  enabled: boolean;
}

export const MenuCatalogSchema = SchemaFactory.createForClass(MenuCatalog);
