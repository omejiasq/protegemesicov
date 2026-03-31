import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../libs/auth/jwt-auth.guard';
import { MaintenanceAiService } from './maintenance-ai.service';

@UseGuards(JwtAuthGuard)
@Controller('maintenance-ai')
export class MaintenanceAiController {
  constructor(private readonly svc: MaintenanceAiService) {}

  // ─── FORMATOS (solo superadmin) ───────────────────────────────

  @Post('formats')
  createFormat(@Body() dto: any, @Req() req: any) {
    // En producción agrega guard de superadmin aquí
    return this.svc.createFormat(dto);
  }

  @Get('formats/all')
  listAllFormats() {
    return this.svc.listAllFormats();
  }

  @Get('formats')
  listFormats(@Req() req: any) {
    return this.svc.listFormats(req.user?.enterprise_id);
  }

  @Patch('formats/:id')
  updateFormat(@Param('id') id: string, @Body() dto: any) {
    return this.svc.updateFormat(id, dto);
  }

  @Patch('formats/:id/toggle')
  toggleFormat(@Param('id') id: string) {
    return this.svc.toggleFormat(id);
  }

  // ─── ANÁLISIS DE DOCUMENTOS ──────────────────────────────────

  /**
   * POST /maintenance-ai/analyze
   * Body: {
   *   imageBase64: string,         ← imagen en base64
   *   mediaType: 'image/jpeg' | 'image/png',
   *   workshop_format_id?: string, ← ID del formato guardado en DB
   *   preventive_id?: string,
   *   corrective_id?: string,
   *   documento_url?: string,
   * }
   */
  @Post('analyze')
  analyze(@Body() dto: any, @Req() req: any) {
    return this.svc.analyzeDocument({
      imageBase64: dto.imageBase64,
      mediaType: dto.mediaType ?? 'image/jpeg',
      workshop_format_id: dto.workshop_format_id,
      enterprise_id: req.user?.enterprise_id,
      subido_por: req.user?.sub,
      preventive_id: dto.preventive_id,
      corrective_id: dto.corrective_id,
      documento_url: dto.documento_url,
    });
  }

  // ─── LISTADO DE ANÁLISIS ──────────────────────────────────────

  @Get('analyses')
  listAnalyses(@Query('placa') placa: string, @Req() req: any) {
    return this.svc.listAnalyses(req.user?.enterprise_id, placa);
  }
}
