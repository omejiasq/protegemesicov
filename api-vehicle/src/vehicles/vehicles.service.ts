import {
  ConflictException,
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { Vehicle, VehicleDocument } from '../schema/vehicle.schema';
import { VehicleExternalApiService } from '../libs/exteral-api';
import { AuditService } from '../libs/audit/audit.service';

type UserCtx = {
  enterprise_id?: string;
  sub?: string;
};

@Injectable()
export class VehiclesService {
  private readonly logger = new Logger(VehiclesService.name);

  constructor(
    @InjectModel(Vehicle.name)
    private readonly model: Model<VehicleDocument>,
    private readonly external: VehicleExternalApiService,
    private readonly audit: AuditService,
  ) {}

  /* =====================================================
   * HELPERS
   * ===================================================== */

  private tenant(user?: UserCtx): FilterQuery<VehicleDocument> {
    if (!user?.enterprise_id) return {};
    return { enterprise_id: user.enterprise_id };
  }

  private parseDate(value?: string | Date): Date | undefined {
    if (!value) return undefined;
    const d = value instanceof Date ? value : new Date(value);
    return isNaN(d.getTime()) ? undefined : d;
  }

  /* =====================================================
   * CREATE
   * ===================================================== */

  async create(body: any, user?: UserCtx) {
    if (!user?.enterprise_id) {
      throw new ConflictException('Empresa no definida');
    }

    const exists = await this.model.exists({
      placa: body.placa,
      enterprise_id: user.enterprise_id,
    });

    if (exists) {
      throw new ConflictException('La placa ya existe para esta empresa');
    }

    const doc = await this.model.create({
      enterprise_id: user.enterprise_id,
      createdBy: user.sub,
      estado: true,
      active: true,

      placa: body.placa,
      clase: Number(body.clase),
      nivelServicio: Number(body.nivelServicio),

      soat: body.soat?.trim() || undefined,
      fechaVencimientoSoat: this.parseDate(body.fechaVencimientoSoat),

      revisionTecnicoMecanica: body.revisionTecnicoMecanica || undefined,
      fechaRevisionTecnicoMecanica: this.parseDate(body.fechaRevisionTecnicoMecanica),

      idPolizas: body.idPolizas || undefined,
      tipoPoliza: body.tipoPoliza || undefined,
      vigencia: this.parseDate(body.vigencia),

      tarjetaOperacion: body.tarjetaOperacion || undefined,
      fechaTarjetaOperacion: this.parseDate(body.fechaTarjetaOperacion),

      driver_id: body.driver_id
        ? new Types.ObjectId(body.driver_id)
        : undefined,
    });

    /* ---------- sync externo (best effort) ---------- */
    try {
      await this.external.crearVehiculo(doc.toJSON(), {
        userId: user.sub,
        enterpriseId: user.enterprise_id,
      });
    } catch (error) {
      this.logger.warn('No se pudo sincronizar vehículo externo');
    }

    return doc.toJSON();
  }

  /* =====================================================
   * GET ALL (por empresa)
   * ===================================================== */

  async getAll(query: any, user?: UserCtx) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.numero_items) || 10));
    const skip = (page - 1) * limit;

    const filter: FilterQuery<VehicleDocument> = {
      ...this.tenant(user),
    };

    if (query.placa) {
      filter.placa = { $regex: query.placa, $options: 'i' };
    }

    if (query.estado !== undefined) {
      filter.estado = query.estado === 'true' || query.estado === true;
    }

    const [items, total] = await Promise.all([
      this.model
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.model.countDocuments(filter),
    ]);

    return {
      page,
      numero_items: limit,
      total,
      items,
    };
  }

  /* =====================================================
   * GET BY ID
   * ===================================================== */

  async getById(id: string, user?: UserCtx) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Vehículo no encontrado');
    }

    const vehicle = await this.model
      .findOne({
        _id: new Types.ObjectId(id),
        ...this.tenant(user),
      })
      .lean();

    if (!vehicle) {
      throw new NotFoundException('Vehículo no encontrado');
    }

    return vehicle;
  }

  /* =====================================================
   * UPDATE
   * ===================================================== */

  async updateById(id: string, body: any, user?: UserCtx) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Vehículo no encontrado');
    }

    if (body.placa) {
      const dup = await this.model.exists({
        _id: { $ne: new Types.ObjectId(id) },
        placa: body.placa,
        enterprise_id: user?.enterprise_id,
      });

      if (dup) {
        throw new ConflictException(
          'Ya existe un vehículo con esta placa en la empresa',
        );
      }
    }

    const update: any = {
      ...(body.placa && { placa: body.placa }),
      ...(body.clase != null && { clase: Number(body.clase) }),
      ...(body.nivelServicio != null && {
        nivelServicio: Number(body.nivelServicio),
      }),

      ...(body.soat !== undefined && { soat: body.soat || undefined }),
      ...(body.fechaVencimientoSoat && {
        fechaVencimientoSoat: this.parseDate(body.fechaVencimientoSoat),
      }),

      ...(body.revisionTecnicoMecanica && {
        revisionTecnicoMecanica: body.revisionTecnicoMecanica,
      }),
      ...(body.fechaRevisionTecnicoMecanica && {
        fechaRevisionTecnicoMecanica: this.parseDate(
          body.fechaRevisionTecnicoMecanica,
        ),
      }),

      ...(body.idPolizas && { idPolizas: body.idPolizas }),
      ...(body.tipoPoliza && { tipoPoliza: body.tipoPoliza }),
      ...(body.vigencia && { vigencia: this.parseDate(body.vigencia) }),

      ...(body.tarjetaOperacion && {
        tarjetaOperacion: body.tarjetaOperacion,
      }),
      ...(body.fechaTarjetaOperacion && {
        fechaTarjetaOperacion: this.parseDate(body.fechaTarjetaOperacion),
      }),

      ...(body.driver_id && {
        driver_id: new Types.ObjectId(body.driver_id),
      }),
    };

    const updated = await this.model
      .findOneAndUpdate(
        { _id: new Types.ObjectId(id), ...this.tenant(user) },
        { $set: update },
        { new: true },
      )
      .lean();

    if (!updated) {
      throw new NotFoundException('Vehículo no encontrado');
    }

    /* ---------- sync externo ---------- */
    try {
      await this.external.actualizarVehiculo(String(id), updated, {
        userId: user?.sub,
        enterpriseId: user?.enterprise_id,
      });
    } catch {
      this.logger.warn('No se pudo actualizar vehículo externo');
    }

    return updated;
  }

  /* =====================================================
   * ACTIVATE / DEACTIVATE
   * ===================================================== */

  async toggleState(id: string, user?: UserCtx) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Vehículo no encontrado');
    }

    const vehicle = await this.model.findOne({
      _id: new Types.ObjectId(id),
      ...this.tenant(user),
    });

    if (!vehicle) {
      throw new NotFoundException('Vehículo no encontrado');
    }

    vehicle.estado = !vehicle.estado;
    await vehicle.save();

    return {
      _id: vehicle._id,
      estado: vehicle.estado,
    };
  }
}
