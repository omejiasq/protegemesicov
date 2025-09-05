import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { Driver, DriverDocument } from '../schema/drivers.schema';

const toIntOrUndef = (v: any): number | undefined => {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : undefined;
};

type UserCtx = { enterprise_id?: string; sub?: string };

@Injectable()
export class DriversService {
  constructor(
    @InjectModel(Driver.name) private readonly model: Model<DriverDocument>,
  ) {}

  private tenant(user?: UserCtx): FilterQuery<DriverDocument> {
    return { enterprise_id: user?.enterprise_id };
  }

  private parseDate(d?: string | Date) {
    if (!d) return undefined;
    const dt = d instanceof Date ? d : new Date(d);
    return isNaN(dt.getTime()) ? undefined : dt;
  }

  async create(body: any, user?: UserCtx) {
    const idDesp = toIntOrUndef(body.idDespacho);

    const dupFilter: any = {
      ...this.tenant(user),
      numeroIdentificacion: String(body.numeroIdentificacion),
    };
    if (idDesp !== undefined) {
      dupFilter.idDespacho = idDesp;
    } else {
      dupFilter.$or = [
        { idDespacho: { $exists: false } },
        { idDespacho: null },
      ];
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

      // Principales
      tipoIdentificacionPrincipal: String(body.tipoIdentificacionPrincipal),
      numeroIdentificacion: String(body.numeroIdentificacion),
      primerNombrePrincipal: String(body.primerNombrePrincipal),
      segundoNombrePrincipal: body.segundoNombrePrincipal,
      primerApellidoPrincipal: String(body.primerApellidoPrincipal),
      segundoApellidoPrincipal: body.segundoApellidoPrincipal,

      // Secundarios
      tipoIdentificacionSecundario: body.tipoIdentificacionSecundario,
      numeroIdentificacionSecundario: body.numeroIdentificacionSecundario,
      primerNombreSecundario: body.primerNombreSecundario,
      segundoNombreSecundario: body.segundoNombreSecundario,
      primerApellidoSecundario: body.primerApellidoSecundario,
      segundoApellidoSecundario: body.segundoApellidoSecundario,

      // Alcoholimetría / Examen médico
      idPruebaAlcoholimetria: body.idPruebaAlcoholimetria,
      resultadoPruebaAlcoholimetria: body.resultadoPruebaAlcoholimetria,
      fechaUltimaPruebaAlcoholimetria: this.parseDate(
        body.fechaUltimaPruebaAlcoholimetria,
      ),
      idExamenMedico: body.idExamenMedico,
      fechaUltimoExamenMedico: this.parseDate(body.fechaUltimoExamenMedico),

      idPruebaAlcoholimetriaSecundario: body.idPruebaAlcoholimetriaSecundario,
      resultadoPruebaAlcoholimetriaSecundario:
        body.resultadoPruebaAlcoholimetriaSecundario,
      fechaUltimaPruebaAlcoholimetriaSecundario: this.parseDate(
        body.fechaUltimaPruebaAlcoholimetriaSecundario,
      ),
      idExamenMedicoSecundario: body.idExamenMedicoSecundario,
      fechaUltimoExamenMedicoSecundario: this.parseDate(
        body.fechaUltimoExamenMedicoSecundario,
      ),

      // Licencia (¡incluye vencimiento!)
      licenciaConduccion: body.licenciaConduccion,
      licenciaVencimiento: this.parseDate(body.licenciaVencimiento),
      licenciaConduccionSecundario: body.licenciaConduccionSecundario,

      observaciones: body.observaciones,
    });

