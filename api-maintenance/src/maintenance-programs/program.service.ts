import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import {
  ProgramFile,
  ProgramFileDocument,
} from '../schema/program-file.schema';
import { MaintenanceExternalApiService } from 'src/libs/external-api';

type UserCtx = { enterprise_id?: string; sub?: string; vigiladoId?: string };

@Injectable()
export class ProgramsService {
  private readonly logger = new Logger(ProgramsService.name);

  constructor(
    @InjectModel(ProgramFile.name)
    private readonly model: Model<ProgramFileDocument>,
    private readonly external: MaintenanceExternalApiService, // NUEVO
  ) {}

  async save(
    body: {
      tipoId: 1 | 2 | 3;
      documento: string;
      nombreOriginal: string;
      ruta: string;
      vigiladoId: number;
      placa?: string;
    },
    user?: UserCtx,
  ) {
    if (typeof body.vigiladoId !== 'number') {
      throw new BadRequestException('vigiladoId requerido');
    }

    // 1) Guardar local
    const doc = await this.model.create({
      ...body,
      enterprise_id: user?.enterprise_id,
      createdBy: user?.sub,
    });
    const json = doc.toJSON();

    // 2) Crear SIEMPRE el archivo-programa en la API externa (esto audita adentro)
    try {
      await this.external.crearArchivoPrograma({
        tipoId: body.tipoId,
        documento: body.documento,
        nombreOriginal: body.nombreOriginal,
        ruta: body.ruta,
        vigiladoId: String(body.vigiladoId),
        placa: body.placa, // opcional
      });
    } catch (err) {
      this.logger.warn(
        `No se pudo crear archivo_programa externo: ${String(err)}`,
      );
    }

    return json;
  }

  async list(q: { tipoId?: 1 | 2 | 3; vigiladoId?: number }, user?: UserCtx) {
    const filter: FilterQuery<ProgramFileDocument> = {
      enterprise_id: user?.enterprise_id,
    };
    if (q.tipoId) filter.tipoId = q.tipoId;
    if (typeof q.vigiladoId === 'number') filter.vigiladoId = q.vigiladoId;
    const items = await this.model
      .find(filter)
      .sort({ createdAt: -1 })
      .lean({ getters: true });
    return { items };
  }
}
