import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MenuCatalog, MenuCatalogDocument } from '../schemas/menu-catalog.schema';

// Catálogo predeterminado que se siembra la primera vez
const DEFAULT_CATALOG = [
  // ── Web ─────────────────────────────────────────────────────────
  { key: 'web_enlistment',      label: 'Alistamientos',     platform: 'web', icon: 'pi pi-list-check',    route: '/maintenance/enlistment',        category: 'MANTENIMIENTOS', order: 1  },
  { key: 'web_corrective',      label: 'Correctivos',       platform: 'web', icon: 'pi pi-wrench',        route: '/maintenance/corrective',         category: 'MANTENIMIENTOS', order: 2  },
  { key: 'web_preventive',      label: 'Preventivos',       platform: 'web', icon: 'pi pi-shield',        route: '/maintenance/preventive',         category: 'MANTENIMIENTOS', order: 3  },
  { key: 'web_calendar',        label: 'Calendario',        platform: 'web', icon: 'pi pi-calendar',      route: '/maintenance/maintenancecalendar', category: 'MANTENIMIENTOS', order: 4  },
  { key: 'web_maint_types',     label: 'Partes mant.',      platform: 'web', icon: 'pi pi-list',          route: '/maintenance/types',              category: 'MANTENIMIENTOS', order: 5  },
  { key: 'web_inspection_types',label: 'Partes alist.',     platform: 'web', icon: 'pi pi-clipboard',     route: '/maintenance/inspection-types',   category: 'MANTENIMIENTOS', order: 6  },
  { key: 'web_fuec',            label: 'FUEC',              platform: 'web', icon: 'pi pi-file-export',   route: '/maintenance/fuec',               category: 'MANTENIMIENTOS', order: 7  },
  { key: 'web_suppliers',       label: 'Proveedores',       platform: 'web', icon: 'pi pi-building',      route: '/maintenance/suppliers',          category: 'MANTENIMIENTOS', order: 8  },
  { key: 'web_response_types',  label: 'Tipos respuesta',   platform: 'web', icon: 'pi pi-check-square',  route: '/maintenance/response-types',     category: 'MANTENIMIENTOS', order: 9  },
  { key: 'web_vehicles',        label: 'Vehículos',         platform: 'web', icon: 'pi pi-car',           route: '/vehicles',                       category: 'CONFIG',         order: 1  },
  { key: 'web_drivers',         label: 'Conductores',       platform: 'web', icon: 'pi pi-users',         route: '/drivers',                        category: 'CONFIG',         order: 2  },
  { key: 'web_users',           label: 'Usuarios',          platform: 'web', icon: 'pi pi-id-card',       route: '/staff',                          category: 'CONFIG',         order: 3  },
  { key: 'web_enterprise',      label: 'Mi Empresa',        platform: 'web', icon: 'pi pi-building',      route: '/enterprise/settings',            category: 'CONFIG',         order: 4  },
  { key: 'web_menu_perms',      label: 'Permisos de Menú',  platform: 'web', icon: 'pi pi-lock',          route: '/enterprise/menu-permissions',    category: 'CONFIG',         order: 5  },
  { key: 'web_audit',           label: 'Auditoría SICOV',   platform: 'web', icon: 'pi pi-history',       route: '/audit-report',                   category: 'REPORTES',       order: 1  },
  // ── Mobile ──────────────────────────────────────────────────────
  { key: 'mob_enlistment',      label: 'Alistamientos',     platform: 'mobile', icon: 'pi pi-list-check', route: '',                                category: 'PRINCIPAL',      order: 1  },
  { key: 'mob_corrective',      label: 'Correctivos',       platform: 'mobile', icon: 'pi pi-wrench',     route: '',                                category: 'PRINCIPAL',      order: 2  },
  { key: 'mob_preventive',      label: 'Preventivos',       platform: 'mobile', icon: 'pi pi-shield',     route: '',                                category: 'PRINCIPAL',      order: 3  },
];

@Injectable()
export class MenuCatalogService {
  constructor(
    @InjectModel(MenuCatalog.name)
    private readonly model: Model<MenuCatalogDocument>,
  ) {}

  /** Siembra el catálogo por defecto si la colección está vacía */
  async seed() {
    const count = await this.model.countDocuments();
    if (count === 0) {
      await this.model.insertMany(DEFAULT_CATALOG);
    }
  }

  /** Devuelve todos los ítems (opcionalmente filtrados por platform) */
  async findAll(platform?: string): Promise<MenuCatalog[]> {
    const filter: any = {};
    if (platform) filter.platform = { $in: [platform, 'both'] };
    return this.model.find(filter).sort({ category: 1, order: 1 }).lean();
  }

  /** Devuelve solo los ítems enabled */
  async findEnabled(platform?: string): Promise<MenuCatalog[]> {
    const filter: any = { enabled: true };
    if (platform) filter.platform = { $in: [platform, 'both'] };
    return this.model.find(filter).sort({ category: 1, order: 1 }).lean();
  }

  async create(dto: any, user: any): Promise<MenuCatalog> {
    if (user?.role !== 'superadmin') throw new ForbiddenException('Solo superadmin');
    const exists = await this.model.findOne({ key: dto.key });
    if (exists) throw new ConflictException(`Ya existe un ítem con key '${dto.key}'`);
    return this.model.create(dto);
  }

  async update(id: string, dto: any, user: any): Promise<MenuCatalog> {
    if (user?.role !== 'superadmin') throw new ForbiddenException('Solo superadmin');
    const item = await this.model.findByIdAndUpdate(id, dto, { new: true });
    if (!item) throw new NotFoundException('Ítem no encontrado');
    return item;
  }

  async remove(id: string, user: any): Promise<void> {
    if (user?.role !== 'superadmin') throw new ForbiddenException('Solo superadmin');
    const item = await this.model.findByIdAndDelete(id);
    if (!item) throw new NotFoundException('Ítem no encontrado');
  }
}