    return doc.toJSON();
  }

  async getAll(q: any, user?: UserCtx) {
    const page = Math.max(1, Number(q.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(q.numero_items) || 10));
    const skip = (page - 1) * limit;

    const filter: FilterQuery<DriverDocument> = { ...this.tenant(user) };

    const idD = toIntOrUndef(q.idDespacho);
    if (idD !== undefined) filter.idDespacho = idD;

    // --- BÚSQUEDA ---
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
      filter.numeroIdentificacion = {
        $regex: q.numeroIdentificacion,
        $options: 'i',
      };
    }

    if (q.estado != null) {
      filter.estado = q.estado === 'true' || q.estado === true;
    }

    if (q.estado != null)
      filter.estado = q.estado === 'true' || q.estado === true;

    const [items, total] = await Promise.all([
      this.model
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
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

    if (
      body.numeroIdentificacion !== undefined ||
      body.idDespacho !== undefined
    ) {
      const current = await this.model
        .findById(id)
        .select('idDespacho numeroIdentificacion')
        .lean();

      const idForDup = toIntOrUndef(body.idDespacho);
      const numeroForDup = String(
        body.numeroIdentificacion ?? current?.numeroIdentificacion,
      );

      const dup = await this.model.exists({
        _id: { $ne: new Types.ObjectId(id) },
        ...this.tenant(user),
        ...(idForDup !== undefined
          ? { idDespacho: idForDup }
          : { idDespacho: current?.idDespacho }),
        numeroIdentificacion: numeroForDup,
      });

      if (dup)
        throw new ConflictException(
          'Ya existe un conductor con ese documento para este despacho',
        );
    }

    const update: any = {};

    {
      const idUpd = toIntOrUndef(body.idDespacho);
      if (idUpd !== undefined) update.idDespacho = idUpd;
    }

    if (body.tipoIdentificacionPrincipal != null)
      update.tipoIdentificacionPrincipal = String(
        body.tipoIdentificacionPrincipal,
      );
    if (body.numeroIdentificacion != null)
      update.numeroIdentificacion = String(body.numeroIdentificacion);
    if (body.primerNombrePrincipal != null)
      update.primerNombrePrincipal = String(body.primerNombrePrincipal);
    if (body.segundoNombrePrincipal != null)
      update.segundoNombrePrincipal = body.segundoNombrePrincipal;
    if (body.primerApellidoPrincipal != null)
      update.primerApellidoPrincipal = String(body.primerApellidoPrincipal);
    if (body.segundoApellidoPrincipal != null)
      update.segundoApellidoPrincipal = body.segundoApellidoPrincipal;

    if (body.tipoIdentificacionSecundario != null)
      update.tipoIdentificacionSecundario = String(
        body.tipoIdentificacionSecundario,
      );
    if (body.numeroIdentificacionSecundario != null)
      update.numeroIdentificacionSecundario = String(
        body.numeroIdentificacionSecundario,
      );
    if (body.primerNombreSecundario != null)
      update.primerNombreSecundario = String(body.primerNombreSecundario);
    if (body.segundoNombreSecundario != null)
      update.segundoNombreSecundario = body.segundoNombreSecundario;
    if (body.primerApellidoSecundario != null)
      update.primerApellidoSecundario = String(body.primerApellidoSecundario);
    if (body.segundoApellidoSecundario != null)
      update.segundoApellidoSecundario = String(body.segundoApellidoSecundario);

    if (body.idPruebaAlcoholimetria != null)
      update.idPruebaAlcoholimetria = String(body.idPruebaAlcoholimetria);
    if (body.resultadoPruebaAlcoholimetria != null)
      update.resultadoPruebaAlcoholimetria = String(
        body.resultadoPruebaAlcoholimetria,
      );
    if (body.fechaUltimaPruebaAlcoholimetria != null)
      update.fechaUltimaPruebaAlcoholimetria = this.parseDate(
        body.fechaUltimaPruebaAlcoholimetria,
      );
    if (body.idExamenMedico != null)
      update.idExamenMedico = String(body.idExamenMedico);
    if (body.fechaUltimoExamenMedico != null)
      update.fechaUltimoExamenMedico = this.parseDate(
        body.fechaUltimoExamenMedico,
      );

    if (body.idPruebaAlcoholimetriaSecundario != null)
      update.idPruebaAlcoholimetriaSecundario = String(
        body.idPruebaAlcoholimetriaSecundario,
      );
    if (body.resultadoPruebaAlcoholimetriaSecundario != null)
      update.resultadoPruebaAlcoholimetriaSecundario = String(
        body.resultadoPruebaAlcoholimetriaSecundario,
      );
    if (body.fechaUltimaPruebaAlcoholimetriaSecundario != null)
      update.fechaUltimaPruebaAlcoholimetriaSecundario = this.parseDate(
        body.fechaUltimaPruebaAlcoholimetriaSecundario,
      );
    if (body.idExamenMedicoSecundario != null)
      update.idExamenMedicoSecundario = String(body.idExamenMedicoSecundario);
    if (body.fechaUltimoExamenMedicoSecundario != null)
      update.fechaUltimoExamenMedicoSecundario = this.parseDate(
        body.fechaUltimoExamenMedicoSecundario,
      );

    if (body.licenciaConduccion != null)
      update.licenciaConduccion = String(body.licenciaConduccion);
    if (body.licenciaVencimiento != null)
      update.licenciaVencimiento = this.parseDate(body.licenciaVencimiento);
    if (body.licenciaConduccionSecundario != null)
      update.licenciaConduccionSecundario = String(
        body.licenciaConduccionSecundario,
      );

    // Otros
    if (body.observaciones != null)
      update.observaciones = String(body.observaciones);

    const updated = await this.model
      .findOneAndUpdate(
        { _id: new Types.ObjectId(id), ...this.tenant(user) },
        { $set: update },
        { new: true },
      )
      .lean();

    if (!updated) throw new NotFoundException('Conductor no encontrado');
    return updated;
  }

  async toggleState(id: string, user?: UserCtx) {
    if (!Types.ObjectId.isValid(id))
      throw new NotFoundException('Conductor no encontrado');

    const current = await this.model.findOne({
      _id: new Types.ObjectId(id),
      ...this.tenant(user),
    });
    if (!current) throw new NotFoundException('Conductor no encontrado');

    current.estado = !current.estado;
    await current.save();
    return { _id: current._id, estado: current.estado };
  }
}
