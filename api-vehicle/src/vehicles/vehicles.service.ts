import {
  ConflictException,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Vehicle, VehicleDocument } from '../schema/vehicle.schema';
import { VehicleContract, VehicleContractDocument } from '../schema/vehicle-contract.schema';
import { UserRef, UserRefDocument } from '../schema/user-ref.schema';
import { Audit, AuditDocument } from '../libs/audit/audit.schema';
import { BadRequestException } from '@nestjs/common';
import { EmailService } from '../libs/email/email.service';

type UserCtx = {
  enterprise_id: string;
  sub?: string;
  username?: string;
  role?: string;
};

@Injectable()
export class VehiclesService {
  constructor(
    @InjectModel(Vehicle.name)
    private readonly vehicleModel: Model<VehicleDocument>,

    @InjectModel(VehicleContract.name)
    private readonly contractModel: Model<VehicleContractDocument>,

    @InjectModel(UserRef.name)
    private readonly userRefModel: Model<UserRefDocument>,

    @InjectModel(Audit.name)
    private readonly auditModel: Model<AuditDocument>,

    private readonly emailService: EmailService,
  ) {}

  /* =====================================================
   * HELPERS
   * ===================================================== */
  private normalizeDate(value?: string | Date): Date | null {
    if (!value) return null;
    const d = new Date(value);
    d.setHours(0, 0, 0, 0); // solo fecha
    return isNaN(d.getTime()) ? null : d;
  }

  /* =====================================================
   * CREATE
   * ===================================================== */
  async create(dto: any, user: UserCtx) {
    if (!user?.enterprise_id) {
      throw new ConflictException('Empresa no definida');
    }

    const enterpriseId = new Types.ObjectId(user.enterprise_id);

    const exists = await this.vehicleModel.exists({
      placa: dto.placa,
      enterprise_id: enterpriseId,
    });

    if (exists) {
      throw new ConflictException(
        'La placa ya existe para esta empresa',
      );
    }

    const vehicle = await this.vehicleModel.create({
      enterprise_id: enterpriseId,
      createdBy: user.sub,

      placa: dto.placa,
      nivelServicio: Number(dto.nivelServicio),
      clase: dto.clase ?? null,

      tipo_servicio: dto.tipo_servicio === 'ESPECIAL' ? 'ESPECIAL' : 'CARRETERA',

      estado: dto.estado ?? false,
      // Vehículos ESPECIAL se auto-activan (no requieren habilitación SICOV)
      active: dto.tipo_servicio === 'ESPECIAL' ? true : (dto.active ?? false),
      sicov_sync_enabled: dto.tipo_servicio === 'ESPECIAL' ? false : true,
      fecha_activacion: dto.tipo_servicio === 'ESPECIAL' ? new Date() : null,

      driver_id: dto.driver_id
        ? new Types.ObjectId(dto.driver_id)
        : undefined,
      driver2_id: dto.driver2_id
        ? new Types.ObjectId(dto.driver2_id)
        : undefined,

      marca: dto.marca ?? null,
      Linea: dto.Linea ?? null,
      servicio: dto.servicio ?? null,
      kilometraje: dto.kilometraje ?? null,
      modelo: dto.modelo ?? null,
      combustible: dto.combustible ?? null,
      color: dto.color ?? null,
      cilindraje: dto.cilindraje ?? null,

      no_rtm: dto.no_rtm ?? null,
      expedition_rtm: this.normalizeDate(dto.expedition_rtm),
      expiration_rtm: this.normalizeDate(dto.expiration_rtm),

      no_soat: dto.no_soat ?? null,
      expedition_soat: this.normalizeDate(dto.expedition_soat),
      expiration_soat: this.normalizeDate(dto.expiration_soat),

      no_rcc: dto.no_rcc ?? null,
      expiration_rcc: this.normalizeDate(dto.expiration_rcc),

      no_rce: dto.no_rce ?? null,
      expiration_rce: this.normalizeDate(dto.expiration_rce),

      no_tecnomecanica: dto.no_tecnomecanica ?? null,
      expiration_tecnomecanica: this.normalizeDate(dto.expiration_tecnomecanica),

      no_tarjeta_opera: dto.no_tarjeta_opera ?? null,
      expiration_tarjeta_opera: this.normalizeDate(dto.expiration_tarjeta_opera),

      nombre_aseguradora: dto.nombre_aseguradora ?? null,
      tipo_vehiculo: dto.tipo_vehiculo ?? null,
      modalidad: dto.modalidad ?? null,
      no_interno: dto.no_interno ?? null,
      motor: dto.motor ?? null,
      to: dto.to ?? null,
      vencim: dto.vencim ?? null,
      no_chasis: dto.no_chasis ?? null,
      tipo: dto.tipo ?? null,
      capacidad: dto.capacidad ?? null,

      nombre_propietario: dto.nombre_propietario ?? null,
      cedula_propietario: dto.cedula_propietario ?? null,
      telefono_propietario: dto.telefono_propietario ?? null,
      direccion_propietario: dto.direccion_propietario ?? null,

      document_type_driver2: dto.document_type_driver2 ?? null,
      documentNumber_driver2: dto.documentNumber_driver2 ?? null,
      name_driver2: dto.name_driver2 ?? null,

    });

    // Vehículos CARRETERA requieren habilitación manual → notificar
    if (vehicle.tipo_servicio !== 'ESPECIAL') {
      this.notifyAdminsNewVehicle(vehicle.toObject(), user).catch(() => { /* no bloquear */ });
    }

    // Registrar en auditoría
    this.auditModel.create({
      module: 'vehicles',
      operation: 'createVehicle',
      entity: 'Vehicle',
      entityId: String(vehicle._id),
      userId: user.sub,
      username: user.username,
      requestPayload: { placa: vehicle.placa, clase: vehicle.clase },
      success: true,
    }).catch(() => { /* auditoría no crítica */ });

    return vehicle.toObject();
  }

