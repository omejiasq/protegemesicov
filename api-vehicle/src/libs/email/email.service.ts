import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;

  private getTransporter(): nodemailer.Transporter {
    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: Number(process.env.SMTP_PORT || 587),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    }
    return this.transporter;
  }

  async sendVehicleCreatedNotification(params: {
    toEmails: string[];
    enterpriseName: string;
    placa: string;
    clase?: string;
    marca?: string;
    modelo?: string;
    no_interno?: string;
    createdBy?: string;
  }): Promise<void> {
    const validEmails = params.toEmails.filter(Boolean);
    if (!validEmails.length) {
      this.logger.warn('No hay destinatarios para notificación de vehículo creado');
      return;
    }

    const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@protegeme.com.co';
    const appName = 'ProtegeMeSICOV';

    const html = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><style>
  body { font-family: Arial, sans-serif; background: #f5f7fb; margin: 0; padding: 0; }
  .container { max-width: 600px; margin: 2rem auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
  .header { background: #1e40af; color: white; padding: 2rem 1.5rem; text-align: center; }
  .header h1 { margin: 0; font-size: 1.4rem; }
  .body { padding: 2rem 1.5rem; }
  .alert-box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 1rem 1.25rem; border-radius: 4px; margin-bottom: 1.5rem; }
  .alert-box strong { color: #92400e; }
  table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
  th { background: #1e40af; color: white; padding: 0.6rem 1rem; text-align: left; font-size: 0.85rem; }
  td { padding: 0.6rem 1rem; border-bottom: 1px solid #e5e7eb; font-size: 0.875rem; }
  tr:last-child td { border-bottom: none; }
  .status-badge { background: #fef3c7; color: #92400e; padding: 0.2rem 0.6rem; border-radius: 999px; font-size: 0.75rem; font-weight: 600; }
  .footer { background: #f3f4f6; padding: 1rem 1.5rem; text-align: center; font-size: 0.75rem; color: #6b7280; }
</style></head>
<body>
<div class="container">
  <div class="header">
    <h1>${appName}</h1>
    <p style="margin:0.5rem 0 0; opacity:0.9; font-size:0.9rem;">Notificación de nuevo vehículo</p>
  </div>
  <div class="body">
    <div class="alert-box">
      <strong>Acción requerida:</strong> Se ha registrado un nuevo vehículo en la plataforma que requiere habilitación por parte del administrador del sistema.
    </div>
    <h3 style="color:#1e3a8a; margin-bottom:0.5rem;">Detalles del vehículo</h3>
    <table>
      <tr><th>Campo</th><th>Valor</th></tr>
      <tr><td>Empresa</td><td><strong>${params.enterpriseName}</strong></td></tr>
      <tr><td>Placa</td><td><strong>${params.placa}</strong></td></tr>
      <tr><td>Clase</td><td>${params.clase || '—'}</td></tr>
      <tr><td>Marca / Modelo</td><td>${[params.marca, params.modelo].filter(Boolean).join(' ') || '—'}</td></tr>
      <tr><td>Nº Interno</td><td>${params.no_interno || '—'}</td></tr>
      <tr><td>Estado</td><td><span class="status-badge">PENDIENTE HABILITACIÓN</span></td></tr>
      <tr><td>Registrado por</td><td>${params.createdBy || '—'}</td></tr>
    </table>
    <p style="color:#374151; font-size:0.875rem;">
      Para habilitar este vehículo, ingrese al panel administrativo de <strong>${appName}</strong>,
      seleccione la empresa <strong>${params.enterpriseName}</strong> y active el vehículo con la fecha de habilitación correspondiente.
    </p>
    <p style="color:#6b7280; font-size:0.8rem;">
      Solo los vehículos habilitados podrán registrar alistamientos y mantenimientos en la plataforma.
    </p>
  </div>
  <div class="footer">
    Este correo fue generado automáticamente por ${appName}. Por favor no responda a este mensaje.
  </div>
</div>
</body>
</html>`;

    try {
      await this.getTransporter().sendMail({
        from: `"${appName}" <${from}>`,
        to: validEmails.join(', '),
        subject: `[${appName}] Nuevo vehículo pendiente de habilitación — ${params.placa}`,
        html,
      });
      this.logger.log(`Notificación de vehículo enviada a: ${validEmails.join(', ')}`);
    } catch (err: any) {
      this.logger.error(`Error enviando correo de vehículo: ${err?.message ?? err}`);
      // No propagamos el error para no bloquear la creación del vehículo
    }
  }
}
