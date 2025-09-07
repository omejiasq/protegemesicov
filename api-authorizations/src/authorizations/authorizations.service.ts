// api-authorizations/src/authorizations/authorizations.service.ts
import { Injectable, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery, Types } from 'mongoose';
import { Authorization, AuthorizationDocument } from '../schema/authorizations.schema';
import { ExternalApiService } from '../libs/external-api'; // clase definida en external-api.ts
import { AuditService } from '../libs/audit/audit.service'; // 👈 NUEVO

type AnyObj = Record<string, any>;

@Injectable()
export class AuthorizationService {
  private readonly logger = new Logger(AuthorizationService.name);

  constructor(
    @InjectModel(Authorization.name)
    private readonly model: Model<AuthorizationDocument>,
    private readonly external: ExternalApiService,
    private readonly audit: AuditService, // 👈 NUEVO: inyectamos auditoría
  ) {}

  /** Helper para filtrar por tenant si viene enterprise_id */
  private tenantFilter(user?: { enterprise_id?: string }): AnyObj {
    return user?.enterprise_id ? { enterprise_id: user.enterprise_id } : {};
  }

  /** Crea la autorización local y la registra en SICOV (mantenimiento tipoId=4 + autorización). */
  async create(data: any, user?: { enterprise_id?: string; sub?: string }) {
  // 0) validar y normalizar idDespacho ANTES de crear el doc
  const idDespacho = Number(data?.idDespacho);
  if (!Number.isFinite(idDespacho)) {
    throw new BadRequestException('idDespacho es requerido y debe ser numérico');
  }

  // 1) crear doc local con los campos requeridos por el schema
  const doc = await this.model.create({
    idDespacho,                               // 👈 requerido por el schema
    enterprise_id: user?.enterprise_id,
    createdBy: user?.sub,
    // agrega acá otros campos que tu schema marque como required
    // (por ej. estado: true) si corresponde
  });

  // 2) preparar envío a SICOV
  const item = Array.isArray(data?.autorizacion) ? data.autorizacion[0] : undefined;
  const placa = item?.placa || data?.placa;
  const ctx = { userId: user?.sub, enterpriseId: user?.enterprise_id };

  // 3) si no hay datos mínimos para el externo, auditar local y salir
  if (!placa || !item) {
    await this.audit.log({
      module: 'authorizations',
      operation: 'create.local-only',
      endpoint: 'internal',
      requestPayload: { id: String(doc._id), idDespacho, placa, hasItem: !!item },
      responseStatus: 200,
      responseBody: { reason: 'missing placa or autorizacion[0], external skipped' },
      success: true,
      userId: ctx.userId,
      enterpriseId: ctx.enterpriseId,
    });
    return doc.toJSON();
  }

  // 4) llamadas a la API externa (auditan dentro del ExternalApiService)
  try {
    const baseRes = await this.external.guardarMantenimientoBase(placa, ctx);
    const b = baseRes?.data ?? {};
    const mantenimientoId =
      b?.mantenimientoId ?? b?.id ?? b?.data?.mantenimientoId ?? b?.data?.id ?? null;

    if (mantenimientoId != null) {
      const authRes = await this.external.guardarAutorizacion(Number(mantenimientoId), item, ctx);
      const ar = authRes?.data ?? {};
      const externalId =
        ar?.id ?? ar?.autorizacion?.id ?? ar?.data?.id ?? null;

      if (externalId != null) {
        await this.model.updateOne(
          { _id: doc._id },
          { $set: { mantenimientoId, externalId: Number(externalId) } },
        );
      }
    }
  } catch {
    // no bloquear la operación local si falla el externo; la auditoría ya quedó escrita por el external
  }

  return doc.toJSON();
}

  /** Vista por id, adjuntando datos externos si hay mantenimientoId */
  async view(dto: { id: string }, user?: { enterprise_id?: string }) {
    if (!Types.ObjectId.isValid(dto.id)) throw new NotFoundException('No encontrado');

    const filter: FilterQuery<AuthorizationDocument> = {
      _id: new Types.ObjectId(dto.id),
      ...this.tenantFilter(user),
    };

    const item = await this.model.findOne(filter).lean({ getters: true }) as AnyObj;
    if (!item) throw new NotFoundException('No encontrado');

    if (item.mantenimientoId) {
      try {
        const res = await this.external.visualizarAutorizacion(Number(item.mantenimientoId));
        if (res?.ok) item.externalData = res.data;
      } catch {
        // ignorar fallos externos
      }
    }
    return item;
  }

  /** Update básico local (opcionalmente podés re-enviar a SICOV con otro método del external) */
  async update(dto: { id: string; changes: AnyObj }, user?: { enterprise_id?: string }) {
    if (!Types.ObjectId.isValid(dto.id)) throw new NotFoundException('No encontrado');

    const filter: FilterQuery<AuthorizationDocument> = {
      _id: new Types.ObjectId(dto.id),
      ...this.tenantFilter(user),
    };

    const updated = await this.model
      .findOneAndUpdate(filter, { $set: dto.changes }, { new: true })
      .lean({ getters: true });
    if (!updated) throw new NotFoundException('No encontrado');
    return updated as AnyObj;
  }

  /** Toggle estado local (si existiera un endpoint de toggle externo, podés llamarlo acá) */
  async toggleState(dto: { id: string }, user?: { enterprise_id?: string }) {
    if (!Types.ObjectId.isValid(dto.id)) throw new NotFoundException('No encontrado');

    const filter: FilterQuery<AuthorizationDocument> = {
      _id: new Types.ObjectId(dto.id),
      ...this.tenantFilter(user),
    };

    const current = await this.model.findOne(filter);
    if (!current) throw new NotFoundException('No encontrado');

    current.estado = !current.estado;
    await current.save();

    return current.toJSON();
  }
}
