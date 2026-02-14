import {
    Controller,
    Get,
    Query,
    Req,
    UseGuards,
  } from '@nestjs/common';
  import { DashboardService } from './dashboard.service';
  import { JwtAuthGuard } from '../libs/auth/jwt-auth.guard';
  
  @Controller('dashboard')
  @UseGuards(JwtAuthGuard)
  export class DashboardController {
    constructor(private readonly svc: DashboardService) {}
  
    /**
     * ============================================================
     * 📊 ENDPOINT ÚNICO DEL TABLERO DE CONTROL
     * ============================================================
     * Este endpoint retorna TODA la información que el front
     * necesita para pintar todos los gráficos y KPIs.
     *
     * Se filtra automáticamente por enterprise_id del usuario.
     *
     * Ejemplo:
     * GET /dashboard?year=2026
     */
    @Get()
    async getDashboard(
      @Req() req: any,
      @Query('year') year?: string,
      @Query('month') month?: string,
    ) {
      const selectedYear = year ? Number(year) : new Date().getFullYear();
      const selectedMonth = month ? Number(month) : undefined;
    
      return this.svc.getDashboard(
        selectedYear,
        req.user.enterprise_id,
        selectedMonth,
      );
    }
    
  }
  