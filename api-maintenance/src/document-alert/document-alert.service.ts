// src/document-alert/document-alert.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { DocumentAlert, DocumentAlertDocument } from './document-alert.schema';

@Injectable()
export class DocumentAlertService {
  constructor(
    @InjectModel(DocumentAlert.name)
    private readonly model: Model<DocumentAlertDocument>,
  ) {}

  // ── Crear alerta (desde app móvil) ───────────────────────────────────────
  async create(dto: {
    enterprise_id: string;
    documentType: string;
    alertStatus: string;
    expiryDate?: string;
    daysOverdue: number;
    cardAuthenticity: string;
    conductorName?: string;
    conductorId?: string;
    driver_id?: string;
    vehiclePlaca?: string;
    vehicle_id?: string;
    categorias?: string[];
    rawText?: string;
    scannedBy?: string;
    scannedByUserId?: string;
  }) {
    return this.model.create({
      enterprise_id: new Types.ObjectId(dto.enterprise_id),
      documentType: dto.documentType,
      alertStatus: dto.alertStatus,
      expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
      daysOverdue: dto.daysOverdue,
      cardAuthenticity: dto.cardAuthenticity,
      conductorName: dto.conductorName ?? '',
      conductorId: dto.conductorId ?? '',
      driver_id: dto.driver_id ? new Types.ObjectId(dto.driver_id) : undefined,
      vehiclePlaca: dto.vehiclePlaca ?? '',
      vehicle_id: dto.vehicle_id ? new Types.ObjectId(dto.vehicle_id) : undefined,
      categorias: dto.categorias ?? [],
      rawText: (dto.rawText ?? '').substring(0, 2000), // cap para no sobrecargar BD
      scannedBy: dto.scannedBy ?? '',
      scannedByUserId: dto.scannedByUserId ?? '',
    });
  }

  // ── Listar alertas de una empresa ────────────────────────────────────────
  async findAll(enterprise_id: string, filters: {
    acknowledged?: boolean;
    documentType?: string;
    alertStatus?: string;
    from?: string;
    to?: string;
    limit?: number;
  } = {}) {
    const query: any = { enterprise_id: new Types.ObjectId(enterprise_id) };

    if (filters.acknowledged !== undefined) query.acknowledged = filters.acknowledged;
    if (filters.documentType) query.documentType = filters.documentType;
    if (filters.alertStatus)  query.alertStatus  = filters.alertStatus;

    if (filters.from || filters.to) {
      query.createdAt = {};
      if (filters.from) query.createdAt.$gte = new Date(filters.from);
      if (filters.to)   query.createdAt.$lte = new Date(filters.to);
    }

    return this.model
      .find(query)
      .sort({ createdAt: -1 })
      .limit(filters.limit ?? 200)
      .lean();
  }

  // ── Conteo de alertas no gestionadas (para badge en topbar) ─────────────
  async countUnread(enterprise_id: string): Promise<number> {
    return this.model.countDocuments({
      enterprise_id: new Types.ObjectId(enterprise_id),
      acknowledged: false,
    });
  }

  // ── Marcar como gestionada ───────────────────────────────────────────────
  async acknowledge(id: string, enterprise_id: string, acknowledgedBy: string) {
    const alert = await this.model.findOneAndUpdate(
      { _id: id, enterprise_id: new Types.ObjectId(enterprise_id) },
      { acknowledged: true, acknowledgedAt: new Date(), acknowledgedBy },
      { new: true },
    );
    if (!alert) throw new NotFoundException('Alerta no encontrada');
    return alert;
  }

  // ── Marcar todas como gestionadas ────────────────────────────────────────
  async acknowledgeAll(enterprise_id: string, acknowledgedBy: string) {
    const result = await this.model.updateMany(
      { enterprise_id: new Types.ObjectId(enterprise_id), acknowledged: false },
      { acknowledged: true, acknowledgedAt: new Date(), acknowledgedBy },
    );
    return { modified: result.modifiedCount };
  }

  // ── Resumen para dashboard ───────────────────────────────────────────────
  async summary(enterprise_id: string) {
    const eid = new Types.ObjectId(enterprise_id);
    const [total, unread, byType, byStatus] = await Promise.all([
      this.model.countDocuments({ enterprise_id: eid }),
      this.model.countDocuments({ enterprise_id: eid, acknowledged: false }),
      this.model.aggregate([
        { $match: { enterprise_id: eid } },
        { $group: { _id: '$documentType', count: { $sum: 1 } } },
      ]),
      this.model.aggregate([
        { $match: { enterprise_id: eid, acknowledged: false } },
        { $group: { _id: '$alertStatus', count: { $sum: 1 } } },
      ]),
    ]);

    return {
      total,
      unread,
      byType: Object.fromEntries(byType.map((r: any) => [r._id, r.count])),
      byStatus: Object.fromEntries(byStatus.map((r: any) => [r._id, r.count])),
    };
  }
}
