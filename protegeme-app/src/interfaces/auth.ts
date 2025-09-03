export interface RegisterUserDto {
  usuario: string; 
  nombre: string;
  apellido: string;
  telefono?: string | null;
  correo: string;
}

export interface RegisterRoleDto {
  nombre: string;
  modulos: any[];
}

export interface RegisterPayload {
  usuario: RegisterUserDto;
  password: string;
  rol: RegisterRoleDto;
  enterprise_id: string;
}

export interface RegisterResponse {
  usuario?: RegisterUserDto;
  enterprise_id?: string;
  rol: any,
  token?: string;
}
