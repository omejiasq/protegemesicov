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

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
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
    await user.save();

    return this.sanitize(user.toObject());
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
}