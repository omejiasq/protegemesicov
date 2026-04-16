import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async sendTempPassword(to: string, username: string, tempPassword: string): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM || 'no-reply@protegemesicov.co',
        to,
        subject: 'Recuperación de contraseña — Protegeme SICOV',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
            <div style="background: #1e40af; color: white; padding: 1.5rem 2rem;">
              <h2 style="margin: 0; font-size: 1.25rem;">Recuperación de contraseña</h2>
            </div>
            <div style="padding: 1.5rem 2rem;">
              <p>Hola <strong>${username}</strong>,</p>
              <p>Se ha generado una contraseña temporal para su cuenta en <strong>Protegeme SICOV</strong>:</p>
              <div style="background: #f0f4ff; border-left: 4px solid #1e40af; padding: 1rem 1.5rem; margin: 1.25rem 0; font-size: 1.5rem; font-weight: bold; letter-spacing: 3px; color: #1e3a8a; text-align: center;">
                ${tempPassword}
              </div>
              <p>Al iniciar sesión, el sistema le solicitará que cambie esta contraseña por una nueva.</p>
              <p style="color: #6b7280; font-size: 0.85rem; margin-top: 1.5rem;">
                Si usted no solicitó este cambio, comuníquese con el administrador de su empresa.
              </p>
            </div>
          </div>
        `,
      });
    } catch (e: any) {
      this.logger.error('Error enviando email de recuperación: ' + e.message);
    }
  }

  async sendBroadcastNotification(params: {
    recipients: Array<{ name: string; nit: string; email: string }>;
    message: string;
    senderName: string;
  }): Promise<void> {
    const from = process.env.SMTP_FROM || 'no-reply@protegemesicov.co';
    const appName = 'Protegeme SICOV';

    for (const recipient of params.recipients) {
      try {
        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
            <div style="background: #1e40af; color: white; padding: 1.5rem 2rem;">
              <h2 style="margin: 0; font-size: 1.25rem;">Comunicado — ${appName}</h2>
            </div>
            <div style="padding: 1.5rem 2rem;">
              <p>Estimada empresa <strong>${recipient.name}</strong>,</p>
              <div style="background: #eff6ff; border-left: 4px solid #1e40af; padding: 1rem 1.5rem; margin: 1.25rem 0; font-size: 0.95rem; color: #1e3a8a; border-radius: 4px; white-space: pre-line;">
                ${params.message}
              </div>
              <p style="color: #6b7280; font-size: 0.85rem; margin-top: 1.5rem;">
                Mensaje enviado por: <strong>${params.senderName}</strong><br/>
                Este correo fue generado automáticamente por ${appName}. Por favor no responda a este mensaje.
              </p>
            </div>
          </div>
        `;
        await this.transporter.sendMail({
          from: `"${appName}" <${from}>`,
          to: recipient.email,
          subject: `[${appName}] Comunicado del Administrador`,
          html,
        });
      } catch (e: any) {
        this.logger.error(`Error enviando broadcast a ${recipient.email}: ${e.message}`);
      }
    }
  }

  async sendEnterpriseWelcome(
    to: string,
    username: string,
    tempPassword: string,
    enterpriseName: string,
  ): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM || 'no-reply@protegemesicov.co',
        to,
        subject: 'Bienvenido a Protegeme SICOV — Credenciales de acceso',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
            <div style="background: #1e40af; color: white; padding: 1.5rem 2rem;">
              <h2 style="margin: 0; font-size: 1.25rem;">Bienvenido a Protegeme SICOV</h2>
            </div>
            <div style="padding: 1.5rem 2rem;">
              <p>Se ha creado un acceso para la empresa <strong>${enterpriseName}</strong>.</p>
              <table style="width: 100%; border-collapse: collapse; margin: 1rem 0;">
                <tr>
                  <td style="padding: 0.5rem; font-weight: 600; color: #374151; width: 140px;">Usuario:</td>
                  <td style="padding: 0.5rem; color: #111827;">${username}</td>
                </tr>
                <tr style="background: #f9fafb;">
                  <td style="padding: 0.5rem; font-weight: 600; color: #374151;">Contraseña temporal:</td>
                  <td style="padding: 0.5rem;">
                    <span style="font-size: 1.3rem; font-weight: bold; letter-spacing: 2px; color: #1e3a8a;">${tempPassword}</span>
                  </td>
                </tr>
              </table>
              <p>Al iniciar sesión por primera vez, el sistema le solicitará que establezca una nueva contraseña.</p>
              <p style="color: #6b7280; font-size: 0.85rem; margin-top: 1.5rem;">
                Este mensaje fue generado automáticamente por el sistema Protegeme SICOV.
              </p>
            </div>
          </div>
        `,
      });
    } catch (e: any) {
      this.logger.error('Error enviando email de bienvenida: ' + e.message);
    }
  }
}
