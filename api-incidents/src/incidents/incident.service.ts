import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { Incident, IncidentDocument } from '../schema/incidents.schema';
import { IncidentsExternalApiService } from '../libs/external-api';

type AnyObj = Record<string, any>;

@Injectable()
export class IncidentsService {
  constructor(
    @InjectModel(Incident.name)
    private readonly model: Model<IncidentDocument>,
    private readonly external: IncidentsExternalApiService,
  ) {}

  private tenantFilter(user?: { enterprise_id?: string }): AnyObj {
    return user?.enterprise_id ? { enterprise_id: user.enterprise_id } : {};
  }

  /** Utilitario defensivo para leer flags ok/status */
  private isOk(r: any) {
    return typeof r?.ok === 'boolean' ? r.ok : (typeof r?.status === 'number' && r.status >= 200 && r.status < 300);
  }

  /** Crea incidente local (y lo envía a SICOV; genera auditoría en el externo) */
  async create(data: {
    idDespacho: number;
    tipoNovedadId: 1 | 2;
    descripcion: string;
    otros?: string;
    enterprise_id?: string;
    createdBy?: string;
  }) {
    const doc = await this.model.create({
      idDespacho: data.idDespacho,
      tipoNovedadId: data.tipoNovedadId,
      descripcion: data.descripcion,
      otros: data.otros,
      enterprise_id: data.enterprise_id,
      createdBy: data.createdBy,
      estado: true,
    });

    // Esta llamada dispara el audit (el external lo hace en su `request(...).finally`)
    try {
      const res = await this.external.crearNovedad(
        {
          idDespacho: doc.idDespacho,
          tipoNovedadId: doc.tipoNovedadId,
          descripcion: doc.descripcion,
          otros: doc.otros,
        },
        { userId: doc.createdBy, enterpriseId: doc.enterprise_id }, // ctx -> queda en audits
      );

      // (Opcional) guardar externalId si el backend lo devuelve
      const d = res?.data ?? {};
      const externalId = this.isOk(res)
        ? (d?.id ?? d?.novedad?.id ?? d?.data?.id ?? null)
        : null;

      if (externalId != null) {
        await this.model.updateOne({ _id: doc._id }, { $set: { externalId: Number(externalId) } });
      }
    } catch {
      // no bloquear la operación local si falla el externo
    }

    return doc.toJSON();
  }

  /** Lista con paginación y filtros (match con tu ListQueryDto) */
  async list(
    q: {
      page?: number;
      numero_items?: number;
      find?: string;
      idDespacho?: number;
      estado?: boolean;
    },
    user?: { enterprise_id?: string },
  ) {
    const page = Math.max(1, Number(q?.page ?? 1));
    const limit = Math.max(1, Number(q?.numero_items ?? 10));
    const skip = (page - 1) * limit;

    const filter: FilterQuery<IncidentDocument> = {
      ...this.tenantFilter(user),
    };

    if (typeof q?.idDespacho === 'number') filter.idDespacho = q.idDespacho;
    if (typeof q?.estado === 'boolean') filter.estado = q.estado;
    if (q?.find) {
      const rx = new RegExp(q.find, 'i');
      filter.$or = [{ descripcion: rx }, { otros: rx }];
    }

    const [items, total] = await Promise.all([
      this.model
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean({ getters: true }),
      this.model.countDocuments(filter),
    ]);

    return { items, total, page, numero_items: limit };
  }

  /** Obtiene por id */
  async getById(id: string) {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('No encontrado');
    const doc = await this.model.findById(id).lean({ getters: true });
    if (!doc) throw new NotFoundException('No encontrado');
    return doc;
  }

  /** Actualiza por id (solo campos permitidos) */
  async update(id: string, dto: Partial<{ descripcion: string; otros: string; tipoNovedadId: 1 | 2; estado: boolean }>) {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('No encontrado');

    const updatable: AnyObj = {};
    if (typeof dto.descripcion === 'string') updatable.descripcion = dto.descripcion;
    if (typeof dto.otros === 'string') updatable.otros = dto.otros;
    if (dto.tipoNovedadId === 1 || dto.tipoNovedadId === 2) updatable.tipoNovedadId = dto.tipoNovedadId;
    if (typeof dto.estado === 'boolean') updatable.estado = dto.estado;

    const doc = await this.model
      .findOneAndUpdate({ _id: new Types.ObjectId(id) }, { $set: updatable }, { new: true })
      .lean({ getters: true });

    if (!doc) throw new NotFoundException('No encontrado');

    // (Opcional) sincronizar con SICOV usando external.actualizarNovedad(...)
    return doc;
  }

  /** Cambia estado booleano */
  async toggleState(id: string) {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('No encontrado');

    const doc = await this.model.findById(id);
    if (!doc) throw new NotFoundException('No encontrado');

    doc.estado = !doc.estado;
    await doc.save();

    // (Opcional) external.toggleNovedad(doc.externalId)
    return doc.toJSON();
  }
}