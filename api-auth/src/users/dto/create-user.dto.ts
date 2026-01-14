export class CreateUserDto {
  usuario: string;
  password: string;

  token?: string | null;

  firstName: string;
  lastName: string;

  phone?: string;
  email?: string;

  documentType?: string;
  documentNumber?: string;

  roleType: 'admin' | 'driver' | 'operator' | 'viewer';

  enterprise_id?: string;

  vigiladoId?: number;
  vigiladoToken?: string;
}
