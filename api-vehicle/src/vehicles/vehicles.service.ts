import {
  ConflictException,
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
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
  private readonly logger = new Logger(VehiclesService.name);

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
    if (isNaN(d.getTime())) return null;
    // Normalizar a medianoche UTC para evitar desfases por zona horaria del servidor.
    // setHours(0,0,0,0) usaba hora LOCAL → desplazaba la fecha en servidores UTC-5.
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
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

    // Notificación por creación desactivada intencionalmente

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

  /**
   * Reúne todos los correos destinatarios para notificaciones al superadmin:
   *  1. notification_email de empresas con admin=true
   *  2. correo de usuarios con roleType=superadmin (sin enterprise_id)
   *  3. variable de entorno SUPERADMIN_NOTIFICATION_EMAIL
   */
  private async getSuperadminEmails(): Promise<string[]> {
    const db = this.vehicleModel.db as any;

    // 1. notification_email de la(s) empresa(s) admin
    const adminEnterprises = await db
      .collection('enterprises')
      .find({ admin: true })
      .toArray();
    const enterpriseEmails: string[] = adminEnterprises
      .map((e: any) => e.notification_email)
      .filter(Boolean);
    this.logger.log(`[getSuperadminEmails] Empresas admin encontradas: ${adminEnterprises.length}, emails: ${enterpriseEmails.join(', ') || '(ninguno)'}`);

    // 2. correo de usuarios superadmin de plataforma
    const superadminUsers = await this.userRefModel
      .find({ roleType: 'superadmin', enterprise_id: { $exists: false } })
      .lean();
    const userEmails: string[] = superadminUsers
      .map((u) => u.usuario?.correo)
      .filter(Boolean) as string[];
    this.logger.log(`[getSuperadminEmails] Usuarios superadmin encontrados: ${superadminUsers.length}, emails: ${userEmails.join(', ') || '(ninguno)'}`);

    // 3. fallback por variable de entorno
    const envEmail = process.env.SUPERADMIN_NOTIFICATION_EMAIL;
    if (envEmail) this.logger.log(`[getSuperadminEmails] SUPERADMIN_NOTIFICATION_EMAIL: ${envEmail}`);

    const all = [
      ...enterpriseEmails,
      ...userEmails,
      ...(envEmail ? [envEmail] : []),
    ];

    const unique = [...new Set(all.filter(Boolean))];
    this.logger.log(`[getSuperadminEmails] Destinatarios finales: ${unique.join(', ') || '(ninguno)'}`);
    return unique;
  }

  private async notifySuperadminsDeactivationRequest(vehicle: any, user: UserCtx) {
    const uniqueEmails = await this.getSuperadminEmails();
    if (!uniqueEmails.length) return;

    const ent = await (this.vehicleModel.db as any)
      .collection('enterprises')
      .findOne({ _id: new Types.ObjectId(user.enterprise_id) });

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

  private async notifySuperadminsStateChange(
    vehicle: any,
    user: UserCtx,
    action: 'activacion' | 'desactivacion',
  ) {
    const uniqueEmails = await this.getSuperadminEmails();
    if (!uniqueEmails.length) return;

    const ent = await (this.vehicleModel.db as any)
      .collection('enterprises')
      .findOne({ _id: new Types.ObjectId(user.enterprise_id) });

    await this.emailService.sendVehicleStateChangeNotification({
      toEmails: uniqueEmails,
      enterpriseName: ent?.name ?? user.enterprise_id,
      enterpriseNit: ent?.document_number ?? '',
      placa: vehicle.placa,
      clase: vehicle.clase,
      action,
      changedBy: user.username ?? user.sub ?? 'Desconocido',
      fecha: new Date(),
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

    // Notificar al superadmin sobre el cambio de estado
    const action = vehicle.active ? 'activacion' : 'desactivacion';
    this.notifySuperadminsStateChange(vehicle.toObject(), user, action).catch(() => { /* no bloquear */ });

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

    // Notificar a la empresa que su vehículo fue desactivado
    this.notifyEnterpriseStateBulk(
      vehicle.enterprise_id.toString(), [vehicle.placa], 'desactivacion', user
    ).catch(() => {});

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
   * REQUEST ACTIVATION (empresa) — solicita activación de un vehículo inactivo
   * ===================================================== */
  async requestActivation(
    id: string,
    dto: { nota_activacion: string },
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
        active: false,
        activation_estado: { $ne: 'pendiente' },
      },
      {
        $set: {
          nota_activacion: dto.nota_activacion || 'Sin motivo especificado',
          fecha_solicitud_activacion: now,
          activation_estado: 'pendiente',
        },
      },
      { new: true },
    );

    if (!vehicle) {
      throw new NotFoundException('Vehículo no encontrado, ya activo, o con solicitud pendiente');
    }

    await this.auditModel.create({
      module: 'vehicles',
      operation: 'requestActivation',
      entity: 'Vehicle',
      entityId: id,
      userId: user.sub,
      username: user.username,
      requestPayload: { nota_activacion: dto.nota_activacion },
      success: true,
    }).catch(() => { /* no crítico */ });

    // Notificar a superadmins de la plataforma
    this.notifySuperadminsActivationRequest(vehicle.toObject(), user).catch(() => { /* no bloquear */ });

    return vehicle.toObject();
  }

  private async notifySuperadminsActivationRequest(vehicle: any, user: UserCtx) {
    const uniqueEmails = await this.getSuperadminEmails();
    if (!uniqueEmails.length) return;

    const ent = await (this.vehicleModel.db as any)
      .collection('enterprises')
      .findOne({ _id: new Types.ObjectId(user.enterprise_id) });

    await this.emailService.sendActivationRequestNotification({
      toEmails: uniqueEmails,
      enterpriseName: ent?.name ?? user.enterprise_id,
      enterpriseNit: ent?.document_number ?? '',
      placa: vehicle.placa,
      clase: vehicle.clase,
      nota_activacion: vehicle.nota_activacion,
      requestedBy: user.username ?? user.sub ?? 'Desconocido',
      fecha_solicitud: vehicle.fecha_solicitud_activacion,
    });
  }

  /* =====================================================
   * REQUEST ACTIVATION BULK (empresa) — solicita activación de múltiples vehículos
   * ===================================================== */
  async requestActivationBulk(
    dto: { vehicle_ids: string[]; nota_activacion: string },
    user: UserCtx,
  ) {
    if (!dto.vehicle_ids?.length) {
      throw new BadRequestException('Debe seleccionar al menos un vehículo');
    }

    const validIds = dto.vehicle_ids.filter((id) => Types.ObjectId.isValid(id));
    if (!validIds.length) throw new BadRequestException('IDs inválidos');

    const now = new Date();
    const enterpriseId = new Types.ObjectId(user.enterprise_id);

    const result = await this.vehicleModel.updateMany(
      {
        _id: { $in: validIds.map((id) => new Types.ObjectId(id)) },
        enterprise_id: enterpriseId,
        active: false,
        activation_estado: { $ne: 'pendiente' },
      },
      {
        $set: {
          nota_activacion: dto.nota_activacion || 'Sin motivo especificado',
          fecha_solicitud_activacion: now,
          activation_estado: 'pendiente',
        },
      },
    );

    if (result.modifiedCount === 0) {
      throw new BadRequestException('Ningún vehículo fue actualizado. Verifique que estén inactivos y sin solicitud pendiente.');
    }

    // Obtener las placas afectadas para el correo
    const vehicles = await this.vehicleModel
      .find({
        _id: { $in: validIds.map((id) => new Types.ObjectId(id)) },
        enterprise_id: enterpriseId,
      })
      .select('placa clase')
      .lean();

    await this.auditModel.create({
      module: 'vehicles',
      operation: 'requestActivationBulk',
      entity: 'Vehicle',
      entityId: validIds.join(','),
      userId: user.sub,
      username: user.username,
      requestPayload: { vehicle_ids: validIds, nota_activacion: dto.nota_activacion },
      success: true,
    }).catch(() => { /* no crítico */ });

    // Notificar a superadmins
    this.notifySuperadminsActivationBulk(vehicles, user, dto.nota_activacion).catch(() => { /* no bloquear */ });

    return { requested: result.modifiedCount, placas: vehicles.map((v) => v.placa) };
  }

  private async notifySuperadminsActivationBulk(vehicles: any[], user: UserCtx, nota: string) {
    const uniqueEmails = await this.getSuperadminEmails();
    if (!uniqueEmails.length) return;

    const ent = await (this.vehicleModel.db as any)
      .collection('enterprises')
      .findOne({ _id: new Types.ObjectId(user.enterprise_id) });

    const placas = vehicles.map((v) => v.placa);

    await this.emailService.sendActivationRequestNotification({
      toEmails: uniqueEmails,
      enterpriseName: ent?.name ?? user.enterprise_id,
      enterpriseNit: ent?.document_number ?? '',
      placa: placas.join(', '),
      clase: vehicles.length > 1 ? `${vehicles.length} vehículos` : vehicles[0]?.clase,
      nota_activacion: nota || 'Sin motivo especificado',
      requestedBy: user.username ?? user.sub ?? 'Desconocido',
      fecha_solicitud: new Date(),
    });
  }

  /* =====================================================
   * REQUEST DEACTIVATION BULK (empresa) — solicita desactivación de múltiples vehículos
   * ===================================================== */
  async requestDeactivationBulk(
    dto: { vehicle_ids: string[]; nota_desactivacion: string },
    user: UserCtx,
  ) {
    if (!dto.vehicle_ids?.length) {
      throw new BadRequestException('Debe seleccionar al menos un vehículo');
    }

    const validIds = dto.vehicle_ids.filter((id) => Types.ObjectId.isValid(id));
    if (!validIds.length) throw new BadRequestException('IDs inválidos');

    const now = new Date();
    const enterpriseId = new Types.ObjectId(user.enterprise_id);

    const result = await this.vehicleModel.updateMany(
      {
        _id: { $in: validIds.map((id) => new Types.ObjectId(id)) },
        enterprise_id: enterpriseId,
        active: true,
        deactivation_estado: { $ne: 'pendiente' },
      },
      {
        $set: {
          nota_desactivacion: dto.nota_desactivacion || 'Sin motivo especificado',
          fecha_solicitud_desactivacion: now,
          deactivation_estado: 'pendiente',
        },
      },
    );

    if (result.modifiedCount === 0) {
      throw new BadRequestException('Ningún vehículo fue actualizado. Verifique que estén activos y sin solicitud pendiente.');
    }

    const vehicles = await this.vehicleModel
      .find({
        _id: { $in: validIds.map((id) => new Types.ObjectId(id)) },
        enterprise_id: enterpriseId,
      })
      .select('placa clase')
      .lean();

    await this.auditModel.create({
      module: 'vehicles',
      operation: 'requestDeactivationBulk',
      entity: 'Vehicle',
      entityId: validIds.join(','),
      userId: user.sub,
      username: user.username,
      requestPayload: { vehicle_ids: validIds, nota_desactivacion: dto.nota_desactivacion },
      success: true,
    }).catch(() => { /* no crítico */ });

    this.notifySuperadminsDeactivationBulk(vehicles, user, dto.nota_desactivacion).catch(() => { /* no bloquear */ });

    return { requested: result.modifiedCount, placas: vehicles.map((v) => v.placa) };
  }

  private async notifySuperadminsDeactivationBulk(vehicles: any[], user: UserCtx, nota: string) {
    const uniqueEmails = await this.getSuperadminEmails();
    if (!uniqueEmails.length) return;

    const ent = await (this.vehicleModel.db as any)
      .collection('enterprises')
      .findOne({ _id: new Types.ObjectId(user.enterprise_id) });

    const placas = vehicles.map((v) => v.placa);

    await this.emailService.sendDeactivationBulkRequestNotification({
      toEmails: uniqueEmails,
      enterpriseName: ent?.name ?? user.enterprise_id,
      enterpriseNit: ent?.document_number ?? '',
      placas,
      nota_desactivacion: nota || 'Sin motivo especificado',
      requestedBy: user.username ?? user.sub ?? 'Desconocido',
      fecha_solicitud: new Date(),
    });
  }

  /** Obtiene emails de contacto de una empresa específica */
  private async getEnterpriseEmails(enterpriseId: string): Promise<string[]> {
    const ent = await (this.vehicleModel.db as any)
      .collection('enterprises')
      .findOne({ _id: new Types.ObjectId(enterpriseId) });

    const emails: string[] = [];
    if (ent?.notification_email) emails.push(ent.notification_email);

    // También correos de usuarios admin de esa empresa
    const adminUsers = await this.userRefModel
      .find({ enterprise_id: new Types.ObjectId(enterpriseId), roleType: 'admin' })
      .select('usuario.correo')
      .lean();
    for (const u of adminUsers) {
      const correo = (u as any).usuario?.correo;
      if (correo) emails.push(correo);
    }

    return [...new Set(emails.filter(Boolean))];
  }

  /* =====================================================
   * APPROVE ACTIVATION (superadmin)
   * ===================================================== */
  async approveActivation(id: string, user: UserCtx) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Vehículo no encontrado');
    }

    const vehicle = await this.vehicleModel.findOneAndUpdate(
      { _id: new Types.ObjectId(id), activation_estado: 'pendiente' },
      {
        $set: {
          active: true,
          fecha_activacion: new Date(),
          activation_estado: null,
          nota_activacion: null,
          fecha_solicitud_activacion: null,
        },
      },
      { new: true },
    );

    if (!vehicle) {
      throw new NotFoundException('Vehículo no encontrado o sin solicitud pendiente');
    }

    await this.auditModel.create({
      module: 'vehicles',
      operation: 'approveActivation',
      entity: 'Vehicle',
      entityId: id,
      userId: user.sub,
      username: user.username,
      requestPayload: { placa: vehicle.placa },
      success: true,
    }).catch(() => { /* no crítico */ });

    // Notificar a la empresa que su vehículo fue activado
    this.notifyEnterpriseStateBulk(
      vehicle.enterprise_id.toString(), [vehicle.placa], 'activacion', user
    ).catch(() => {});

    return vehicle.toObject();
  }

  /* =====================================================
   * APPROVE DEACTIVATION BULK (superadmin)
   * ===================================================== */
  async approveDeactivationBulk(dto: { vehicle_ids: string[] }, user: UserCtx) {
    if (!dto.vehicle_ids?.length) throw new BadRequestException('Debe seleccionar al menos un vehículo');

    const validIds = dto.vehicle_ids.filter((id) => Types.ObjectId.isValid(id));
    if (!validIds.length) throw new BadRequestException('IDs inválidos');

    const now = new Date();
    await this.vehicleModel.updateMany(
      { _id: { $in: validIds.map((id) => new Types.ObjectId(id)) }, deactivation_estado: 'pendiente' },
      { $set: { active: false, fecha_ultima_desactivacion: now, deactivation_estado: 'aprobada' } },
    );

    const vehicles = await this.vehicleModel
      .find({ _id: { $in: validIds.map((id) => new Types.ObjectId(id)) } })
      .select('placa enterprise_id')
      .lean();

    await this.auditModel.create({
      module: 'vehicles', operation: 'approveDeactivationBulk', entity: 'Vehicle',
      entityId: validIds.join(','), userId: user.sub, username: user.username,
      requestPayload: { vehicle_ids: validIds }, success: true,
    }).catch(() => {});

    // Agrupar por empresa y notificar a cada una
    const byEnterprise = new Map<string, string[]>();
    for (const v of vehicles) {
      const eid = v.enterprise_id?.toString();
      if (!eid) continue;
      if (!byEnterprise.has(eid)) byEnterprise.set(eid, []);
      byEnterprise.get(eid)!.push(v.placa);
    }
    for (const [eid, placas] of byEnterprise) {
      this.notifyEnterpriseStateBulk(eid, placas, 'desactivacion', user).catch(() => {});
    }

    return { approved: vehicles.length, placas: vehicles.map((v) => v.placa) };
  }

  /* =====================================================
   * APPROVE ACTIVATION BULK (superadmin)
   * ===================================================== */
  async approveActivationBulk(dto: { vehicle_ids: string[] }, user: UserCtx) {
    if (!dto.vehicle_ids?.length) throw new BadRequestException('Debe seleccionar al menos un vehículo');

    const validIds = dto.vehicle_ids.filter((id) => Types.ObjectId.isValid(id));
    if (!validIds.length) throw new BadRequestException('IDs inválidos');

    const now = new Date();
    await this.vehicleModel.updateMany(
      { _id: { $in: validIds.map((id) => new Types.ObjectId(id)) }, activation_estado: 'pendiente' },
      { $set: { active: true, fecha_activacion: now, activation_estado: null, nota_activacion: null, fecha_solicitud_activacion: null } },
    );

    const vehicles = await this.vehicleModel
      .find({ _id: { $in: validIds.map((id) => new Types.ObjectId(id)) } })
      .select('placa enterprise_id')
      .lean();

    await this.auditModel.create({
      module: 'vehicles', operation: 'approveActivationBulk', entity: 'Vehicle',
      entityId: validIds.join(','), userId: user.sub, username: user.username,
      requestPayload: { vehicle_ids: validIds }, success: true,
    }).catch(() => {});

    // Agrupar por empresa y notificar a cada una
    const byEnterprise = new Map<string, string[]>();
    for (const v of vehicles) {
      const eid = v.enterprise_id?.toString();
      if (!eid) continue;
      if (!byEnterprise.has(eid)) byEnterprise.set(eid, []);
      byEnterprise.get(eid)!.push(v.placa);
    }
    for (const [eid, placas] of byEnterprise) {
      this.notifyEnterpriseStateBulk(eid, placas, 'activacion', user).catch(() => {});
    }

    return { approved: vehicles.length, placas: vehicles.map((v) => v.placa) };
  }

  /* =====================================================
   * REJECT ACTIVATION (superadmin)
   * ===================================================== */
  async rejectActivation(id: string, user: UserCtx) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Vehículo no encontrado');
    }

    const vehicle = await this.vehicleModel.findOneAndUpdate(
      { _id: new Types.ObjectId(id), activation_estado: 'pendiente' },
      {
        $set: {
          activation_estado: null,
          nota_activacion: null,
          fecha_solicitud_activacion: null,
        },
      },
      { new: true },
    );

    if (!vehicle) {
      throw new NotFoundException('Vehículo no encontrado o sin solicitud pendiente');
    }

    await this.auditModel.create({
      module: 'vehicles',
      operation: 'rejectActivation',
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
   * GET PENDING ACTIVATIONS (superadmin)
   * ===================================================== */
  async getPendingActivations() {
    return this.vehicleModel.aggregate([
      { $match: { activation_estado: 'pendiente' } },
      {
        $lookup: {
          from: 'enterprises',
          localField: 'enterprise_id',
          foreignField: '_id',
          as: 'enterprise',
        },
      },
      { $unwind: { path: '$enterprise', preserveNullAndEmptyArrays: true } },
      { $sort: { fecha_solicitud_activacion: 1 } },
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

    // Notificar a la empresa de los vehículos activados
    this.notifyEnterpriseStateBulk(dto.enterprise_id, placas, 'activacion', user).catch(() => { /* no bloquear */ });

    return {
      contrato: contract,
      vehiculos_activados: vehicles.length,
      placas,
    };
  }

  private async notifyEnterpriseStateBulk(
    enterpriseId: string,
    placas: string[],
    action: 'activacion' | 'desactivacion',
    user: UserCtx,
  ) {
    const emails = await this.getEnterpriseEmails(enterpriseId);
    if (!emails.length) return;

    const ent = await (this.vehicleModel.db as any)
      .collection('enterprises')
      .findOne({ _id: new Types.ObjectId(enterpriseId) });

    await this.emailService.sendBulkStateChangeToEnterprise({
      toEmails: emails,
      enterpriseName: ent?.name ?? enterpriseId,
      placas,
      action,
      changedBy: user.username ?? user.sub ?? 'Administrador',
      fecha: new Date(),
    });
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
