// src/terminales/terminales.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { TerminalSalida, TerminalSalidaSchema } from './schema/terminal-salida.schema';
import { TerminalLlegada, TerminalLlegadaSchema } from './schema/terminal-llegada.schema';
import { TerminalNovedad, TerminalNovedadSchema } from './schema/terminal-novedad.schema';

import { TerminalesExternalApiService } from './terminales-external-api';
import { TerminalesService } from './terminales.service';
import { TerminalesController } from './terminales.controller';
import { AuditModule } from '../libs/audit/audit.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TerminalSalida.name, schema: TerminalSalidaSchema },
      { name: TerminalLlegada.name, schema: TerminalLlegadaSchema },
      { name: TerminalNovedad.name, schema: TerminalNovedadSchema },
    ]),
    AuditModule,
  ],
  providers: [TerminalesExternalApiService, TerminalesService],
  controllers: [TerminalesController],
  exports: [TerminalesService],
})
export class TerminalesModule {}
