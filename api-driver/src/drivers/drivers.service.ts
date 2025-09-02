import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { Driver, DriverDocument } from '../schema/drivers.schema';

type UserCtx = { enterprise_id?: string; sub?: string };

@Injectable()
export class DriversService {
  constructor(@InjectModel(Driver.name) private readonly model: Model<DriverDocument>) {}

  private tenant(user?: UserCtx): FilterQuery<DriverDocument> {
    return { enterprise_id: user?.enterprise_id };
  }

  private parseDate(d?: string | Date) {
    if (!d) return undefined;
    const dt = d instanceof Date ? d : new Date(d);
    return isNaN(dt.getTime()) ? undefined : dt;
  }

  async create(body: any, user?: UserCtx) {
    const dup = await this.model.exists({
      ...this.tenant(user),
      idDespacho: Number(body.idDespacho),
      numeroIdentificacion: body.numeroIdentificacion,
    });
    if (dup) throw new ConflictException('El conductor ya existe para este despacho');

    const doc = await this.model.create({
      enterprise_id: user?.enterprise_id,
      createdBy: user?.sub,
      estado: true,

      idDespacho: Number(body.idDespacho),

      tipoIdentificacionPrincipal: String(body.tipoIdentificacionPrincipal),
      numeroIdentificacion: String(body.numeroIdentificacion),
      primerNombrePrincipal: String(body.primerNombrePrincipal),
      segundoNombrePrincipal: body.segundoNombrePrincipal,
      primerApellidoPrincipal: String(body.primerApellidoPrincipal),
      segundoApellidoPrincipal: body.segundoApellidoPrincipal,

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
    if (q.idDespacho != null) filter.idDespacho = Number(q.idDespacho);
    if (q.numeroIdentificacion) filter.numeroIdentificacion = { $regex: q.numeroIdentificacion, $options: 'i' };
    if (q.estado != null) filter.estado = q.estado === 'true' || q.estado === true;

    const [items, total] = await Promise.all([
      this.model.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      this.model.countDocuments(filter),
    ]);

    return { page, numero_items: limit, total, items };
  }

  async getById(id: string, user?: UserCtx) {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('Conductor no encontrado');
    const item = await this.model.findOne({ _id: new Types.ObjectId(id), ...this.tenant(user) }).lean();
    if (!item) throw new NotFoundException('Conductor no encontrado');
    return item;
  }

  async updateById(id: string, body: any, user?: UserCtx) {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('Conductor no encontrado');

    if (body.numeroIdentificacion || body.idDespacho) {
      const dup = await this.model.exists({
        _id: { $ne: new Types.ObjectId(id) },
        ...this.tenant(user),
        idDespacho: Number(body.idDespacho ?? (await this.model.findById(id))?.idDespacho),
        numeroIdentificacion: String(body.numeroIdentificacion ?? (await this.model.findById(id))?.numeroIdentificacion),
      });
      if (dup) throw new ConflictException('Ya existe un conductor con ese documento para este despacho');
    }

    const update: any = {
      ...(body.idDespacho != null && { idDespacho: Number(body.idDespacho) }),

      ...(body.tipoIdentificacionPrincipal != null && { tipoIdentificacionPrincipal: String(body.tipoIdentificacionPrincipal) }),
      ...(body.numeroIdentificacion != null && { numeroIdentificacion: String(body.numeroIdentificacion) }),
      ...(body.primerNombrePrincipal != null && { primerNombrePrincipal: String(body.primerNombrePrincipal) }),
      ...(body.segundoNombrePrincipal != null && { segundoNombrePrincipal: body.segundoNombrePrincipal }),
      ...(body.primerApellidoPrincipal != null && { primerApellidoPrincipal: String(body.primerApellidoPrincipal) }),
      ...(body.segundoApellidoPrincipal != null && { segundoApellidoPrincipal: body.segundoApellidoPrincipal }),

      ...(body.tipoIdentificacionSecundario != null && { tipoIdentificacionSecundario: String(body.tipoIdentificacionSecundario) }),
      ...(body.numeroIdentificacionSecundario != null && { numeroIdentificacionSecundario: String(body.numeroIdentificacionSecundario) }),
      ...(body.primerNombreSecundario != null && { primerNombreSecundario: String(body.primerNombreSecundario) }),
      ...(body.segundoNombreSecundario != null && { segundoNombreSecundario: body.segundoNombreSecundario }),
      ...(body.primerApellidoSecundario != null && { primerApellidoSecundario: String(body.primerApellidoSecundario) }),
      ...(body.segundoApellidoSecundario != null && { segundoApellidoSecundario: String(body.segundoApellidoSecundario) }),

      ...(body.idPruebaAlcoholimetria != null && { idPruebaAlcoholimetria: String(body.idPruebaAlcoholimetria) }),
      ...(body.resultadoPruebaAlcoholimetria != null && { resultadoPruebaAlcoholimetria: String(body.resultadoPruebaAlcoholimetria) }),
      ...(body.fechaUltimaPruebaAlcoholimetria != null && { fechaUltimaPruebaAlcoholimetria: this.parseDate(body.fechaUltimaPruebaAlcoholimetria) }),
      ...(body.idExamenMedico != null && { idExamenMedico: String(body.idExamenMedico) }),
      ...(body.fechaUltimoExamenMedico != null && { fechaUltimoExamenMedico: this.parseDate(body.fechaUltimoExamenMedico) }),

      ...(body.idPruebaAlcoholimetriaSecundario != null && { idPruebaAlcoholimetriaSecundario: String(body.idPruebaAlcoholimetriaSecundario) }),
      ...(body.resultadoPruebaAlcoholimetriaSecundario != null && { resultadoPruebaAlcoholimetriaSecundario: String(body.resultadoPruebaAlcoholimetriaSecundario) }),
      ...(body.fechaUltimaPruebaAlcoholimetriaSecundario != null && { fechaUltimaPruebaAlcoholimetriaSecundario: this.parseDate(body.fechaUltimaPruebaAlcoholimetriaSecundario) }),
      ...(body.idExamenMedicoSecundario != null && { idExamenMedicoSecundario: String(body.idExamenMedicoSecundario) }),
      ...(body.fechaUltimoExamenMedicoSecundario != null && { fechaUltimoExamenMedicoSecundario: this.parseDate(body.fechaUltimoExamenMedicoSecundario) }),

      ...(body.licenciaConduccion != null && { licenciaConduccion: String(body.licenciaConduccion) }),
      ...(body.licenciaConduccionSecundario != null && { licenciaConduccionSecundario: String(body.licenciaConduccionSecundario) }),
      ...(body.observaciones != null && { observaciones: String(body.observaciones) }),
    };

    const updated = await this.model.findOneAndUpdate(
      { _id: new Types.ObjectId(id), ...this.tenant(user) },
      { $set: update },
      { new: true },
    ).lean();

    if (!updated) throw new NotFoundException('Conductor no encontrado');
    return updated;
  }

  async toggleState(id: string, user?: UserCtx) {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('Conductor no encontrado');

    const current = await this.model.findOne({ _id: new Types.ObjectId(id), ...this.tenant(user) });
    if (!current) throw new NotFoundException('Conductor no encontrado');

    current.estado = !current.estado;
    await current.save();
    return { _id: current._id, estado: current.estado };
  }
}