  private async notifyAdminsNewVehicle(vehicle: any, user: UserCtx) {
    const enterpriseId = new Types.ObjectId(user.enterprise_id);

    // Obtener admins activos de la empresa
    const admins = await this.userRefModel
      .find({
        enterprise_id: enterpriseId,
        roleType: { $in: ['admin', 'superadmin'] },
        active: true,
      })
      .lean();

    // También incluir superadmins de plataforma (sin enterprise_id)
    const platformSuperadmins = await this.userRefModel
      .find({ roleType: 'superadmin', enterprise_id: { $exists: false } })
      .lean();

    // Email de notificación por variable de entorno (propietario SaaS)
    const superadminEnvEmail = process.env.SUPERADMIN_NOTIFICATION_EMAIL;

    const emails = [
      ...admins.map((a) => a.usuario?.correo),
      ...platformSuperadmins.map((a) => a.usuario?.correo),
      ...(superadminEnvEmail ? [superadminEnvEmail] : []),
    ].filter(Boolean) as string[];

    const uniqueEmails = [...new Set(emails)];
    if (!uniqueEmails.length) return;

    const ent = await (this.vehicleModel.db as any)
      .collection('enterprises')
      .findOne({ _id: enterpriseId });

    await this.emailService.sendVehicleCreatedNotification({
      toEmails: uniqueEmails,
      enterpriseName: ent?.name ?? user.enterprise_id,
      placa: vehicle.placa,
      clase: vehicle.clase,
      marca: vehicle.marca,
      modelo: vehicle.modelo,
      no_interno: vehicle.no_interno,
      createdBy: user.username ?? user.sub,
    });
  }

