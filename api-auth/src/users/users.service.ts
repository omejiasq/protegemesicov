import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';

import { User } from '../schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { EmailService } from '../libs/email/email.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
    private readonly emailService: EmailService,
  ) {}

  //-----------------------------------------------------
  // UTIL — QUITAR PASSWORD
  //-----------------------------------------------------
  private sanitize(user: any) {
    if (!user) return user;
    const { password, ...u } = user;
    return u;
  }

  //-----------------------------------------------------
  // CREATE (DESDE TOKEN)
  //-----------------------------------------------------
  async create(createUserDto: CreateUserDto, currentUser: any) {
    if (!currentUser?.enterprise_id) {
      throw new BadRequestException(
        'enterprise_id no presente en el token',
      );
    }

    const hashedPassword = await bcrypt.hash(
      createUserDto.password,
      10,
    );

    const newUser = await this.userModel.create({
      usuario: {
        usuario: createUserDto.usuario,
        nombre: createUserDto.firstName ?? undefined,
        apellido: createUserDto.lastName ?? undefined,
        telefono: createUserDto.phone ?? undefined,
        correo: createUserDto.email ?? undefined,
        document_type: createUserDto.documentType ?? 1,
        documentNumber: createUserDto.documentNumber ?? undefined,
      },
      password: hashedPassword,
      roleType: createUserDto.roleType ?? 'admin',
      enterprise_id: new Types.ObjectId(
        currentUser.enterprise_id,
      ),

      no_licencia_conduccion:
        createUserDto.no_licencia_conduccion ?? undefined,

      vencimiento_licencia_conduccion:
        createUserDto.vencimiento_licencia_conduccion
          ? new Date(createUserDto.vencimiento_licencia_conduccion)
          : undefined,

      active: true,
    });

    return this.sanitize(newUser.toObject());
  }

  //-----------------------------------------------------
  // REGISTER (PÚBLICO)
  //-----------------------------------------------------
  async register(createUserDto: CreateUserDto) {
    const hashedPassword = await bcrypt.hash(
      createUserDto.password,
      10,
    );

    const newUser = await this.userModel.create({
      usuario: {
        usuario: createUserDto.usuario,
        nombre: createUserDto.firstName ?? undefined,
        apellido: createUserDto.lastName ?? undefined,
        telefono: createUserDto.phone ?? undefined,
        correo: createUserDto.email ?? undefined,
        document_type: createUserDto.documentType ?? 1,
        documentNumber: createUserDto.documentNumber ?? undefined,
      },
      password: hashedPassword,
      roleType: createUserDto.roleType ?? 'admin',
      enterprise_id: createUserDto.enterprise_id
        ? new Types.ObjectId(createUserDto.enterprise_id)
        : undefined,

      no_licencia_conduccion:
        createUserDto.no_licencia_conduccion ?? undefined,

      vencimiento_licencia_conduccion:
        createUserDto.vencimiento_licencia_conduccion
          ? new Date(createUserDto.vencimiento_licencia_conduccion)
          : undefined,

      active: true,
    });

    return this.sanitize(newUser.toObject());
  }

  //-----------------------------------------------------
  // FIND BY ID (USADO POR JWT GUARD)
  //-----------------------------------------------------
  async findById(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }

    const user = await this.userModel.findById(id).lean();
    return this.sanitize(user);
  }

  //-----------------------------------------------------
  // CREATE POR ADMIN
  //-----------------------------------------------------
  async createByAdmin(
    createUserDto: CreateUserDto,
    currentUser: any,
  ) {
    if (!currentUser?.enterprise_id) {
      throw new BadRequestException(
        'enterprise_id no presente en el token',
      );
    }

    const hashedPassword = await bcrypt.hash(
      createUserDto.password,
      10,
    );

    const newUser = await this.userModel.create({
      usuario: {
        usuario: createUserDto.usuario,
        nombre: createUserDto.firstName ?? undefined,
        apellido: createUserDto.lastName ?? undefined,
        telefono: createUserDto.phone ?? undefined,
        correo: createUserDto.email ?? undefined,
        document_type: createUserDto.documentType ?? 1,
        documentNumber: createUserDto.documentNumber ?? undefined,
      },
      password: hashedPassword,
      roleType: createUserDto.roleType ?? 'admin',
      enterprise_id: new Types.ObjectId(
        currentUser.enterprise_id,
      ),

      no_licencia_conduccion:
        createUserDto.no_licencia_conduccion ?? undefined,

      vencimiento_licencia_conduccion:
        createUserDto.vencimiento_licencia_conduccion
          ? new Date(createUserDto.vencimiento_licencia_conduccion)
          : undefined,

      active: true,
    });

    return this.sanitize(newUser.toObject());
  }

  //-----------------------------------------------------
  // LOGIN
  //-----------------------------------------------------
  async validateUser(
    username: string,
    plainPassword: string,
  ) {
    const user = await this.userModel
      .findOne({ 'usuario.usuario': username })
      .lean();

    if (!user) return null;

    const ok = await bcrypt.compare(
      plainPassword,
      user.password,
    );
    if (!ok) return null;

    return this.sanitize(user);
  }

  //-----------------------------------------------------
  // FIND BY USERNAME
  //-----------------------------------------------------
  async findByUsername(username: string) {
    const user = await this.userModel
      .findOne({ 'usuario.usuario': username })
      .lean();

    return this.sanitize(user);
  }

  //-----------------------------------------------------
  // UPDATE PASSWORD
  //-----------------------------------------------------
  async updatePassword(id: string, newPassword: string) {
    const user = await this.userModel.findById(id);
    if (!user)
      throw new NotFoundException('Usuario no encontrado');

    user.password = await bcrypt.hash(newPassword, 10);
    user.must_change_password = false;
    await user.save();

    return this.sanitize(user.toObject());
  }

  //-----------------------------------------------------
  // FORGOT PASSWORD
  //-----------------------------------------------------
  async forgotPassword(identifier: string) {
    const lower = identifier.trim().toLowerCase();

    const user = await this.userModel.findOne({
      $or: [
        { 'usuario.correo': lower },
        { 'usuario.usuario': lower },
      ],
    });

    // Security: don't reveal if user exists or not
    if (!user || !user.usuario?.correo) {
      return { message: 'Si el correo o usuario está registrado, recibirá la contraseña temporal en su correo.' };
    }

    const tempPassword = this.generateTempPassword();
    user.password = await bcrypt.hash(tempPassword, 10);
    user.must_change_password = true;
    await user.save();

    // Non-blocking email
    this.emailService.sendTempPassword(
      user.usuario.correo,
      user.usuario.usuario,
      tempPassword,
    ).catch(() => {});

    return { message: 'Si el correo o usuario está registrado, recibirá la contraseña temporal en su correo.' };
  }

  private generateTempPassword(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  //-----------------------------------------------------
  // CREATE USER FOR ENTERPRISE (superadmin)
  //-----------------------------------------------------
  async createForEnterprise(
    enterpriseId: string,
    dto: {
      usuario: string;
      nombre?: string;
      apellido?: string;
      telefono?: string;
      correo?: string;
      document_type?: number;
      password: string;
    },
    enterpriseName?: string,
  ) {
    // Only one admin user per enterprise via this flow
    const existing = await this.userModel.findOne({
      enterprise_id: new Types.ObjectId(enterpriseId),
      roleType: 'admin',
    });

    if (existing) {
      throw new BadRequestException(
        'Ya existe un usuario administrador para esta empresa. Use la función de recuperación de contraseña si necesita acceso.',
      );
    }

    // Unique username check
    const usernameExists = await this.userModel.findOne({
      'usuario.usuario': dto.usuario.trim().toLowerCase(),
    });
    if (usernameExists) {
      throw new BadRequestException('El nombre de usuario ya existe');
    }

    const plainPassword = dto.password;
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    const newUser = await this.userModel.create({
      usuario: {
        usuario: dto.usuario.trim().toLowerCase(),
        nombre: dto.nombre ?? undefined,
        apellido: dto.apellido ?? undefined,
        telefono: dto.telefono ?? undefined,
        correo: dto.correo?.trim().toLowerCase() ?? undefined,
        document_type: dto.document_type ?? 1,
      },
      password: hashedPassword,
      roleType: 'admin',
      enterprise_id: new Types.ObjectId(enterpriseId),
      active: true,
      must_change_password: true,
    });

    // Send welcome email (non-blocking)
    if (dto.correo && enterpriseName) {
      this.emailService.sendEnterpriseWelcome(
        dto.correo.trim().toLowerCase(),
        dto.usuario,
        plainPassword,
        enterpriseName,
      ).catch(() => {});
    }

    return this.sanitize(newUser.toObject());
  }

  //-----------------------------------------------------
  // UPDATE GENERAL
  //-----------------------------------------------------
  async update(id: string, updateDto: any) {
    const user = await this.userModel.findById(id);
    if (!user)
      throw new NotFoundException('Usuario no encontrado');

    user.usuario = {
      ...user.usuario,
      ...(updateDto.usuario && { usuario: updateDto.usuario }),
      ...(updateDto.firstName && { nombre: updateDto.firstName }),
      ...(updateDto.lastName && { apellido: updateDto.lastName }),
      ...(updateDto.phone && { telefono: updateDto.phone }),
      ...(updateDto.email && { correo: updateDto.email }),
      ...(updateDto.documentType && {
        document_type: updateDto.documentType,
      }),
      ...(updateDto.documentNumber && {
        documentNumber: updateDto.documentNumber,
      }),
    };

    if (updateDto.roleType)
      user.roleType = updateDto.roleType;

    if (updateDto.active !== undefined)
      user.active = updateDto.active;

    if (updateDto.no_licencia_conduccion !== undefined) {
      user.no_licencia_conduccion =
        updateDto.no_licencia_conduccion;
    }

    if (
      updateDto.vencimiento_licencia_conduccion !==
      undefined
    ) {
      user.vencimiento_licencia_conduccion =
        updateDto.vencimiento_licencia_conduccion
          ? new Date(updateDto.vencimiento_licencia_conduccion)
          : undefined;
    }

    await user.save();
    return this.sanitize(user.toObject());
  }

  //-----------------------------------------------------
  // FIND DRIVERS CON PAGINACIÓN
  //-----------------------------------------------------
  async findDriversByEnterprise(
    user: any,
    query: {
      page?: number;
      numero_items?: number;
      documentNumber?: string;
      active?: boolean;
      sortField?: string;
      sortOrder?: 'asc' | 'desc';
    },
  ) {
    if (!user?.enterprise_id) {
      throw new BadRequestException('enterprise_id no presente en el token');
    }
  
    const enterpriseId = new Types.ObjectId(user.enterprise_id);
  
    const filters: any = {
      enterprise_id: enterpriseId,
      roleType: 'driver',
    };
  
    if (query.documentNumber) {
      filters['usuario.documentNumber'] = {
        $regex: query.documentNumber,
        $options: 'i',
      };
    }
  
    if (query.active !== undefined) {
      filters.active = query.active;
    }
  
    const sortField = query.sortField || 'usuario.nombre';
    const sortOrder = query.sortOrder === 'desc' ? -1 : 1;
  
    const total = await this.userModel.countDocuments(filters);
  
    // 🔥 Si no se envía numero_items, retorna todos
    const page = Number(query.page) || 1;
    const limit = Number(query.numero_items) || total;
    const skip = (page - 1) * limit;
  
    const drivers = await this.userModel
      .find(filters)
      .sort({ [sortField]: sortOrder })
      .skip(skip)
      .limit(limit)
      .lean();
  
    return {
      data: drivers.map((u) => this.sanitize(u)),
      total,
      page,
      numero_items: limit,
    };
  }


//-----------------------------------------------------
// CREATE STAFF (admin, operator, viewer)
//-----------------------------------------------------
async createStaff(createUserDto: CreateUserDto, currentUser: any) {
  if (!currentUser?.enterprise_id) {
    throw new BadRequestException('enterprise_id no presente en el token');
  }

  const allowedRoles = ['admin', 'operator', 'viewer'];
  const role = createUserDto.roleType ?? 'operator';

  if (!allowedRoles.includes(role)) {
    throw new BadRequestException(
      `Rol no permitido. Use: ${allowedRoles.join(', ')}`,
    );
  }

  const exists = await this.userModel.findOne({
    'usuario.usuario': createUserDto.usuario,
  });
  if (exists) {
    throw new BadRequestException('El nombre de usuario ya existe');
  }

  const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

  const newUser = await this.userModel.create({
    usuario: {
      usuario: createUserDto.usuario,
      nombre: createUserDto.firstName ?? undefined,
      apellido: createUserDto.lastName ?? undefined,
      telefono: createUserDto.phone ?? undefined,
      correo: createUserDto.email ?? undefined,
      document_type: createUserDto.documentType ?? 1,
      documentNumber: createUserDto.documentNumber ?? undefined,
    },
    password: hashedPassword,
    roleType: role,
    enterprise_id: new Types.ObjectId(currentUser.enterprise_id),
    active: true,
  });

  return this.sanitize(newUser.toObject());
}

//-----------------------------------------------------
// LIST STAFF (admin, operator, viewer)
//-----------------------------------------------------
async findStaffByEnterprise(
  currentUser: any,
  query: {
    page?: number;
    numero_items?: number;
    search?: string;
    roleType?: string;
    active?: boolean;
    sortField?: string;
    sortOrder?: 'asc' | 'desc';
  },
) {
  if (!currentUser?.enterprise_id) {
    throw new BadRequestException('enterprise_id no presente en el token');
  }

  const filters: any = {
    enterprise_id: new Types.ObjectId(currentUser.enterprise_id),
    roleType: { $in: ['admin', 'operator', 'viewer'] },
  };

  if (query.roleType && ['admin', 'operator', 'viewer'].includes(query.roleType)) {
    filters.roleType = query.roleType;
  }

  if (query.search) {
    filters.$or = [
      { 'usuario.usuario':  { $regex: query.search, $options: 'i' } },
      { 'usuario.nombre':   { $regex: query.search, $options: 'i' } },
      { 'usuario.apellido': { $regex: query.search, $options: 'i' } },
      { 'usuario.correo':   { $regex: query.search, $options: 'i' } },
    ];
  }

  if (query.active !== undefined) {
    filters.active = query.active;
  }

  const sortField = query.sortField || 'createdAt';
  const sortOrder = query.sortOrder === 'asc' ? 1 : -1;
  const total     = await this.userModel.countDocuments(filters);
  const page      = Number(query.page) || 1;
  const limit     = Number(query.numero_items) || total;
  const skip      = (page - 1) * limit;

  const staff = await this.userModel
    .find(filters)
    .sort({ [sortField]: sortOrder })
    .skip(skip)
    .limit(limit)
    .lean();

  return {
    data: staff.map((u) => this.sanitize(u)),
    total,
    page,
    numero_items: limit,
  };
}

//-----------------------------------------------------
// TOGGLE ACTIVE USUARIO
//-----------------------------------------------------
async toggleActiveUser(id: string, currentUser: any) {
  if (!Types.ObjectId.isValid(id)) {
    throw new BadRequestException('ID de usuario inválido');
  }

  const user = await this.userModel.findOne({
    _id: id,
    enterprise_id: new Types.ObjectId(currentUser.enterprise_id),
  });

  if (!user) throw new NotFoundException('Usuario no encontrado');

  if (String(user._id) === String(currentUser.sub)) {
    throw new BadRequestException('No puede desactivar su propio usuario');
  }

  user.active = !user.active;
  await user.save();

  return this.sanitize(user.toObject());
}

}