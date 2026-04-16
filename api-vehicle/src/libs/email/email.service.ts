import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;

  private getTransporter(): nodemailer.Transporter | null {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      this.logger.warn('[EmailService] SMTP_USER / SMTP_PASS no configurados — correo omitido');
      return null;
    }
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
      this.logger.log(`[EmailService] Transporter configurado: ${process.env.SMTP_HOST || 'smtp.gmail.com'}:${process.env.SMTP_PORT || 587} usuario=${process.env.SMTP_USER}`);
    }
    return this.transporter;
  }

  /** Verifica credenciales y loguea si faltan */
  private checkSmtp(context: string): boolean {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      this.logger.warn(`[EmailService][${context}] SMTP sin credenciales — correo omitido`);
      return false;
    }
    return true;
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
      this.logger.warn('[sendVehicleCreatedNotification] Sin destinatarios — correo omitido');
      return;
    }
    if (!this.checkSmtp('sendVehicleCreatedNotification')) return;
    this.logger.log(`[sendVehicleCreatedNotification] Enviando a: ${validEmails.join(', ')}`);

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
      await this.getTransporter()!.sendMail({
        from: `"${appName}" <${from}>`,
        to: validEmails.join(', '),
        subject: `[${appName}] Nuevo vehículo pendiente de habilitación — ${params.placa}`,
        html,
      });
      this.logger.log(`Notificación de vehículo enviada a: ${validEmails.join(', ')}`);
    } catch (err: any) {
      this.logger.error(`Error enviando correo de vehículo: ${err?.message ?? err}`);
    }
  }

  async sendVehicleStateChangeNotification(params: {
    toEmails: string[];
    enterpriseName: string;
    enterpriseNit: string;
    placa: string;
    clase?: string;
    action: 'activacion' | 'desactivacion';
    changedBy: string;
    fecha: Date;
  }): Promise<void> {
    const validEmails = params.toEmails.filter(Boolean);
    if (!validEmails.length) {
      this.logger.warn(`[sendVehicleStateChangeNotification] Sin destinatarios — correo omitido`);
      return;
    }
    if (!this.checkSmtp('sendVehicleStateChangeNotification')) return;
    this.logger.log(`[sendVehicleStateChangeNotification] Enviando ${params.action} a: ${validEmails.join(', ')}`);

    const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@protegeme.com.co';
    const appName = 'ProtegeMeSICOV';
    const isActivation = params.action === 'activacion';
    const headerColor = isActivation ? '#16a34a' : '#dc2626';
    const badgeColor = isActivation ? '#dcfce7' : '#fee2e2';
    const badgeText = isActivation ? '#166534' : '#991b1b';
    const actionLabel = isActivation ? 'ACTIVACIÓN' : 'DESACTIVACIÓN';
    const fechaStr = params.fecha.toLocaleDateString('es-CO', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });

    const html = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><style>
  body { font-family: Arial, sans-serif; background: #f5f7fb; margin: 0; padding: 0; }
  .container { max-width: 600px; margin: 2rem auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
  .header { background: ${headerColor}; color: white; padding: 2rem 1.5rem; text-align: center; }
  .header h1 { margin: 0; font-size: 1.4rem; }
  .body { padding: 2rem 1.5rem; }
  table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
  th { background: ${headerColor}; color: white; padding: 0.6rem 1rem; text-align: left; font-size: 0.85rem; }
  td { padding: 0.6rem 1rem; border-bottom: 1px solid #e5e7eb; font-size: 0.875rem; }
  tr:last-child td { border-bottom: none; }
  .status-badge { background: ${badgeColor}; color: ${badgeText}; padding: 0.2rem 0.6rem; border-radius: 999px; font-size: 0.75rem; font-weight: 600; }
  .footer { background: #f3f4f6; padding: 1rem 1.5rem; text-align: center; font-size: 0.75rem; color: #6b7280; }
</style></head>
<body>
<div class="container">
  <div class="header">
    <h1>${appName}</h1>
    <p style="margin:0.5rem 0 0; opacity:0.9; font-size:0.9rem;">Notificación de ${params.action} de vehículo</p>
  </div>
  <div class="body">
    <h3 style="color:${headerColor}; margin-bottom:0.5rem;">Detalle del evento</h3>
    <table>
      <tr><th>Campo</th><th>Valor</th></tr>
      <tr><td>Empresa</td><td><strong>${params.enterpriseName}</strong></td></tr>
      <tr><td>NIT</td><td>${params.enterpriseNit || '—'}</td></tr>
      <tr><td>Placa</td><td><strong>${params.placa}</strong></td></tr>
      <tr><td>Clase</td><td>${params.clase || '—'}</td></tr>
      <tr><td>Tipo de evento</td><td><span class="status-badge">${actionLabel}</span></td></tr>
      <tr><td>Realizado por</td><td>${params.changedBy}</td></tr>
      <tr><td>Fecha</td><td>${fechaStr}</td></tr>
    </table>
  </div>
  <div class="footer">
    Este correo fue generado automáticamente por ${appName}. Por favor no responda a este mensaje.
  </div>
</div>
</body>
</html>`;

    try {
      await this.getTransporter()!.sendMail({
        from: `"${appName}" <${from}>`,
        to: validEmails.join(', '),
        subject: `[${appName}] ${actionLabel} de vehículo — ${params.placa} (${params.enterpriseName})`,
        html,
      });
      this.logger.log(`Notificación de ${params.action} enviada a: ${validEmails.join(', ')}`);
    } catch (err: any) {
      this.logger.error(`Error enviando correo de ${params.action}: ${err?.message ?? err}`);
    }
  }

  async sendDeactivationRequestNotification(params: {
    toEmails: string[];
    enterpriseName: string;
    placa: string;
    clase?: string;
    nota_desactivacion: string;
    requestedBy: string;
    fecha_solicitud: Date;
  }): Promise<void> {
    const validEmails = params.toEmails.filter(Boolean);
    if (!validEmails.length) {
      this.logger.warn('[sendDeactivationRequestNotification] Sin destinatarios — correo omitido');
      return;
    }
    if (!this.checkSmtp('sendDeactivationRequestNotification')) return;
    this.logger.log(`[sendDeactivationRequestNotification] Enviando a: ${validEmails.join(', ')}`);

    const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@protegeme.com.co';
    const appName = 'ProtegeMeSICOV';
    const fechaStr = params.fecha_solicitud.toLocaleDateString('es-CO', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });

    const html = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><style>
  body { font-family: Arial, sans-serif; background: #f5f7fb; margin: 0; padding: 0; }
  .container { max-width: 600px; margin: 2rem auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
  .header { background: #dc2626; color: white; padding: 2rem 1.5rem; text-align: center; }
  .header h1 { margin: 0; font-size: 1.4rem; }
  .body { padding: 2rem 1.5rem; }
  .alert-box { background: #fee2e2; border-left: 4px solid #dc2626; padding: 1rem 1.25rem; border-radius: 4px; margin-bottom: 1.5rem; }
  .alert-box strong { color: #991b1b; }
  table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
  th { background: #dc2626; color: white; padding: 0.6rem 1rem; text-align: left; font-size: 0.85rem; }
  td { padding: 0.6rem 1rem; border-bottom: 1px solid #e5e7eb; font-size: 0.875rem; }
  tr:last-child td { border-bottom: none; }
  .status-badge { background: #fee2e2; color: #991b1b; padding: 0.2rem 0.6rem; border-radius: 999px; font-size: 0.75rem; font-weight: 600; }
  .footer { background: #f3f4f6; padding: 1rem 1.5rem; text-align: center; font-size: 0.75rem; color: #6b7280; }
</style></head>
<body>
<div class="container">
  <div class="header">
    <h1>${appName}</h1>
    <p style="margin:0.5rem 0 0; opacity:0.9; font-size:0.9rem;">Solicitud de desactivación de vehículo</p>
  </div>
  <div class="body">
    <div class="alert-box">
      <strong>Acción requerida:</strong> La empresa <strong>${params.enterpriseName}</strong> ha solicitado la desactivación del vehículo <strong>${params.placa}</strong>. El vehículo permanece activo hasta que usted apruebe o rechace la solicitud.
    </div>
    <h3 style="color:#991b1b; margin-bottom:0.5rem;">Detalles de la solicitud</h3>
    <table>
      <tr><th>Campo</th><th>Valor</th></tr>
      <tr><td>Empresa</td><td><strong>${params.enterpriseName}</strong></td></tr>
      <tr><td>Placa</td><td><strong>${params.placa}</strong></td></tr>
      <tr><td>Clase</td><td>${params.clase || '—'}</td></tr>
      <tr><td>Motivo</td><td>${params.nota_desactivacion}</td></tr>
      <tr><td>Solicitado por</td><td>${params.requestedBy}</td></tr>
      <tr><td>Fecha solicitud</td><td>${fechaStr}</td></tr>
      <tr><td>Estado</td><td><span class="status-badge">PENDIENTE APROBACIÓN</span></td></tr>
    </table>
    <p style="color:#374151; font-size:0.875rem;">
      Para aprobar o rechazar esta solicitud, ingrese al panel administrativo de <strong>${appName}</strong>,
      seleccione la empresa <strong>${params.enterpriseName}</strong> y gestione la solicitud en la sección de vehículos.
    </p>
  </div>
  <div class="footer">
    Este correo fue generado automáticamente por ${appName}. Por favor no responda a este mensaje.
  </div>
</div>
</body>
</html>`;

    try {
      await this.getTransporter()!.sendMail({
        from: `"${appName}" <${from}>`,
        to: validEmails.join(', '),
        subject: `[${appName}] Solicitud de desactivación — ${params.placa} (${params.enterpriseName})`,
        html,
      });
      this.logger.log(`Notificación de solicitud de desactivación enviada a: ${validEmails.join(', ')}`);
    } catch (err: any) {
      this.logger.error(`Error enviando correo de desactivación: ${err?.message ?? err}`);
    }
  }

  async sendActivationRequestNotification(params: {
    toEmails: string[];
    enterpriseName: string;
    enterpriseNit: string;
    placa: string;
    clase?: string;
    nota_activacion: string;
    requestedBy: string;
    fecha_solicitud: Date;
  }): Promise<void> {
    const validEmails = params.toEmails.filter(Boolean);
    if (!validEmails.length) {
      this.logger.warn('[sendActivationRequestNotification] Sin destinatarios — correo omitido');
      return;
    }
    if (!this.checkSmtp('sendActivationRequestNotification')) return;
    this.logger.log(`[sendActivationRequestNotification] Enviando a: ${validEmails.join(', ')}`);

    const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@protegeme.com.co';
    const appName = 'ProtegeMeSICOV';
    const fechaStr = params.fecha_solicitud.toLocaleDateString('es-CO', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });

    const html = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><style>
  body { font-family: Arial, sans-serif; background: #f5f7fb; margin: 0; padding: 0; }
  .container { max-width: 600px; margin: 2rem auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
  .header { background: #16a34a; color: white; padding: 2rem 1.5rem; text-align: center; }
  .header h1 { margin: 0; font-size: 1.4rem; }
  .body { padding: 2rem 1.5rem; }
  .alert-box { background: #dcfce7; border-left: 4px solid #16a34a; padding: 1rem 1.25rem; border-radius: 4px; margin-bottom: 1.5rem; }
  .alert-box strong { color: #166534; }
  table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
  th { background: #16a34a; color: white; padding: 0.6rem 1rem; text-align: left; font-size: 0.85rem; }
  td { padding: 0.6rem 1rem; border-bottom: 1px solid #e5e7eb; font-size: 0.875rem; }
  tr:last-child td { border-bottom: none; }
  .status-badge { background: #dcfce7; color: #166534; padding: 0.2rem 0.6rem; border-radius: 999px; font-size: 0.75rem; font-weight: 600; }
  .footer { background: #f3f4f6; padding: 1rem 1.5rem; text-align: center; font-size: 0.75rem; color: #6b7280; }
</style></head>
<body>
<div class="container">
  <div class="header">
    <h1>${appName}</h1>
    <p style="margin:0.5rem 0 0; opacity:0.9; font-size:0.9rem;">Solicitud de activación de vehículo</p>
  </div>
  <div class="body">
    <div class="alert-box">
      <strong>Acción requerida:</strong> La empresa <strong>${params.enterpriseName}</strong> ha solicitado la activación del vehículo <strong>${params.placa}</strong>. El vehículo permanece inactivo hasta que usted apruebe o rechace la solicitud.
    </div>
    <h3 style="color:#166534; margin-bottom:0.5rem;">Detalles de la solicitud</h3>
    <table>
      <tr><th>Campo</th><th>Valor</th></tr>
      <tr><td>Empresa</td><td><strong>${params.enterpriseName}</strong></td></tr>
      <tr><td>NIT</td><td>${params.enterpriseNit || '—'}</td></tr>
      <tr><td>Placa</td><td><strong>${params.placa}</strong></td></tr>
      <tr><td>Clase</td><td>${params.clase || '—'}</td></tr>
      <tr><td>Motivo</td><td>${params.nota_activacion}</td></tr>
      <tr><td>Solicitado por</td><td>${params.requestedBy}</td></tr>
      <tr><td>Fecha solicitud</td><td>${fechaStr}</td></tr>
      <tr><td>Estado</td><td><span class="status-badge">PENDIENTE APROBACIÓN</span></td></tr>
    </table>
    <p style="color:#374151; font-size:0.875rem;">
      Para aprobar o rechazar esta solicitud, ingrese al panel administrativo de <strong>${appName}</strong>,
      seleccione la empresa <strong>${params.enterpriseName}</strong> y gestione la solicitud en la sección de vehículos.
    </p>
  </div>
  <div class="footer">
    Este correo fue generado automáticamente por ${appName}. Por favor no responda a este mensaje.
  </div>
</div>
</body>
</html>`;

    try {
      await this.getTransporter()!.sendMail({
        from: `"${appName}" <${from}>`,
        to: validEmails.join(', '),
        subject: `[${appName}] Solicitud de activación — ${params.placa} (${params.enterpriseName})`,
        html,
      });
      this.logger.log(`Notificación de solicitud de activación enviada a: ${validEmails.join(', ')}`);
    } catch (err: any) {
      this.logger.error(`Error enviando correo de activación: ${err?.message ?? err}`);
    }
  }

  /** Notificación a empresa cuando el superadmin activa o desactiva varios vehículos */
  async sendBulkStateChangeToEnterprise(params: {
    toEmails: string[];
    enterpriseName: string;
    placas: string[];
    action: 'activacion' | 'desactivacion';
    changedBy: string;
    fecha: Date;
  }): Promise<void> {
    const validEmails = params.toEmails.filter(Boolean);
    if (!validEmails.length) {
      this.logger.warn('[sendBulkStateChangeToEnterprise] Sin destinatarios — correo omitido');
      return;
    }
    if (!this.checkSmtp('sendBulkStateChangeToEnterprise')) return;
    this.logger.log(`[sendBulkStateChangeToEnterprise] Enviando ${params.action} a empresa: ${validEmails.join(', ')}`);

    const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@protegeme.com.co';
    const appName = 'ProtegeMeSICOV';
    const isActivation = params.action === 'activacion';
    const headerColor = isActivation ? '#16a34a' : '#dc2626';
    const badgeColor = isActivation ? '#dcfce7' : '#fee2e2';
    const badgeText = isActivation ? '#166534' : '#991b1b';
    const actionLabel = isActivation ? 'ACTIVADOS' : 'DESACTIVADOS';
    const actionTitle = isActivation ? 'activación' : 'desactivación';
    const fechaStr = params.fecha.toLocaleDateString('es-CO', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
    const placaRows = params.placas.map(p =>
      `<tr><td style="padding:0.5rem 1rem; border-bottom:1px solid #e5e7eb;"><strong>${p}</strong></td><td style="padding:0.5rem 1rem; border-bottom:1px solid #e5e7eb;"><span style="background:${badgeColor};color:${badgeText};padding:0.2rem 0.5rem;border-radius:999px;font-size:0.75rem;font-weight:600;">${actionLabel}</span></td></tr>`
    ).join('');

    const html = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><style>
  body { font-family: Arial, sans-serif; background: #f5f7fb; margin: 0; padding: 0; }
  .container { max-width: 600px; margin: 2rem auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
  .header { background: ${headerColor}; color: white; padding: 2rem 1.5rem; text-align: center; }
  .header h1 { margin: 0; font-size: 1.4rem; }
  .body { padding: 2rem 1.5rem; }
  table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
  th { background: ${headerColor}; color: white; padding: 0.6rem 1rem; text-align: left; font-size: 0.85rem; }
  .footer { background: #f3f4f6; padding: 1rem 1.5rem; text-align: center; font-size: 0.75rem; color: #6b7280; }
</style></head>
<body>
<div class="container">
  <div class="header">
    <h1>${appName}</h1>
    <p style="margin:0.5rem 0 0; opacity:0.9; font-size:0.9rem;">Notificación de ${actionTitle} de vehículos</p>
  </div>
  <div class="body">
    <p style="color:#374151; margin-bottom:1rem;">
      Estimada empresa <strong>${params.enterpriseName}</strong>,<br/>
      el administrador de la plataforma ha <strong>${isActivation ? 'activado' : 'desactivado'}</strong> los siguientes <strong>${params.placas.length}</strong> vehículo(s) de su flota el <strong>${fechaStr}</strong>:
    </p>
    <table>
      <tr><th>Placa</th><th>Estado</th></tr>
      ${placaRows}
    </table>
    <p style="color:#6b7280; font-size:0.8rem; margin-top:1rem;">
      Acción realizada por: <strong>${params.changedBy}</strong>
    </p>
  </div>
  <div class="footer">
    Este correo fue generado automáticamente por ${appName}. Por favor no responda a este mensaje.
  </div>
</div>
</body>
</html>`;

    try {
      await this.getTransporter()!.sendMail({
        from: `"${appName}" <${from}>`,
        to: validEmails.join(', '),
        subject: `[${appName}] Sus vehículos han sido ${isActivation ? 'activados' : 'desactivados'} — ${params.placas.length} placa(s)`,
        html,
      });
      this.logger.log(`Notificación de ${actionTitle} masiva enviada a empresa: ${validEmails.join(', ')}`);
    } catch (err: any) {
      this.logger.error(`Error enviando notificación a empresa: ${err?.message ?? err}`);
    }
  }

  /** Notificación a superadmin cuando empresa solicita desactivación masiva */
  async sendDeactivationBulkRequestNotification(params: {
    toEmails: string[];
    enterpriseName: string;
    enterpriseNit: string;
    placas: string[];
    nota_desactivacion: string;
    requestedBy: string;
    fecha_solicitud: Date;
  }): Promise<void> {
    const validEmails = params.toEmails.filter(Boolean);
    if (!validEmails.length) {
      this.logger.warn('[sendDeactivationBulkRequestNotification] Sin destinatarios — correo omitido');
      return;
    }
    if (!this.checkSmtp('sendDeactivationBulkRequestNotification')) return;
    this.logger.log(`[sendDeactivationBulkRequestNotification] Enviando a: ${validEmails.join(', ')}`);

    const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@protegeme.com.co';
    const appName = 'ProtegeMeSICOV';
    const fechaStr = params.fecha_solicitud.toLocaleDateString('es-CO', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
    const placaItems = params.placas.map(p =>
      `<li style="font-weight:700; font-size:0.9rem;">${p}</li>`
    ).join('');

    const html = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><style>
  body { font-family: Arial, sans-serif; background: #f5f7fb; margin: 0; padding: 0; }
  .container { max-width: 600px; margin: 2rem auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
  .header { background: #dc2626; color: white; padding: 2rem 1.5rem; text-align: center; }
  .header h1 { margin: 0; font-size: 1.4rem; }
  .body { padding: 2rem 1.5rem; }
  .alert-box { background: #fee2e2; border-left: 4px solid #dc2626; padding: 1rem 1.25rem; border-radius: 4px; margin-bottom: 1.5rem; }
  .alert-box strong { color: #991b1b; }
  table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
  th { background: #dc2626; color: white; padding: 0.6rem 1rem; text-align: left; font-size: 0.85rem; }
  td { padding: 0.6rem 1rem; border-bottom: 1px solid #e5e7eb; font-size: 0.875rem; }
  tr:last-child td { border-bottom: none; }
  .status-badge { background: #fee2e2; color: #991b1b; padding: 0.2rem 0.6rem; border-radius: 999px; font-size: 0.75rem; font-weight: 600; }
  .footer { background: #f3f4f6; padding: 1rem 1.5rem; text-align: center; font-size: 0.75rem; color: #6b7280; }
  ul { margin: 0.5rem 0 0 1.5rem; padding: 0; }
</style></head>
<body>
<div class="container">
  <div class="header">
    <h1>${appName}</h1>
    <p style="margin:0.5rem 0 0; opacity:0.9; font-size:0.9rem;">Solicitud de desactivación masiva</p>
  </div>
  <div class="body">
    <div class="alert-box">
      <strong>Acción requerida:</strong> La empresa <strong>${params.enterpriseName}</strong> ha solicitado la desactivación de <strong>${params.placas.length}</strong> vehículo(s). Los vehículos permanecen activos hasta que usted apruebe o rechace cada solicitud.
    </div>
    <table>
      <tr><th>Campo</th><th>Valor</th></tr>
      <tr><td>Empresa</td><td><strong>${params.enterpriseName}</strong></td></tr>
      <tr><td>NIT</td><td>${params.enterpriseNit || '—'}</td></tr>
      <tr><td>Placas solicitadas</td><td><ul>${placaItems}</ul></td></tr>
      <tr><td>Motivo</td><td>${params.nota_desactivacion}</td></tr>
      <tr><td>Solicitado por</td><td>${params.requestedBy}</td></tr>
      <tr><td>Fecha solicitud</td><td>${fechaStr}</td></tr>
      <tr><td>Estado</td><td><span class="status-badge">PENDIENTE APROBACIÓN</span></td></tr>
    </table>
  </div>
  <div class="footer">
    Este correo fue generado automáticamente por ${appName}. Por favor no responda a este mensaje.
  </div>
</div>
</body>
</html>`;

    try {
      await this.getTransporter()!.sendMail({
        from: `"${appName}" <${from}>`,
        to: validEmails.join(', '),
        subject: `[${appName}] Solicitud de desactivación masiva — ${params.placas.length} vehículo(s) (${params.enterpriseName})`,
        html,
      });
      this.logger.log(`Notificación de solicitud de desactivación masiva enviada a: ${validEmails.join(', ')}`);
    } catch (err: any) {
      this.logger.error(`Error enviando correo de desactivación masiva: ${err?.message ?? err}`);
    }
  }
}
