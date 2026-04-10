// src/document-alert/document-alert.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type DocumentAlertDocument = DocumentAlert & Document;

/**
 * Alerta generada cuando la app móvil escanea un documento físico y detecta
 * que está vencido o próximo a vencer.
 *
 * Documentos soportados:
 *   licencia_conduccion  — Licencia de Conducción del conductor
 *   tarjeta_operacion    — Tarjeta de Operación del vehículo (flotas comerciales)
 *   tarjeta_propiedad    — Tarjeta de Propiedad / Licencia de Tránsito
 */
@Schema({ collection: 'document_alerts', timestamps: true })
export class DocumentAlert {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  enterprise_id: Types.ObjectId;

  /** licencia_conduccion | tarjeta_operacion | tarjeta_propiedad */
  @Prop({ required: true, enum: ['licencia_conduccion', 'tarjeta_operacion', 'tarjeta_propiedad'] })
  documentType: string;

  /** expired | near_expiry */
  @Prop({ required: true, enum: ['expired', 'near_expiry'] })
  alertStatus: string;

  /** Fecha de vencimiento detectada por OCR */
  @Prop({ type: Date })
  expiryDate?: Date;

  /** Días vencido (positivo = ya venció, negativo = días restantes) */
  @Prop({ default: 0 })
  daysOverdue: number;

  /** Autenticidad del documento físico detectada por heurística OCR */
  @Prop({ default: 'uncertain', enum: ['likely_physical', 'uncertain', 'likely_digital'] })
  cardAuthenticity: string;

  // ── Datos del conductor ──────────────────────────────────────────
  @Prop({ default: '' })
  conductorName: string;

  @Prop({ default: '' })
  conductorId: string;       // número de cédula

  @Prop({ type: Types.ObjectId })
  driver_id?: Types.ObjectId;

  // ── Datos del vehículo ───────────────────────────────────────────
  @Prop({ default: '' })
  vehiclePlaca: string;

  @Prop({ type: Types.ObjectId })
  vehicle_id?: Types.ObjectId;

  // ── Categorías detectadas (licencias) ────────────────────────────
  /** Ej: ["A2","B1","C2"] */
  @Prop({ type: [String], default: [] })
  categorias: string[];

  /** Texto OCR completo (para depuración) */
  @Prop({ default: '' })
  rawText: string;

  // ── Gestión de la alerta ─────────────────────────────────────────
  @Prop({ default: false })
  acknowledged: boolean;

  @Prop({ type: Date })
  acknowledgedAt?: Date;

  @Prop({ default: '' })
  acknowledgedBy: string;   // nombre o id del usuario que gestionó

  /** Nombre/ID del usuario móvil que escaneó */
  @Prop({ default: '' })
  scannedBy: string;

  @Prop({ default: '' })
  scannedByUserId: string;
}

export const DocumentAlertSchema = SchemaFactory.createForClass(DocumentAlert);
