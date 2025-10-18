// api-authorizations/src/authorizations/authorizations.service.ts
import {
  Injectable,
  NotFoundException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery, Types } from 'mongoose';
import {
  Authorization,
  AuthorizationDocument,
} from '../schema/authorizations.schema';
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

  private mapItemToExternal(it: any, mantenimientoId: number) {
    const toStr = (v: any) => (v == null ? '' : String(v).trim());
    const toNum = (v: any) => (v == null || v === '' ? undefined : Number(v));

    return {
      // clave del endpoint
      mantenimientoId: Number(mantenimientoId),

      // viaje
      fechaViaje: it.fechaViaje,
      origen: toStr(it.origen), // la externa lo trata como string (código)
      destino: toStr(it.destino), // idem

      // NNA
      tipoIdentificacionNna: toNum(it.tipoIdentificacionNna),
      numeroIdentificacionNna: toStr(it.numeroIdentificacionNna),
      nombresApellidosNna: it.nombresApellidosNna,
      situacionDiscapacidad: toStr(it.situacionDiscapacidad), // "SI" | "NO"
      tipoDiscapacidad: toNum(it.tipoDiscapacidad), // number requerido por tu schema
      perteneceComunidadEtnica: toStr(it.perteneceComunidadEtnica), // "SI" | "NO"
      tipoPoblacionEtnica: toNum(it.tipoPoblacionEtnica), // number requerido por tu schema

      // Otorgante
      tipoIdentificacionOtorgante: toNum(it.tipoIdentificacionOtorgante),
      numeroIdentificacionOtorgante: toStr(it.numeroIdentificacionOtorgante),
      nombresApellidosOtorgante: it.nombresApellidosOtorgante,
      numeroTelefonicoOtorgante: toStr(it.numeroTelefonicoOtorgante),
      correoElectronicoOtorgante: it.correoElectronicoOtorgante,
      direccionFisicaOtorgante: it.direccionFisicaOtorgante,
      sexoOtorgante: toNum(it.sexoOtorgante),
      generoOtorgante: toNum(it.generoOtorgante),
      // 🔴 nombre que espera la externa (tu schema lo guarda como 'calidadActual')
      calidadActua: toNum(it.calidadActua),

      // Autorizado a viajar
      tipoIdentificacionAutorizadoViajar: toNum(
        it.tipoIdentificacionAutorizadoViajar,
      ),
      numeroIdentificacionAutorizadoViajar: toStr(
        it.numeroIdentificacionAutorizadoViajar,
      ),
      nombresApellidosAutorizadoViajar: it.nombresApellidosAutorizadoViajar,
      numeroTelefonicoAutorizadoViajar: toStr(
        it.numeroTelefonicoAutorizadoViajar,
      ),
      direccionFisicaAutorizadoViajar: it.direccionFisicaAutorizadoViajar,

      // Autorizado a recoger
      tipoIdentificacionAutorizadoRecoger: toNum(
        it.tipoIdentificacionAutorizadoRecoger,
      ),
      numeroIdentificacionAutorizadoRecoger: toStr(
        it.numeroIdentificacionAutorizadoRecoger,
      ),
      nombresApellidosAutorizadoRecoger: it.nombresApellidosAutorizadoRecoger,
      numeroTelefonicoAutorizadoRecoger: toStr(
        it.numeroTelefonicoAutorizadoRecoger,
      ),
      direccionFisicaAutorizadoRecoger: it.direccionFisicaAutorizadoRecoger,

      // Archivos
      copiaAutorizacionViajeNombreOriginal:
        it.copiaAutorizacionViajeNombreOriginal,
      copiaAutorizacionViajeDocumento: it.copiaAutorizacionViajeDocumento,
      copiaAutorizacionViajeRuta: it.copiaAutorizacionViajeRuta,

      copiaDocumentoParentescoNombreOriginal:
        it.copiaDocumentoParentescoNombreOriginal,
      copiaDocumentoParentescoDocumento: it.copiaDocumentoParentescoDocumento,
      copiaDocumentoParentescoRuta: it.copiaDocumentoParentescoRuta,

      copiaDocumentoIdentidadAutorizadoNombreOriginal:
        it.copiaDocumentoIdentidadAutorizadoNombreOriginal,
      copiaDocumentoIdentidadAutorizadoDocumento:
        it.copiaDocumentoIdentidadAutorizadoDocumento,
      copiaDocumentoIdentidadAutorizadoRuta:
        it.copiaDocumentoIdentidadAutorizadoRuta,

      copiaConstanciaEntregaNombreOriginal:
        it.copiaConstanciaEntregaNombreOriginal,
      copiaConstanciaEntregaDocumento: it.copiaConstanciaEntregaDocumento,
      copiaConstanciaEntregaRuta: it.copiaConstanciaEntregaRuta,
    };
  }

  /** Helper para filtrar por tenant si viene enterprise_id */
  private tenantFilter(user?: { enterprise_id?: string }): AnyObj {
    return user?.enterprise_id ? { enterprise_id: user.enterprise_id } : {};
  }

  /** Crea la autorización local y la registra en SICOV (mantenimiento tipoId=4 + autorización). */
  async create(
    data: any,
    user?: {
      enterprise_id?: string;
      sub?: string;
      vigiladoId: string;
      vigiladoToken: string;
    },
  ) {
    // 0) validar y normalizar idDespacho ANTES de crear el doc
    const idDespacho = Number(data?.idDespacho);
    if (!Number.isFinite(idDespacho)) {
      throw new BadRequestException(
        'idDespacho es requerido y debe ser numérico',
      );
    }

    // ✨ NUEVO: normalizar autorizacion[] y placa
    const asSiNo = (v: any) =>
      String(v).trim().toUpperCase() === 'SI' ? 'SI' : 'NO';

    const toNum = (v: any) => {
      const n = Number(v);
      if (Number.isNaN(n))
        throw new BadRequestException('Código numérico inválido');
      return n;
    };

    const autorizacionArr = Array.isArray(data?.autorizacion)
      ? data.autorizacion
          .filter((x) => x && typeof x === 'object')
          .map((x) => ({
            ...x,
            situacionDiscapacidad: asSiNo(x.situacionDiscapacidad),
            perteneceComunidadEtnica: asSiNo(x.perteneceComunidadEtnica),
            tipoDiscapacidad: toNum(x.tipoDiscapacidad),
            tipoPoblacionEtnica: toNum(x.tipoPoblacionEtnica),
          }))
      : [];

    // 1) crear doc local con los campos requeridos por el schema

    // 2) preparar envío a SICOV

    const item = autorizacionArr[0]; // tu flujo usa el primero
    const placa =
      (item?.placa || data?.placa || '').toString().trim().toUpperCase() ||
      undefined;
    const ctx = {
      userId: user?.sub,
      enterpriseId: user?.enterprise_id,
      vigiladoId: user?.vigiladoId ? String(user.vigiladoId) : undefined,
      vigiladoToken: user?.vigiladoToken,
    };

    const doc = await this.model.create({
      idDespacho,
      placa,
      autorizacion: autorizacionArr, // ← ahora NO queda vacío
      enterprise_id: user?.enterprise_id,
      createdBy: user?.sub,
      estado: true, // si tu schema lo tiene por defecto, igual no molesta
    });

    // 4) llamadas a la API externa (auditan dentro del ExternalApiService)
    try {
      // --- guardar mantenimiento base (tipo 4) ---
      const baseRes = await this.external.guardarMantenimientoBase({
        placa,
        vigiladoId: ctx.vigiladoId,
        vigiladoToken: ctx.vigiladoToken,
      });

      let mantenimientoId: number | null = null;
      if (baseRes && 'data' in baseRes) {
        // ← narrowing
        const b: any = baseRes.data;
        const mid =
          b?.mantenimientoId ??
          b?.id ??
          b?.data?.mantenimientoId ??
          b?.data?.id;
        if (mid != null && !Number.isNaN(Number(mid))) {
          mantenimientoId = Number(mid);
        }
      }

      if (mantenimientoId != null) {
        // --- guardar autorización ---
        const item = autorizacionArr[0];

        // 👇 mapeamos EXACTO lo que espera la API externa
        const payloadExterno = this.mapItemToExternal(item, mantenimientoId);
        console.log('%capi-authorizations\src\authorizations\authorizations.service.ts:214 mantenimientoId', 'color: #007acc;', mantenimientoId);
        // 👇 ctx viene de tu JWT (vigiladoId/vigiladoToken incluidos) — no toques eso
        const authRes = await this.external.guardarAutorizacion({
          mantenimientoId,
          item: payloadExterno, // 🔴 ahora sí va el shape correcto
          vigiladoId: ctx.vigiladoId,
          vigiladoToken: ctx.vigiladoToken,
        });

        if (authRes && 'data' in authRes) {
          // ← narrowing
          const ar: any = authRes.data;
          const externalId =
            ar?.id ?? ar?.autorizacion?.id ?? ar?.data?.id ?? null;

          if (externalId != null && !Number.isNaN(Number(externalId))) {
            await this.model.updateOne(
              { _id: doc._id },
              { $set: { mantenimientoId, externalId: Number(externalId) } },
            );
          }
        }
      }
    } catch {
      // ignora fallo externo; audita el ExternalApiService
    }

    return doc.toJSON();
  }

  /** Vista por id, adjuntando datos externos si hay mantenimientoId */
  async view(dto: { id: string }, user?: { enterprise_id?: string }) {
    if (!Types.ObjectId.isValid(dto.id))
      throw new NotFoundException('No encontrado');

    const filter: FilterQuery<AuthorizationDocument> = {
      _id: new Types.ObjectId(dto.id),
      ...this.tenantFilter(user),
    };

    const item = (await this.model
      .findOne(filter)
      .lean({ getters: true })) as AnyObj;
    if (!item) throw new NotFoundException('No encontrado');

    if (item.mantenimientoId) {
      try {
        const res = await this.external.visualizarAutorizacion(
          item.mantenimientoId,
        );
        if (res?.ok) item.externalData = res.data;
      } catch {
        // ignorar fallos externos
      }
    }
    return item;
  }

  /** Update básico local (opcionalmente podés re-enviar a SICOV con otro método del external) */
  async update(
    dto: { id: string; changes: AnyObj },
    user?: { enterprise_id?: string },
  ) {
    if (!Types.ObjectId.isValid(dto.id))
      throw new NotFoundException('No encontrado');

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
    if (!Types.ObjectId.isValid(dto.id))
      throw new NotFoundException('No encontrado');

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

  async list(
    query: { page?: any; limit?: any; idDespacho?: any; plate?: string },
    user?: { enterprise_id?: string },
  ) {
    const page = Math.max(1, Number(query?.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query?.limit) || 20));
    const skip = (page - 1) * limit;

    const filter: any = { ...this.tenantFilter(user) };

    // filtros opcionales
    const idDespachoNum = Number(query?.idDespacho);
    if (Number.isFinite(idDespachoNum)) filter.idDespacho = idDespachoNum;

    const plate = (query?.plate || '').trim();
    if (plate) {
      const rx = new RegExp(plate.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      // soporta placa en raíz o dentro de autorizacion[].placa
      filter.$or = [{ placa: rx }, { 'autorizacion.placa': rx }];
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

    return { items, page, limit, total };
  }
}
