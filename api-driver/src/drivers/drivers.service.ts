import {
  ConflictException,
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { Driver, DriverDocument } from '../schema/drivers.schema';
import { ExternalApiService } from '../libs/external-api';
import { AuditService } from '../libs/audit/audit.service';

const toIntOrUndef = (v: any): number | undefined => {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : undefined;
};

type UserCtx = { enterprise_id?: string; sub?: string };

@Injectable()
export class DriversService {
  private readonly logger = new Logger(DriversService.name);

  constructor(
    @InjectModel(Driver.name) private readonly model: Model<DriverDocument>,
    private readonly external: ExternalApiService,
    private readonly audit: AuditService,
  ) {}

  private tenant(user?: UserCtx): FilterQuery<DriverDocument> {
    return { enterprise_id: user?.enterprise_id };
  }

  private parseDate(d?: string | Date) {
    if (!d) return undefined;
    const dt = d instanceof Date ? d : new Date(d);
    return isNaN(dt.getTime()) ? undefined : dt;
  }

  /**
   * Valida/completa datos consultando la API integradora.
   * Requiere: numeroIdentificacion1 (doc.numeroIdentificacion) + placa + nit + fechaConsulta.
   * Si falta algo clave, registra auditoría local y omite la llamada externa.
   */
  private async validateWithIntegrator(
    doc: any,
    user?: UserCtx,
    extra?: { placa?: string },
  ) {
    const id1 = doc?.numeroIdentificacion;
    const placa = extra?.placa ?? doc?.placa ?? doc?.vehiculoPlaca;
    const nit = process.env.SICOV_NIT;
    const fechaConsulta = new Date();
    const ctx = { userId: user?.sub, enterpriseId: user?.enterprise_id };

    if (!id1 || !placa || !nit) {
      await this.audit.log({
        module: 'drivers',
        operation: 'integradoraResumen.local-only',
        endpoint: 'internal',
        requestPayload: {
          driverId: String(doc?._id),
          hasNumeroIdentificacion: !!id1,
          hasPlaca: !!placa,
          hasNit: !!nit,
        },
        responseStatus: 200,
        responseBody: { reason: 'missing required fields for integradora; external skipped' },
        success: true,
        userId: ctx.userId,
        enterpriseId: ctx.enterpriseId,
      });
      return;
    }

    try {
      const res = await this.external.integradoraResumen(
        {
          numeroIdentificacion1: id1,
          numeroIdentificacion2: doc.numeroIdentificacionSecundario,
          placa,
          nit,
          fechaConsulta,
        },
        ctx,
      );

      const data: any = res?.data || {};
      const obj = data.obj || data.datos || {};
      const c1 = obj.conductor_1 || obj.conductor1;
      const c2 = obj.conductor_2 || obj.conductor2;
      const patch: any = {};

      if (c1) {
        const alco = c1.alcoholimetria;
        if (alco) {
          if (!doc.idPruebaAlcoholimetria && alco.codigo != null) {
            patch.idPruebaAlcoholimetria = String(alco.codigo);
          }
          if (!doc.resultadoPruebaAlcoholimetria && alco.resultado != null) {
            patch.resultadoPruebaAlcoholimetria = String(alco.resultado);
          }
          if (!doc.fechaUltimaPruebaAlcoholimetria && alco.fecha) {
            const f = new Date(alco.fecha);
            if (!isNaN(f.getTime())) patch.fechaUltimaPruebaAlcoholimetria = f;
          }
        }
        const exam = c1.examen_medico || c1.examenMedico;
        if (exam) {
          if (!doc.idExamenMedico && exam.codigo != null) {
            patch.idExamenMedico = String(exam.codigo);
          }
          if (!doc.fechaUltimoExamenMedico && exam.fecha) {
            const f = new Date(exam.fecha);
            if (!isNaN(f.getTime())) patch.fechaUltimoExamenMedico = f;
          }
        }
        const lic = c1.licencia;
        if (lic) {
          if (!doc.licenciaConduccion && lic.numero != null) {
            patch.licenciaConduccion = String(lic.numero);
          }
          if (!doc.licenciaVencimiento && lic.fecha_vencimiento) {
            const fv = new Date(lic.fecha_vencimiento);
            if (!isNaN(fv.getTime())) patch.licenciaVencimiento = fv;
          }
        }
      }

      if (c2) {
        const alco2 = c2.alcoholimetria;
        if (alco2) {
          if (!doc.idPruebaAlcoholimetriaSecundario && alco2.codigo != null) {
            patch.idPruebaAlcoholimetriaSecundario = String(alco2.codigo);
          }
          if (!doc.resultadoPruebaAlcoholimetriaSecundario && alco2.resultado != null) {
            patch.resultadoPruebaAlcoholimetriaSecundario = String(alco2.resultado);
          }
          if (!doc.fechaUltimaPruebaAlcoholimetriaSecundario && alco2.fecha) {
            const f2 = new Date(alco2.fecha);
            if (!isNaN(f2.getTime())) patch.fechaUltimaPruebaAlcoholimetriaSecundario = f2;
          }
        }
        const exam2 = c2.examen_medico || c2.examenMedico;
        if (exam2) {
          if (!doc.idExamenMedicoSecundario && exam2.codigo != null) {
            patch.idExamenMedicoSecundario = String(exam2.codigo);
          }
          if (!doc.fechaUltimoExamenMedicoSecundario && exam2.fecha) {
            const f2 = new Date(exam2.fecha);
            if (!isNaN(f2.getTime())) patch.fechaUltimoExamenMedicoSecundario = f2;
          }
        }
        const lic2 = c2.licencia;
        if (lic2) {
          if (!doc.licenciaConduccionSecundario && lic2.numero != null) {
            patch.licenciaConduccionSecundario = String(lic2.numero);
          }
        }
      }

      if (Object.keys(patch).length > 0) {
        await this.model.updateOne({ _id: doc._id }, { $set: patch });
      }
    } catch {
      // fallos externos no rompen el flujo (la auditoría ya queda en external)
    }
  }

  // ------- CRUD -------

  async create(body: any, user?: UserCtx) {
    const idDesp = toIntOrUndef(body.idDespacho);

    const dupFilter: any = {
      ...this.tenant(user),
      numeroIdentificacion: String(body.numeroIdentificacion),
    };
    if (idDesp !== undefined) {
      dupFilter.idDespacho = idDesp;
    } else {
      dupFilter.$or = [{ idDespacho: { $exists: false } }, { idDespacho: null }];
    }

    const dup = await this.model.exists(dupFilter);
    if (dup) {
      throw new ConflictException(
        idDesp !== undefined
          ? 'Ya existe un conductor con ese documento para este despacho'
          : 'Ya existe un conductor con ese documento sin despacho asignado',
      );
    }

    const doc = await this.model.create({
      enterprise_id: user?.enterprise_id,
      createdBy: user?.sub,
      estado: true,
      ...(idDesp !== undefined ? { idDespacho: idDesp } : {}),
      tipoIdentificacionPrincipal: String(body.tipoIdentificacionPrincipal),
      numeroIdentificacion: String(body.numeroIdentificacion),
      primerNombrePrincipal: String(body.primerNombrePrincipal),
      segundoNombrePrincipal: body.segundoNombrePrincipal,
      primerApellidoPrincipal: String(body.primerApellidoPrincipal),
      segundoApellidoPrincipal: body.segundoApellidoSecundario,
      tipoIdentificacionSecundario: body.tipoIdentificacionSecundario,
      numeroIdentificacionSecundario: body.numeroIdentificacionSecundario,
      primerNombreSecundario: body.primerNombreSecundario,
      segundoNombreSecundario: body.segundoNombreSecundario,
      primerApellidoSecundario: body.primerApellidoSecundario,
      segundoApellidoSecundario: body.segundoApellidoSecundario,
      idPruebaAlcoholimetria: body.idPruebaAlcoholimetria,
      resultadoPruebaAlcoholimetria: body.resultadoPruebaAlcoholimetria,
      fechaUltimaPruebaAlcoholimetria: this.parseDate(body.fechaUltimaPruebaAlcoholimetria),
      idExamenMedico: body.idExamenMedico,
      fechaUltimoExamenMedico: this.parseDate(body.fechaUltimoExamenMedico),
      idPruebaAlcoholimetriaSecundario: body.idPruebaAlcoholimetriaSecundario,
      resultadoPruebaAlcoholimetriaSecundario: body.resultadoPruebaAlcoholimetriaSecundario,
      fechaUltimaPruebaAlcoholimetriaSecundario: this.parseDate(body.fechaUltimaPruebaAlcoholimetriaSecundario),
      idExamenMedicoSecundario: body.idExamenMedicoSecundario,
      fechaUltimoExamenMedicoSecundario: this.parseDate(body.fechaUltimoExamenMedicoSecundario),
      licenciaConduccion: body.licenciaConduccion,
      licenciaVencimiento: this.parseDate(body.licenciaVencimiento),
      licenciaConduccionSecundario: body.licenciaConduccionSecundario,
      observaciones: body.observaciones,
    });

    // Validación/completado con API integradora (NO bloqueante) + auditoría
    this.validateWithIntegrator(doc.toJSON(), user, { placa: body?.placa }).catch(() => {});
    return doc.toJSON();
  }

  async getAll(q: any, user?: UserCtx) {
    const page = Math.max(1, Number(q.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(q.numero_items) || 10));
    const skip = (page - 1) * limit;

    const filter: FilterQuery<DriverDocument> = { ...this.tenant(user) };
    const idD = toIntOrUndef(q.idDespacho);
    if (idD !== undefined) filter.idDespacho = idD;

    if (q?.q && String(q.q).trim()) {
      const term = String(q.q).trim();
      const rx = new RegExp(term, 'i');
      filter.$or = [
        { numeroIdentificacion: { $regex: rx } },
        { primerNombrePrincipal: { $regex: rx } },
        { segundoNombrePrincipal: { $regex: rx } },
        { primerApellidoPrincipal: { $regex: rx } },
        { segundoApellidoPrincipal: { $regex: rx } },
      ];
    } else if (q?.numeroIdentificacion) {
      filter.numeroIdentificacion = { $regex: q.numeroIdentificacion, $options: 'i' };
    }

    if (q.estado != null)
      filter.estado = q.estado === 'true' || q.estado === true;

    const [items, total] = await Promise.all([
      this.model.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      this.model.countDocuments(filter),
    ]);

    return { page, numero_items: limit, total, items };
  }

  async getById(id: string, user?: UserCtx) {
    if (!Types.ObjectId.isValid(id))
      throw new NotFoundException('Conductor no encontrado');
    const item = await this.model
      .findOne({ _id: new Types.ObjectId(id), ...this.tenant(user) })
      .lean();
    if (!item) throw new NotFoundException('Conductor no encontrado');
    return item;
  }

  async updateById(id: string, body: any, user?: UserCtx) {
    if (!Types.ObjectId.isValid(id))
      throw new NotFoundException('Conductor no encontrado');

    if (body.numeroIdentificacion !== undefined || body.idDespacho !== undefined) {
      const current = await this.model
        .findById(id)
        .select('idDespacho numeroIdentificacion')
        .lean();
      const idForDup = toIntOrUndef(body.idDespacho);
      const numeroForDup = String(body.numeroIdentificacion ?? current?.numeroIdentificacion);
      const dup = await this.model.exists({
        _id: { $ne: new Types.ObjectId(id) },
        ...this.tenant(user),
        ...(idForDup !== undefined ? { idDespacho: idForDup } : { idDespacho: current?.idDespacho }),
        numeroIdentificacion: numeroForDup,
      });
      if (dup)
        throw new ConflictException('Ya existe un conductor con ese documento para este despacho');
    }

    const update: any = {};
    { const idUpd = toIntOrUndef(body.idDespacho); if (idUpd !== undefined) update.idDespacho = idUpd; }
    if (body.tipoIdentificacionPrincipal != null) update.tipoIdentificacionPrincipal = String(body.tipoIdentificacionPrincipal);
    if (body.numeroIdentificacion != null) update.numeroIdentificacion = String(body.numeroIdentificacion);
    if (body.primerNombrePrincipal != null) update.primerNombrePrincipal = String(body.primerNombrePrincipal);
    if (body.segundoNombrePrincipal != null) update.segundoNombrePrincipal = body.segundoNombrePrincipal;
    if (body.primerApellidoPrincipal != null) update.primerApellidoPrincipal = String(body.primerApellidoPrincipal);
    if (body.segundoApellidoPrincipal != null) update.segundoApellidoPrincipal = body.segundoApellidoPrincipal;

    if (body.tipoIdentificacionSecundario != null) update.tipoIdentificacionSecundario = String(body.tipoIdentificacionSecundario);
    if (body.numeroIdentificacionSecundario != null) update.numeroIdentificacionSecundario = String(body.numeroIdentificacionSecundario);
    if (body.primerNombreSecundario != null) update.primerNombreSecundario = String(body.primerNombreSecundario);
    if (body.segundoNombreSecundario != null) update.segundoNombreSecundario = body.segundoNombreSecundario;
    if (body.primerApellidoSecundario != null) update.primerApellidoSecundario = String(body.primerApellidoSecundario);
    if (body.segundoApellidoSecundario != null) update.segundoApellidoSecundario = String(body.segundoApellidoSecundario);

    if (body.idPruebaAlcoholimetria != null) update.idPruebaAlcoholimetria = String(body.idPruebaAlcoholimetria);
    if (body.resultadoPruebaAlcoholimetria != null) update.resultadoPruebaAlcoholimetria = String(body.resultadoPruebaAlcoholimetria);
    if (body.fechaUltimaPruebaAlcoholimetria != null) update.fechaUltimaPruebaAlcoholimetria = this.parseDate(body.fechaUltimaPruebaAlcoholimetria);
    if (body.idExamenMedico != null) update.idExamenMedico = String(body.idExamenMedico);
    if (body.fechaUltimoExamenMedico != null) update.fechaUltimoExamenMedico = this.parseDate(body.fechaUltimoExamenMedico);

    if (body.idPruebaAlcoholimetriaSecundario != null) update.idPruebaAlcoholimetriaSecundario = String(body.idPruebaAlcoholimetriaSecundario);
    if (body.resultadoPruebaAlcoholimetriaSecundario != null) update.resultadoPruebaAlcoholimetriaSecundario = String(body.resultadoPruebaAlcoholimetriaSecundario);
    if (body.fechaUltimaPruebaAlcoholimetriaSecundario != null) update.fechaUltimaPruebaAlcoholimetriaSecundario = this.parseDate(body.fechaUltimaPruebaAlcoholimetriaSecundario);
    if (body.idExamenMedicoSecundario != null) update.idExamenMedicoSecundario = String(body.idExamenMedicoSecundario);
    if (body.fechaUltimoExamenMedicoSecundario != null) update.fechaUltimoExamenMedicoSecundario = this.parseDate(body.fechaUltimoExamenMedicoSecundario);

    if (body.licenciaConduccion != null) update.licenciaConduccion = String(body.licenciaConduccion);
    if (body.licenciaVencimiento != null) update.licenciaVencimiento = this.parseDate(body.licenciaVencimiento);
    if (body.licenciaConduccionSecundario != null) update.licenciaConduccionSecundario = String(body.licenciaConduccionSecundario);

    if (body.observaciones != null) update.observaciones = String(body.observaciones);

    const updated = await this.model
      .findOneAndUpdate({ _id: new Types.ObjectId(id), ...this.tenant(user) }, { $set: update }, { new: true })
      .lean();
    if (!updated) throw new NotFoundException('Conductor no encontrado');

    this.validateWithIntegrator(updated, user, { placa: body?.placa }).catch(() => {});
    return updated;
  }

  async toggleState(id: string, user?: UserCtx) {
    if (!Types.ObjectId.isValid(id))
      throw new NotFoundException('Conductor no encontrado');
    const current = await this.model.findOne({ _id: new Types.ObjectId(id), ...this.tenant(user) });
    if (!current) throw new NotFoundException('Conductor no encontrado');

    current.estado = !current.estado;
    await current.save();
    return { _id: current._id, estado: current.estado };
  }
}
