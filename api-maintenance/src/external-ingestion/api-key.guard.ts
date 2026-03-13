// src/external-ingestion/api-key.guard.ts
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { createHash } from 'crypto';
import { ApiKey, ApiKeyDocument } from '../schema/api-key.schema';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    @InjectModel(ApiKey.name)
    private readonly apiKeyModel: Model<ApiKeyDocument>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const rawKey: string | undefined =
      request.headers['x-api-key'] ??
      request.headers['x-api-key'.toLowerCase()];

    if (!rawKey) {
      throw new UnauthorizedException('API Key requerida (header X-Api-Key)');
    }

    const hash = createHash('sha256').update(rawKey).digest('hex');

    const keyDoc = await this.apiKeyModel.findOne({
      keyHash: hash,
      active: true,
    }).lean();

    if (!keyDoc) {
      throw new UnauthorizedException('API Key inválida o revocada');
    }

    // Actualizar lastUsedAt en background (no bloquea la petición)
    void this.apiKeyModel.updateOne(
      { _id: keyDoc._id },
      { $set: { lastUsedAt: new Date() } },
    );

    // Inyectar contexto de empresa en el request (similar al JWT user)
    request.apiKeyContext = {
      enterprise_id: keyDoc.enterprise_id,
      vigiladoId: keyDoc.vigiladoId,
      vigiladoToken: keyDoc.vigiladoToken,
      keyId: String(keyDoc._id),
      keyName: keyDoc.name,
      source: 'external_api',
      demoMode: keyDoc.demoMode ?? false,
    };

    return true;
  }
}