  private async notifySuperadminsDeactivationRequest(vehicle: any, user: UserCtx) {
    const enterpriseId = new Types.ObjectId(user.enterprise_id);

    const platformSuperadmins = await this.userRefModel
      .find({ roleType: 'superadmin', enterprise_id: { $exists: false } })
      .lean();

    const superadminEnvEmail = process.env.SUPERADMIN_NOTIFICATION_EMAIL;

    const emails = [
      ...platformSuperadmins.map((a) => a.usuario?.correo),
      ...(superadminEnvEmail ? [superadminEnvEmail] : []),
    ].filter(Boolean) as string[];

    const uniqueEmails = [...new Set(emails)];
    if (!uniqueEmails.length) return;

    const ent = await (this.vehicleModel.db as any)
      .collection('enterprises')
      .findOne({ _id: enterpriseId });

    await this.emailService.sendDeactivationRequestNotification({
      toEmails: uniqueEmails,
      enterpriseName: ent?.name ?? user.enterprise_id,
      placa: vehicle.placa,
      clase: vehicle.clase,
      nota_desactivacion: vehicle.nota_desactivacion,
      requestedBy: user.username ?? user.sub ?? 'Desconocido',
      fecha_solicitud: vehicle.fecha_solicitud_desactivacion,
    });
  }

  /* =====================================================
   * GET ALL
   * ===================================================== */

  
  async getAll(query: any, user: any) {
    if (!user?.enterprise_id) {
      throw new BadRequestException('enterprise_id no presente en el token');
    }
  
    const enterpriseId = Types.ObjectId.isValid(user.enterprise_id)
      ? new Types.ObjectId(user.enterprise_id)
      : null;
  
    if (!enterpriseId) {
      throw new BadRequestException('enterprise_id inválido');
    }
  
    const match: any = {
      enterprise_id: enterpriseId,
    };
  
    if (query?.placa) {
      match.placa = { $regex: query.placa, $options: 'i' };
    }
  
    /*if (query?.estado !== undefined) {
      match.estado = query.estado === 'true' || query.estado === true;
    }*/
  
    return this.vehicleModel.aggregate([
      { $match: match },
  
      {
        $lookup: {
          from: 'users',           // colección real
          localField: 'driver_id', // Vehicle.driver_id
          foreignField: '_id',     // User._id
          as: 'driver',
        },
      },
  
      {
        $unwind: {
          path: '$driver',
          preserveNullAndEmptyArrays: true,
        },
      },
      { $sort: { placa: 1 } }
    ]);
  }
  
  

  

