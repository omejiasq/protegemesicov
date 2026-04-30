import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';

import { User } from '../schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { EmailService } from '../libs/email/email.service';

/** ISO 27001 password policy validator */
function assertPasswordPolicy(password: string): void {
  if (!password || password.length < 12)
    throw new BadRequestException('La contraseña debe tener al menos 12 caracteres');
  if (!/[A-Z]/.test(password))
    throw new BadRequestException('La contraseña debe incluir al menos una letra mayúscula');
  if (!/[a-z]/.test(password))
    throw new BadRequestException('La contraseña debe incluir al menos una letra minúscula');
  if (!/[0-9]/.test(password))
    throw new BadRequestException('La contraseña debe incluir al menos un número');
  if (!/[!@#$%^&*()\-_=+\[\]{}|;:,.<>?]/.test(password))
    throw new BadRequestException('La contraseña debe incluir al menos un carácter especial (!@#$%^&*…)');
}

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
  // UTIL — VALIDAR USERNAME ÚNICO
  //-----------------------------------------------------
  private async assertUsernameUnique(username: string, excludeId?: string) {
    const query: any = { 'usuario.usuario': username };
    if (excludeId) query._id = { $ne: excludeId };
    const exists = await this.userModel.findOne(query).lean();
    if (exists) {
      throw new ConflictException('El nombre de usuario ya está en uso');
    }
  }

  //-----------------------------------------------------
  // UTIL — VALIDAR CORREO ÚNICO
  //-----------------------------------------------------
  private async assertEmailUnique(correo: string, excludeId?: string) {
    const lower = correo.trim().toLowerCase();
    const query: any = { 'usuario.correo': lower };
    if (excludeId) query._id = { $ne: excludeId };
    const exists = await this.userModel.findOne(query).lean();
    if (exists) {
      throw new BadRequestException('El correo electrónico ya está registrado por otro usuario');
    }
  }

  //-----------------------------------------------------
  // UTIL — GENERAR USERNAME ÚNICO A PARTIR DEL DOCUMENTO
  //-----------------------------------------------------
  private async generateUniqueUsername(documentNumber: string, excludeId?: string): Promise<string> {
    if (!documentNumber || !documentNumber.trim()) {
      throw new BadRequestException('Número de documento requerido para generar username');
    }

    const baseUsername = documentNumber.trim();
    let username = baseUsername;
    let suffix = 0;

    // Verificar si el username base está disponible
    while (true) {
      const query: any = { 'usuario.usuario': username };
      if (excludeId) query._id = { $ne: excludeId };

      const exists = await this.userModel.findOne(query).lean();
      if (!exists) {
        return username; // Username disponible
      }

      // Si está ocupado, probar con sufijo
      suffix++;
      username = `${baseUsername}_${suffix}`;

      // Evitar bucles infinitos (límite de 1000 intentos)
      if (suffix > 1000) {
        throw new BadRequestException('No se pudo generar un username único para este documento');
      }
    }
  }

  //-----------------------------------------------------
  // UTIL — SINCRONIZAR USERNAME CON DOCUMENTO
  //-----------------------------------------------------
  private async syncUsernameWithDocument(userId: string, newDocumentNumber: string): Promise<void> {
    if (!newDocumentNumber || !newDocumentNumber.trim()) {
      return; // No hacer nada si no hay documento
    }

    const currentUser = await this.userModel.findById(userId);
    if (!currentUser) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const currentUsername = currentUser.usuario.usuario;
    const currentDocument = currentUser.usuario.documentNumber;

    // Si el documento no cambió, no hacer nada
    if (currentDocument === newDocumentNumber.trim()) {
      return;
    }

    // Generar nuevo username único basado en el nuevo documento
    const newUsername = await this.generateUniqueUsername(newDocumentNumber.trim(), userId);

    // Solo actualizar si el username cambió
    if (currentUsername !== newUsername) {
      await this.userModel.findByIdAndUpdate(userId, {
        'usuario.usuario': newUsername,
      });

      console.log(`🔄 Username sincronizado: ${currentUsername} → ${newUsername} (documento: ${currentDocument} → ${newDocumentNumber})`);
    }
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

    // Si no se proporciona username pero sí documentNumber, generar username automáticamente
    let finalUsername = createUserDto.usuario;
    if (!finalUsername && createUserDto.documentNumber) {
      finalUsername = await this.generateUniqueUsername(createUserDto.documentNumber);
    } else if (!finalUsername && !createUserDto.documentNumber) {
      throw new BadRequestException('Se requiere usuario o número de documento para crear el usuario');
    } else if (finalUsername) {
      await this.assertUsernameUnique(finalUsername);
    }

    // Si no se proporcionó username, usar el documento
    if (!finalUsername && createUserDto.documentNumber) {
      finalUsername = createUserDto.documentNumber;
    }

    if (createUserDto.email) {
      await this.assertEmailUnique(createUserDto.email);
    }

    assertPasswordPolicy(createUserDto.password);
    const hashedPassword = await bcrypt.hash(
      createUserDto.password,
      10,
    );

    try {
      const isDriver = (createUserDto.roleType ?? 'admin') === 'driver';

      const newUser = await this.userModel.create({
        usuario: {
          usuario: finalUsername, // Usar el username generado o validado
          nombre: createUserDto.firstName ?? undefined,
          apellido: createUserDto.lastName ?? undefined,
          telefono: createUserDto.phone ?? undefined,
          correo: createUserDto.email ?? undefined,
          document_type: createUserDto.documentType ?? 1,
          documentNumber: createUserDto.documentNumber ?? undefined,
        },
        password: hashedPassword,
        roleType: createUserDto.roleType ?? 'admin',
        enterprise_id: new Types.ObjectId(currentUser.enterprise_id),

        no_licencia_conduccion:
          createUserDto.no_licencia_conduccion ?? undefined,

        vencimiento_licencia_conduccion:
          createUserDto.vencimiento_licencia_conduccion
            ? new Date(createUserDto.vencimiento_licencia_conduccion)
            : undefined,

        // Conductores siempre reciben permiso de alistamiento móvil por defecto
        menu_permissions: isDriver ? ['mob_enlistment'] : [],

        // Campos de auditoría del interceptor
        createdBy: (createUserDto as any).createdBy ? new Types.ObjectId((createUserDto as any).createdBy) : undefined,

        active: true,
      });

      return this.sanitize(newUser.toObject());
    } catch (err: any) {
      if (err?.code === 11000) {
        throw new ConflictException('El número de documento ya está registrado como usuario');
      }
      throw err;
    }
  }

  //-----------------------------------------------------
  // REGISTER (PÚBLICO)
  //-----------------------------------------------------
  async register(createUserDto: CreateUserDto) {
    await this.assertUsernameUnique(createUserDto.usuario);

    if (createUserDto.email) {
      await this.assertEmailUnique(createUserDto.email);
    }

    const hashedPassword = await bcrypt.hash(
      createUserDto.password,
      10,
    );

    try {
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
    } catch (err: any) {
      if (err?.code === 11000) {
        throw new ConflictException('El número de documento ya está registrado como usuario');
      }
      throw err;
    }
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

    await this.assertUsernameUnique(createUserDto.usuario);

    if (createUserDto.email) {
      await this.assertEmailUnique(createUserDto.email);
    }

    const hashedPassword = await bcrypt.hash(
      createUserDto.password,
      10,
    );

    try {
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
    } catch (err: any) {
      if (err?.code === 11000) {
        throw new ConflictException('El número de documento ya está registrado como usuario');
      }
      throw err;
    }
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

    assertPasswordPolicy(newPassword);
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

    // Unique email check
    if (dto.correo) {
      await this.assertEmailUnique(dto.correo);
    }

    const plainPassword = dto.password;
    assertPasswordPolicy(plainPassword);
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

    if (updateDto.email) {
      await this.assertEmailUnique(updateDto.email, id);
    }

    // 🔄 SINCRONIZACIÓN AUTOMÁTICA: Si cambia documentNumber, sincronizar username
    let shouldSyncUsername = false;
    if (updateDto.documentNumber && updateDto.documentNumber !== user.usuario.documentNumber) {
      shouldSyncUsername = true;
    }

    if (updateDto.usuario)      user.usuario.usuario       = updateDto.usuario;
    if (updateDto.firstName)    user.usuario.nombre        = updateDto.firstName;
    if (updateDto.lastName  !== undefined) user.usuario.apellido     = updateDto.lastName;
    if (updateDto.phone     !== undefined) user.usuario.telefono     = updateDto.phone;
    if (updateDto.email)        user.usuario.correo        = updateDto.email;
    if (updateDto.documentType) user.usuario.document_type = updateDto.documentType;
    if (updateDto.documentNumber) user.usuario.documentNumber = updateDto.documentNumber;

    // Si cambió el documento y no se especificó un username manualmente, sincronizar automáticamente
    if (shouldSyncUsername && !updateDto.usuario) {
      const newUsername = await this.generateUniqueUsername(updateDto.documentNumber, id);
      user.usuario.usuario = newUsername;
      console.log(`🔄 Username auto-sincronizado: ${user.usuario.usuario} → ${newUsername} (documento actualizado)`);
    }

    user.markModified('usuario');

    if (updateDto.roleType)
      user.roleType = updateDto.roleType;

    if (updateDto.active !== undefined)
      user.active = updateDto.active;

    // Cambio de contraseña opcional (para conductores u otros usuarios)
    if (updateDto.newPassword && updateDto.newPassword.trim()) {
      assertPasswordPolicy(updateDto.newPassword.trim());
      user.password = await bcrypt.hash(updateDto.newPassword.trim(), 10);
    }

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

    // Campos de auditoría del interceptor
    if ((updateDto as any).updatedBy) {
      user.updatedBy = new Types.ObjectId((updateDto as any).updatedBy);
    }

    await user.save();
    return this.sanitize(user.toObject());
  }

  //-----------------------------------------------------
  // MIGRACIÓN / DIAGNÓSTICO DE USERNAMES
  //-----------------------------------------------------

  /**
   * Detecta usuarios con problemas de sincronización username/documento
   */
  async diagnoseUsernameIssues() {
    const users = await this.userModel.find({
      'usuario.documentNumber': { $exists: true, $ne: null, $nin: ['', null] }
    }).lean();

    const issues: Array<
      | {
          userId: Types.ObjectId;
          username: string;
          documentNumber: string | undefined;
          issue: string;
          description: string;
        }
      | {
          documentNumber: any;
          users: any;
          issue: string;
          description: string;
        }
    > = [];
    const conflicts = new Map();

    for (const user of users) {
      const username = user.usuario.usuario;
      const documentNumber = user.usuario.documentNumber;

      // Problema 1: Username no coincide con documento
      if (username !== documentNumber) {
        issues.push({
          userId: user._id,
          username,
          documentNumber,
          issue: 'username_document_mismatch',
          description: `Username '${username}' no coincide con documento '${documentNumber}'`
        });
      }

      // Problema 2: Múltiples usuarios con mismo documento
      if (conflicts.has(documentNumber)) {
        conflicts.get(documentNumber).push(user);
      } else {
        conflicts.set(documentNumber, [user]);
      }
    }

    // Agregar conflictos de documentos duplicados
    for (const [documentNumber, userList] of conflicts.entries()) {
      if (userList.length > 1) {
        issues.push({
          documentNumber,
          users: userList.map(u => ({ userId: u._id, username: u.usuario.usuario })),
          issue: 'duplicate_documents',
          description: `${userList.length} usuarios tienen el mismo documento '${documentNumber}'`
        });
      }
    }

    return {
      totalUsers: users.length,
      totalIssues: issues.length,
      issues
    };
  }

  /**
   * Corrige automáticamente los problemas de sincronización
   */
  async fixUsernameIssues(dryRun = true) {
    const diagnosis = await this.diagnoseUsernameIssues();
    const actions: Array<{
      userId: any;
      action: string;
      from?: any;
      to?: string;
      error?: any;
      executed: boolean;
    }> = [];

    for (const issue of diagnosis.issues) {
      if (issue.issue === 'username_document_mismatch' && 'userId' in issue && issue.documentNumber) {
        try {
          const newUsername = await this.generateUniqueUsername(issue.documentNumber, String(issue.userId));

          if (!dryRun) {
            await this.userModel.findByIdAndUpdate(issue.userId, {
              'usuario.usuario': newUsername
            });
          }

          actions.push({
            userId: issue.userId,
            action: 'update_username',
            from: issue.username,
            to: newUsername,
            executed: !dryRun
          });
        } catch (error) {
          actions.push({
            userId: issue.userId,
            action: 'error',
            error: error.message,
            executed: false
          });
        }
      }
    }

    return {
      dryRun,
      diagnosis,
      actions,
      summary: {
        totalActions: actions.length,
        executed: actions.filter(a => a.executed).length,
        errors: actions.filter(a => a.action === 'error').length
      }
    };
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
      nombre?: string;
      search?: string;
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

    // Búsqueda por nombre/apellido
    if (query.nombre) {
      filters['$or'] = [
        { 'usuario.nombre': { $regex: query.nombre, $options: 'i' } },
        { 'usuario.apellido': { $regex: query.nombre, $options: 'i' } },
      ];
    }

    // Búsqueda combinada (documento O nombre) — para autocomplete
    if (query.search) {
      filters['$or'] = [
        { 'usuario.documentNumber': { $regex: query.search, $options: 'i' } },
        { 'usuario.nombre': { $regex: query.search, $options: 'i' } },
        { 'usuario.apellido': { $regex: query.search, $options: 'i' } },
      ];
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

  // Si no se proporciona username pero sí documentNumber, generar username automáticamente
  let finalUsername = createUserDto.usuario;
  if (!finalUsername && createUserDto.documentNumber) {
    finalUsername = await this.generateUniqueUsername(createUserDto.documentNumber);
  } else if (!finalUsername && !createUserDto.documentNumber) {
    throw new BadRequestException('Se requiere usuario o número de documento para crear el usuario');
  } else if (finalUsername) {
    await this.assertUsernameUnique(finalUsername);
  }

  if (createUserDto.email) {
    await this.assertEmailUnique(createUserDto.email);
  }

  assertPasswordPolicy(createUserDto.password);
  const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

  const newUser = await this.userModel.create({
    usuario: {
      usuario: finalUsername, // Usar el username generado o validado
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

    // Campos de auditoría del interceptor
    createdBy: (createUserDto as any).createdBy ? new Types.ObjectId((createUserDto as any).createdBy) : undefined,

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
// FIND ADMINS BY ENTERPRISE (superadmin)
//-----------------------------------------------------
async findAdminsByEnterprise(enterpriseId: string) {
  if (!Types.ObjectId.isValid(enterpriseId)) {
    throw new BadRequestException('ID de empresa inválido');
  }
  const users = await this.userModel
    .find({
      enterprise_id: new Types.ObjectId(enterpriseId),
      roleType: { $in: ['admin', 'superadmin'] },
    })
    .sort({ createdAt: 1 })
    .lean();
  return users.map((u) => this.sanitize(u));
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

//-----------------------------------------------------
// MENU PERMISSIONS (por usuario)
//-----------------------------------------------------
async getMenuPermissions(id: string) {
  if (!Types.ObjectId.isValid(id)) throw new BadRequestException('ID inválido');
  const user = await this.userModel.findById(id, { menu_permissions: 1 }).lean();
  if (!user) throw new NotFoundException('Usuario no encontrado');
  return { menu_permissions: (user as any).menu_permissions ?? [] };
}

async setMenuPermissions(id: string, keys: string[], currentUser: any) {
  if (!Types.ObjectId.isValid(id)) throw new BadRequestException('ID inválido');
  if (!Array.isArray(keys)) throw new BadRequestException('keys debe ser un array de strings');

  const user = await this.userModel.findOneAndUpdate(
    { _id: id, enterprise_id: new Types.ObjectId(currentUser.enterprise_id) },
    { $set: { menu_permissions: keys } },
    { new: true },
  );
  if (!user) throw new NotFoundException('Usuario no encontrado');
  return { menu_permissions: (user as any).menu_permissions };
}

}