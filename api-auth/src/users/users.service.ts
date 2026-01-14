import { Injectable, NotFoundException } from '@nestjs/common';
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
  // CREATE (LEGACY COMPATIBLE)
  //-----------------------------------------------------
  async create(createUserDto: CreateUserDto) {
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    const newUser = await this.userModel.create({
      usuario: {
        usuario: createUserDto.usuario,
        nombre: createUserDto.firstName ?? null,
        apellido: createUserDto.lastName ?? null,
        telefono: createUserDto.phone ?? null,
        correo: createUserDto.email ?? null,
        document_type: createUserDto.documentType ?? 1,
        documentNumber: createUserDto.documentNumber ?? null,
      },
      password: hashedPassword,
      roleType: createUserDto.roleType ?? 'admin',
      enterprise_id: createUserDto.enterprise_id
        ? new Types.ObjectId(createUserDto.enterprise_id)
        : undefined,
      active: true,
    });

    return this.sanitize(newUser.toObject());
  }

  //-----------------------------------------------------
  // LEGACY SUPPORT (NO QUITAR)
  //-----------------------------------------------------
  async createFromDto(dto: any) {
    return this.create(dto);
  }

  //-----------------------------------------------------
  // LOGIN — USADO POR AuthService
  //-----------------------------------------------------
  async validateUser(username: string, plainPassword: string) {
    const user = await this.userModel
      .findOne({ 'usuario.usuario': username })
      .lean();

    if (!user) return null;

    const ok = await bcrypt.compare(plainPassword, user.password);
    if (!ok) return null;

    return this.sanitize(user);
  }

  //-----------------------------------------------------
  // USADO POR JwtStrategy
  //-----------------------------------------------------
  async findByUsername(username: string) {
    const user = await this.userModel
      .findOne({ 'usuario.usuario': username })
      .lean();

    return this.sanitize(user);
  }

  //-----------------------------------------------------
  // UPDATE PASSWORD — USADO POR CONTROLLER
  //-----------------------------------------------------
  async updatePassword(id: string, newPassword: string) {
    const user = await this.userModel.findById(id);
    if (!user) throw new NotFoundException('Usuario no encontrado');

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    return this.sanitize(user.toObject());
  }

  //-----------------------------------------------------
  // UPDATE USUARIO (SIN PASSWORD)
  //-----------------------------------------------------
  async update(id: string, updateDto: any) {
    const user = await this.userModel.findById(id);
    if (!user) throw new NotFoundException('Usuario no encontrado');

    // -----------------------------
    // SUBDOCUMENTO usuario
    // -----------------------------
    user.usuario = {
      ...user.usuario,
      ...(updateDto.usuario && { usuario: updateDto.usuario }),
      ...(updateDto.firstName && { nombre: updateDto.firstName }),
      ...(updateDto.lastName && { apellido: updateDto.lastName }),
      ...(updateDto.phone && { telefono: updateDto.phone }),
      ...(updateDto.email && { correo: updateDto.email }),
      ...(updateDto.documentType && { document_type: updateDto.documentType }),
      ...(updateDto.documentNumber && { documentNumber: updateDto.documentNumber }),
    };

    // -----------------------------
    // CAMPOS DIRECTOS
    // -----------------------------
    if (updateDto.roleType) user.roleType = updateDto.roleType;

    if (updateDto.enterprise_id !== undefined) {
        user.enterprise_id = updateDto.enterprise_id
        ? new Types.ObjectId(updateDto.enterprise_id)
        : undefined;
    }

    if (updateDto.active !== undefined) {
      user.active = updateDto.active;
    }

    await user.save();

    return this.sanitize(user.toObject());
  }

  //-----------------------------------------------------
  // CRUD BÁSICO
  //-----------------------------------------------------
  async findAll() {
    const users = await this.userModel.find().lean();
    return users.map((u) => this.sanitize(u));
  }

  async findById(id: string) {
    const user = await this.userModel.findById(id).lean();
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return this.sanitize(user);
  }

  async remove(id: string) {
    const user = await this.userModel.findByIdAndDelete(id).lean();
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return this.sanitize(user);
  }
}