  /* =====================================================
   * GET BY ID
   * ===================================================== */
  async getById(id: string, user: UserCtx) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Vehículo no encontrado');
    }

    const vehicle = await this.vehicleModel.findOne({
      _id: new Types.ObjectId(id),
      enterprise_id: new Types.ObjectId(user.enterprise_id),
    }).lean();

    if (!vehicle) {
      throw new NotFoundException('Vehículo no encontrado');
    }

    return vehicle;
  }

  async getByPlate(plate: string, user: UserCtx) {
    if (!user?.enterprise_id) {
      throw new BadRequestException('enterprise_id no presente en el token');
    }
  
    const enterpriseId = Types.ObjectId.isValid(user.enterprise_id)
      ? new Types.ObjectId(user.enterprise_id)
      : null;
  
    if (!enterpriseId) {
      throw new BadRequestException('enterprise_id inválido');
    }
  
    const result = await this.vehicleModel.aggregate([
      // ================= PLACA (case-insensitive) =================
      {
        $match: {
          placa: { $regex: `^${plate}$`, $options: 'i' },
        },
      },
  
      // ================= NORMALIZAR enterprise_id =================
      {
        $addFields: {
          enterpriseObjId: {
            $cond: [
              { $eq: [{ $type: '$enterprise_id' }, 'objectId'] },
              '$enterprise_id',
              { $toObjectId: '$enterprise_id' },
            ],
          },
        },
      },
  
      // ================= MATCH POR EMPRESA =================
      {
        $match: {
          enterpriseObjId: enterpriseId,
        },
      },
  
      // ================= CONDUCTOR =================
      {
        $lookup: {
          from: 'users',
          localField: 'driver_id',
          foreignField: '_id',
          as: 'driver',
        },
      },
      {
        $unwind: {
          path: '$driver',
          preserveNullAndEmptyArrays: true,
        },
      },
  
      // ================= EMPRESA =================
      {
        $lookup: {
          from: 'enterprises',
          localField: 'enterpriseObjId',
          foreignField: '_id',
          as: 'enterprise',
        },
      },
      {
        $unwind: {
          path: '$enterprise',
          preserveNullAndEmptyArrays: true,
        },
      },
  
      // ================= SOLO UN DOCUMENTO =================
      { $limit: 1 },
    ]);
  
    if (!result.length) {
      throw new NotFoundException('Vehículo no encontrado');
    }
  
    return result[0];
  }
  
  
  

  /* =====================================================
   * UPDATE
   * (sirve para TODOS los campos)
   * ===================================================== */
  async updateById(id: string, dto: any, user: UserCtx) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Vehículo no encontrado');
    }
  
    const update: any = {};
    const now = new Date();
  
    Object.keys(dto).forEach((key) => {
      // fechas de vencimiento / expedición
      if (key.startsWith('expiration_') || key.startsWith('expedition_')) {
        update[key] = this.normalizeDate(dto[key]);
        return;
      }
  
      // ids de conductores
      if (key === 'driver_id' || key === 'driver2_id') {
        update[key] = dto[key] ? new Types.ObjectId(dto[key]) : null;
        return;
      }
  
      // cambio de estado activo/inactivo
      if (key === 'active') {
        const newActive = dto.active === true || dto.active === 'true';
  
        update.active = newActive;
  
        if (newActive) {
          // reactivación
          update.fecha_activacion = now;
          update.nota_desactivacion = null;
        } else {
          // desactivación
          update.fecha_ultima_desactivacion = now;
          update.nota_desactivacion = dto.nota_desactivacion ?? null;
        }
  
        return;
      }
  
      // cualquier otro campo
      update[key] = dto[key];
    });
  
    const vehicle = await this.vehicleModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(id),
        enterprise_id: new Types.ObjectId(user.enterprise_id),
      },
      { $set: update },
      { new: true },
    );
  
    if (!vehicle) {
      throw new NotFoundException('Vehículo no encontrado');
    }
  
    return vehicle.toObject();
  }
  

  /* =====================================================
   * TOGGLE ESTADO
   * ===================================================== */
  async toggleState(id: string, user: UserCtx) {
    const vehicle = await this.vehicleModel.findOne({
      _id: new Types.ObjectId(id),
      enterprise_id: new Types.ObjectId(user.enterprise_id),
    });

    if (!vehicle) {
      throw new NotFoundException('Vehículo no encontrado');
    }

    vehicle.active = !vehicle.active;
    await vehicle.save();

    return {
      _id: vehicle._id,
      active: vehicle.active,
    };
  }
  /* =====================================================
 * UPDATE MODELO BY PLATE
 * ===================================================== */
async updateModeloByPlate(
  placa: string,
  modelo: string,
  user: UserCtx,
) {
  if (!user?.enterprise_id) {
    throw new BadRequestException('enterprise_id no presente en el token');
  }

  if (!placa || !modelo) {
    throw new BadRequestException('placa y modelo son obligatorios');
  }

  const enterpriseId = Types.ObjectId.isValid(user.enterprise_id)
    ? new Types.ObjectId(user.enterprise_id)
    : null;

  if (!enterpriseId) {
    throw new BadRequestException('enterprise_id inválido');
  }

  const vehicle = await this.vehicleModel.findOneAndUpdate(
    {
      placa: { $regex: `^${placa}$`, $options: 'i' }, // exacta, sin importar mayúsculas
      enterprise_id: enterpriseId,
    },
    {
      $set: {
        modelo: modelo,
        updatedAt: new Date(),
      },
    },
    {
      new: true,
    },
  ).lean();

  if (!vehicle) {
    throw new NotFoundException(
      `No se encontró vehículo con placa ${placa}`,
    );
  }

  return vehicle;
}

