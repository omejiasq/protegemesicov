import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { ObjectId } from 'mongodb';

export interface EnterpriseInfo {
  _id: string;
  name: string;
  vigiladoId: string; // NIT
  logo?: string;
}

@Injectable()
export class EnterpriseService {
  constructor(@InjectConnection() private connection: Connection) {}

  /**
   * Obtiene la información básica de la empresa por ID
   */
  async getEnterpriseInfo(enterpriseId: string): Promise<EnterpriseInfo | null> {
    try {
      const collection = this.connection.collection('enterprises');
      const enterprise = await collection.findOne({ _id: new ObjectId(enterpriseId) });

      if (!enterprise) {
        return null;
      }

      return {
        _id: enterprise._id.toString(),
        name: enterprise.name || 'Empresa',
        vigiladoId: enterprise.vigiladoId || 'N/A',
        logo: enterprise.logo || undefined
      };
    } catch (error) {
      console.error('Error fetching enterprise info:', error);
      return {
        _id: enterpriseId,
        name: 'Empresa',
        vigiladoId: 'N/A',
        logo: undefined
      };
    }
  }
}