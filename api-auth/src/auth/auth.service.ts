import {
  Injectable,
  ForbiddenException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { Enterprise, EnterpriseDocument } from '../schemas/enterprise.schema';
import { MenuCatalog, MenuCatalogDocument } from '../schemas/menu-catalog.schema';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    @InjectModel(Enterprise.name)
    private readonly enterpriseModel: Model<EnterpriseDocument>,
    @InjectModel(MenuCatalog.name)
    private readonly menuCatalogModel: Model<MenuCatalogDocument>,
  ) {}

  async register(userInfo: any) {
    return this.usersService.register(userInfo);
  }

  async validateUser(usuario: string, password: string) {
    return this.usersService.validateUser(usuario, password);
  }

  async login(user: any) {
    if (!user) return null;

    if (user.active === false) {
      throw new ForbiddenException('Su usuario está desactivado');
    }

    let vigiladoId = user.vigiladoId ?? null;
    let vigiladoToken = user.vigiladoToken ?? null;
    let tipo_habilitacion: string = 'CARRETERA';
    let resolvedMenuPermissions: string[] = [];

    if (user.enterprise_id) {
      const enterprise = await this.enterpriseModel
        .findById(user.enterprise_id, {
          active: 1,
          deactivationReason: 1,
          vigiladoId: 1,
          vigiladoToken: 1,
          tipo_habilitacion: 1,
          enterprise_menu_permissions: 1,
        })
        .lean();

      if (!enterprise) {
        throw new UnauthorizedException('Empresa no encontrada');
      }

      if (!enterprise.active) {
        throw new ForbiddenException(
          enterprise.deactivationReason
            ? `Empresa desactivada: ${enterprise.deactivationReason}`
            : 'Su empresa no tiene acceso activo a la plataforma',
        );
      }

      vigiladoId = enterprise.vigiladoId ?? vigiladoId;
      vigiladoToken = enterprise.vigiladoToken ?? vigiladoToken;
      tipo_habilitacion = (enterprise as any).tipo_habilitacion ?? 'CARRETERA';

      // ── Resolver permisos de menú ──────────────────────────────────────
      const userMenuKeys: string[] = (user.menu_permissions ?? []);
      const enterpriseMenuKeys: string[] = (enterprise as any).enterprise_menu_permissions ?? [];

      if (userMenuKeys.length > 0) {
        // Permisos explícitos del usuario: sobreescribe cualquier permiso de empresa
        resolvedMenuPermissions = userMenuKeys;
      } else if (enterpriseMenuKeys.length > 0) {
        // Sin permisos individuales → hereda los de la empresa
        resolvedMenuPermissions = enterpriseMenuKeys;
      } else {
        // Sin permisos en usuario ni empresa → array vacío.
        // El frontend interpreta [] como "sin restricciones para can()" pero
        // canStrict() exige que la clave esté explícitamente presente,
        // por lo que los módulos restringidos (ej. DESPACHOS) permanecen ocultos.
        resolvedMenuPermissions = [];
      }
    }

    // ✅ Los datos del usuario están en el subdocumento "usuario"
    const info = user.usuario ?? {};

    const payload = {
      sub: String(user._id),
      username: info.usuario ?? null,
      role: user.roleType,
      enterprise_id: user.enterprise_id ?? null,
      vigiladoId,
      vigiladoToken,
      tipo_habilitacion,
    };

    const token = this.jwtService.sign(payload);

    return {
      user: {
        _id: user._id,
        username: info.usuario ?? null,
        email: info.correo ?? null,
        firstName: info.nombre ?? null,
        lastName: info.apellido ?? null,
        phone: info.telefono ?? null,
        documentType: info.document_type ?? null,
        documentNumber: info.documentNumber ?? null,
        roleType: user.roleType,
        must_change_password: user.must_change_password ?? false,
        tipo_habilitacion,
        menu_permissions: resolvedMenuPermissions,
      },
      token,
      enterprise_id: user.enterprise_id ?? null,
      must_change_password: user.must_change_password ?? false,
    };
  }

  async forgotPassword(identifier: string) {
    if (!identifier?.trim()) {
      throw new BadRequestException('Se requiere usuario o correo');
    }
    return this.usersService.forgotPassword(identifier);
  }
}