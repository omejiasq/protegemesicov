export type TipoId = 1 | 2 | 3 | 4; // 1:Programas, 2:Preventivo, 3:Alistamiento, 4:Correctivo

export interface BaseMaintenance {
  _id?: string;
  enterprise_id?: string;
  tipoId: TipoId;
  placa: string;
  vigiladoId?: number;
  estado?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type MaintenanceProgram = BaseMaintenance & { tipoId: 1 };
export type PreventiveTask     = BaseMaintenance & { tipoId: 2 };
export type CorrectiveTask     = BaseMaintenance & { tipoId: 4 };

export interface EnlistmentActivity {
  id: number;
  nombre: string;
  estado: boolean;
}

export interface Enlistment {
  _id?: string;
  enterprise_id?: string;
  mantenimientoId: string; // referencia al maintenance (tipoId=3)
  estado?: boolean;
  activities?: EnlistmentActivity[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Paged<T> {
  page: number;
  numero_items: number;
  total: number;
  items: T[];
}

export interface ProgramFile {
_id: string
tipoId: string
vigiladoId: string
documento: string
nombreOriginal: string
ruta: string
enterprise_id: string 
createdBy: string
}