/* =====================================================
 * UPDATE SOLO CAMPOS NO NULL (CONTROLADO)
 * ===================================================== */
async updateNonNullFieldsById(
  id: string,
  dto: any,
  user: UserCtx,
) {
  if (!Types.ObjectId.isValid(id)) {
    throw new NotFoundException('Vehículo no encontrado');
  }

  if (!user?.enterprise_id) {
    throw new BadRequestException('enterprise_id no presente en el token');
  }

  const enterpriseId = new Types.ObjectId(user.enterprise_id);

  // ⛔ Campos prohibidos
  const forbiddenFields = new Set([
    '_id',
    'placa',
    'active',
    'fecha_activacion',
    'createdAt',
    'updatedAt',
    '__v',
  ]);

  const update: any = {};

  for (const [key, value] of Object.entries(dto)) {
    // ❌ no permitir campos prohibidos
    if (forbiddenFields.has(key)) continue;

    // ❌ ignorar null o undefined
    if (value === null || value === undefined) continue;

    // 📅 normalizar fechas
    if (key.startsWith('expiration_') || key.startsWith('expedition_')) {
      const date = this.normalizeDate(value as any);
      if (date) update[key] = date;
      continue;
    }

    // 🧍‍♂️ ObjectId conductores
    if (key === 'driver_id' || key === 'driver2_id') {
      update[key] = value ? new Types.ObjectId(value as string) : null;
      continue;
    }

    // 🔁 cualquier otro campo permitido
    update[key] = value;
  }

  if (!Object.keys(update).length) {
    throw new BadRequestException(
      'No hay campos válidos para actualizar',
    );
  }

  const vehicle = await this.vehicleModel.findOneAndUpdate(
    {
      _id: new Types.ObjectId(id),
      enterprise_id: enterpriseId,
    },
    { $set: update },
    { new: true },
  ).lean();

  if (!vehicle) {
    throw new NotFoundException('Vehículo no encontrado');
  }

  return vehicle;
}

  /* =====================================================
   * REQUEST DEACTIVATION (empresa) — solicita desactivación, queda pendiente
   * El vehículo permanece activo hasta que el superadmin apruebe o rechace.
   * ===================================================== */
  async deactivateById(
    id: string,
    dto: { nota_desactivacion: string },
    user: UserCtx,
  ) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Vehículo no encontrado');
    }

    const now = new Date();

    const vehicle = await this.vehicleModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(id),
        enterprise_id: new Types.ObjectId(user.enterprise_id),
        active: true, // solo se puede solicitar si está activo
      },
      {
        $set: {
          nota_desactivacion: dto.nota_desactivacion || 'Sin motivo especificado',
          fecha_solicitud_desactivacion: now,
          deactivation_estado: 'pendiente',
          // active permanece true hasta aprobación superadmin
        },
      },
      { new: true },
    );

    if (!vehicle) {
      throw new NotFoundException('Vehículo no encontrado o ya inactivo');
    }

    await this.auditModel.create({
      module: 'vehicles',
      operation: 'requestDeactivation',
      entity: 'Vehicle',
      entityId: id,
      userId: user.sub,
      username: user.username,
      requestPayload: { nota_desactivacion: dto.nota_desactivacion },
      success: true,
    }).catch(() => { /* no crítico */ });

    // Notificar a superadmins de la plataforma
    this.notifySuperadminsDeactivationRequest(vehicle.toObject(), user).catch(() => { /* no bloquear */ });

    return vehicle.toObject();
  }

  /* =====================================================
   * APPROVE DEACTIVATION (superadmin) — aprueba la solicitud, desactiva el vehículo
   * ===================================================== */
  async approveDeactivation(id: string, user: UserCtx) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Vehículo no encontrado');
    }

    const vehicle = await this.vehicleModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(id),
        deactivation_estado: 'pendiente',
      },
      {
        $set: {
          active: false,
          fecha_ultima_desactivacion: new Date(),
          deactivation_estado: 'aprobada',
        },
      },
      { new: true },
    );

    if (!vehicle) {
      throw new NotFoundException('Vehículo no encontrado o sin solicitud pendiente');
    }

    await this.auditModel.create({
      module: 'vehicles',
      operation: 'approveDeactivation',
      entity: 'Vehicle',
      entityId: id,
      userId: user.sub,
      username: user.username,
      requestPayload: { placa: vehicle.placa },
      success: true,
    }).catch(() => { /* no crítico */ });

    return vehicle.toObject();
  }

  /* =====================================================
   * REJECT DEACTIVATION (superadmin) — rechaza la solicitud, vehículo sigue activo
   * ===================================================== */
  async rejectDeactivation(id: string, user: UserCtx) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Vehículo no encontrado');
    }

    const vehicle = await this.vehicleModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(id),
        deactivation_estado: 'pendiente',
      },
      {
        $set: {
          deactivation_estado: null,
          fecha_solicitud_desactivacion: null,
          nota_desactivacion: null,
        },
      },
      { new: true },
    );

    if (!vehicle) {
      throw new NotFoundException('Vehículo no encontrado o sin solicitud pendiente');
    }

    await this.auditModel.create({
      module: 'vehicles',
      operation: 'rejectDeactivation',
      entity: 'Vehicle',
      entityId: id,
      userId: user.sub,
      username: user.username,
      requestPayload: { placa: vehicle.placa },
      success: true,
    }).catch(() => { /* no crítico */ });

    return vehicle.toObject();
  }

  /* =====================================================
   * GET PENDING DEACTIVATIONS (superadmin)
   * ===================================================== */
  async getPendingDeactivations() {
    return this.vehicleModel.aggregate([
      { $match: { deactivation_estado: 'pendiente' } },
      {
        $lookup: {
          from: 'enterprises',
          localField: 'enterprise_id',
          foreignField: '_id',
          as: 'enterprise',
        },
      },
      { $unwind: { path: '$enterprise', preserveNullAndEmptyArrays: true } },
      { $sort: { fecha_solicitud_desactivacion: 1 } },
    ]);
  }

  /* =====================================================
   * GET VEHICLES BY ENTERPRISE (superadmin)
   * ===================================================== */
  async getVehiclesByEnterprise(enterpriseId: string) {
    if (!Types.ObjectId.isValid(enterpriseId)) {
      throw new BadRequestException('enterprise_id inválido');
    }
    return this.vehicleModel
      .find({ enterprise_id: new Types.ObjectId(enterpriseId) })
      .sort({ placa: 1 })
      .lean();
  }

  /* =====================================================
   * ACTIVATE BULK (superadmin) — activa varios vehículos
   * y crea un contrato de habilitación
   * ===================================================== */
  async activateBulk(
    dto: {
      enterprise_id: string;
      vehicle_ids: string[];
      fecha_activacion: string;
      notas?: string;
    },
    user: UserCtx,
  ) {
    if (!Types.ObjectId.isValid(dto.enterprise_id)) {
      throw new BadRequestException('enterprise_id inválido');
    }
    if (!dto.vehicle_ids?.length) {
      throw new BadRequestException('Debe seleccionar al menos un vehículo');
    }

    const enterpriseId = new Types.ObjectId(dto.enterprise_id);
    const vehicleObjIds = dto.vehicle_ids
      .filter((id) => Types.ObjectId.isValid(id))
      .map((id) => new Types.ObjectId(id));

    if (!vehicleObjIds.length) {
      throw new BadRequestException('IDs de vehículos inválidos');
    }

    const fechaActivacion = new Date(dto.fecha_activacion);
    if (isNaN(fechaActivacion.getTime())) {
      throw new BadRequestException('Fecha de activación inválida');
    }

    // Obtener placas para el contrato
    const vehicles = await this.vehicleModel
      .find({ _id: { $in: vehicleObjIds }, enterprise_id: enterpriseId })
      .select('placa')
      .lean();

    if (!vehicles.length) {
      throw new NotFoundException('No se encontraron vehículos para la empresa indicada');
    }

    const placas = vehicles.map((v) => v.placa);

    // Generar número de contrato
    const year = fechaActivacion.getFullYear();
    const count = await this.contractModel.countDocuments({
      enterprise_id: enterpriseId,
    });
    const numero_contrato = `HAB-${year}-${String(count + 1).padStart(4, '0')}`;

    // Crear contrato
    const contract = await this.contractModel.create({
      enterprise_id: enterpriseId,
      vehicle_ids: vehicleObjIds,
      placas,
      numero_contrato,
      fecha_activacion: fechaActivacion,
      activated_by_id: user.sub,
      activated_by_name: user.username,
      notas: dto.notas ?? null,
    });

    // Activar vehículos (también limpiar cualquier solicitud de desactivación pendiente)
    await this.vehicleModel.updateMany(
      { _id: { $in: vehicleObjIds }, enterprise_id: enterpriseId },
      {
        $set: {
          active: true,
          fecha_activacion: fechaActivacion,
          nota_desactivacion: null,
          fecha_solicitud_desactivacion: null,
          deactivation_estado: null,
          contrato_id: contract._id,
        },
      },
    );

    // Auditoría
    await this.auditModel.create({
      module: 'vehicles',
      operation: 'activateBulk',
      entity: 'VehicleContract',
      entityId: String(contract._id),
      userId: user.sub,
      username: user.username,
      requestPayload: {
        enterprise_id: dto.enterprise_id,
        vehicle_ids: dto.vehicle_ids,
        fecha_activacion: dto.fecha_activacion,
        numero_contrato,
        placas,
      },
      success: true,
    }).catch(() => { /* no crítico */ });

    return {
      contrato: contract,
      vehiculos_activados: vehicles.length,
      placas,
    };
  }

  /* =====================================================
   * TOGGLE SICOV SYNC (superadmin)
   * ===================================================== */
  async toggleSicovSync(id: string, user: UserCtx) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Vehículo no encontrado');
    }

    const vehicle = await this.vehicleModel.findById(id);
    if (!vehicle) {
      throw new NotFoundException('Vehículo no encontrado');
    }

    const newValue = !vehicle.sicov_sync_enabled;
    vehicle.sicov_sync_enabled = newValue;
    await vehicle.save();

    await this.auditModel.create({
      module: 'vehicles',
      operation: 'toggleSicovSync',
      entity: 'Vehicle',
      entityId: id,
      userId: user.sub,
      username: user.username,
      requestPayload: { sicov_sync_enabled: newValue, placa: vehicle.placa },
      success: true,
    }).catch(() => { /* no crítico */ });

    return {
      _id: vehicle._id,
      placa: vehicle.placa,
      sicov_sync_enabled: newValue,
    };
  }

  /* =====================================================
   * GET AUDIT LOGS (superadmin)
   * ===================================================== */
  async getAuditLogs(filters: {
    enterprise_id?: string;
    entityId?: string;
    operation?: string;
    page?: number;
    limit?: number;
  }) {
    const query: any = { module: 'vehicles' };
    if (filters.entityId) query.entityId = filters.entityId;
    if (filters.operation) query.operation = filters.operation;

    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.min(100, Math.max(1, filters.limit ?? 50));
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.auditModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.auditModel.countDocuments(query),
    ]);

    return { data, total, page, limit };
  }

  /* =====================================================
   * GET CONTRACTS BY ENTERPRISE (superadmin)
   * ===================================================== */
  async getContractsByEnterprise(enterpriseId: string) {
    if (!Types.ObjectId.isValid(enterpriseId)) {
      throw new BadRequestException('enterprise_id inválido');
    }
    return this.contractModel
      .find({ enterprise_id: new Types.ObjectId(enterpriseId) })
      .sort({ createdAt: -1 })
      .lean();
  }

}
