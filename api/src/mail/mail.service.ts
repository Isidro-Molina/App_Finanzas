import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_APP_PASSWORD,
      },
    });
  }

  /**
   * Envía un email de invitación a un grupo.
   * Si el usuario ya tiene cuenta → invitación directa.
   * Si no tiene cuenta → invitación para registrarse.
   */
  async sendGroupInvitation({
    toEmail,
    inviterName,
    groupName,
    userExists,
  }: {
    toEmail: string;
    inviterName: string;
    groupName: string;
    userExists: boolean;
  }): Promise<void> {
    const subject = userExists
      ? `${inviterName} te agregó al grupo "${groupName}" en Finova`
      : `${inviterName} te invita a unirte a "${groupName}" en Finova`;

    const html = userExists
      ? this.templateExistingUser({ inviterName, groupName })
      : this.templateNewUser({ inviterName, groupName });

    try {
      await this.transporter.sendMail({
        from: `"Finova App" <${process.env.MAIL_USER}>`,
        to: toEmail,
        subject,
        html,
      });
      this.logger.log(`Email de invitación enviado a ${toEmail}`);
    } catch (error) {
      // No interrumpimos el flujo si el email falla — el usuario igual queda en el grupo
      this.logger.error(`Error enviando email a ${toEmail}: ${error.message}`);
    }
  }

  private templateExistingUser({
    inviterName,
    groupName,
  }: {
    inviterName: string;
    groupName: string;
  }): string {
    return `
      <!DOCTYPE html>
      <html lang="es">
      <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
      <body style="margin:0;padding:0;background:#f4f6fb;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:40px 0;">
          <tr><td align="center">
            <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
              <!-- Header -->
              <tr><td style="background:linear-gradient(135deg,#1D4ED8,#2563EB);padding:32px 40px;text-align:center;">
                <div style="display:inline-block;background:rgba(255,255,255,0.15);border-radius:14px;padding:12px 20px;margin-bottom:12px;">
                  <span style="font-size:28px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;">Finova</span>
                </div>
                <p style="color:rgba(255,255,255,0.85);margin:0;font-size:14px;">Tu dinero, organizado.</p>
              </td></tr>
              <!-- Body -->
              <tr><td style="padding:36px 40px;">
                <h2 style="margin:0 0 8px;font-size:22px;color:#111827;font-weight:700;">¡Fuiste agregado a un grupo! 🎉</h2>
                <p style="color:#6B7280;font-size:15px;line-height:1.6;margin:0 0 24px;">
                  <strong style="color:#111827;">${inviterName}</strong> te agregó al grupo
                  <strong style="color:#2563EB;">"${groupName}"</strong> en Finova.
                  Ya podés ver los gastos compartidos y tu balance desde la app.
                </p>
                <div style="background:#EFF6FF;border-left:4px solid #2563EB;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
                  <p style="margin:0;color:#1E40AF;font-size:14px;">💡 Abrí la app de Finova y buscá el grupo <strong>"${groupName}"</strong> en la sección de Grupos.</p>
                </div>
              </td></tr>
              <!-- Footer -->
              <tr><td style="padding:20px 40px;border-top:1px solid #F3F4F6;text-align:center;">
                <p style="color:#9CA3AF;font-size:12px;margin:0;">Recibiste este email porque alguien te agregó a un grupo en Finova.</p>
              </td></tr>
            </table>
          </td></tr>
        </table>
      </body>
      </html>
    `;
  }

  private templateNewUser({
    inviterName,
    groupName,
  }: {
    inviterName: string;
    groupName: string;
  }): string {
    return `
      <!DOCTYPE html>
      <html lang="es">
      <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
      <body style="margin:0;padding:0;background:#f4f6fb;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:40px 0;">
          <tr><td align="center">
            <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
              <!-- Header -->
              <tr><td style="background:linear-gradient(135deg,#1D4ED8,#2563EB);padding:32px 40px;text-align:center;">
                <div style="display:inline-block;background:rgba(255,255,255,0.15);border-radius:14px;padding:12px 20px;margin-bottom:12px;">
                  <span style="font-size:28px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;">Finova</span>
                </div>
                <p style="color:rgba(255,255,255,0.85);margin:0;font-size:14px;">Tu dinero, organizado.</p>
              </td></tr>
              <!-- Body -->
              <tr><td style="padding:36px 40px;">
                <h2 style="margin:0 0 8px;font-size:22px;color:#111827;font-weight:700;">Te invitaron a un grupo 👋</h2>
                <p style="color:#6B7280;font-size:15px;line-height:1.6;margin:0 0 24px;">
                  <strong style="color:#111827;">${inviterName}</strong> quiere que te unas al grupo
                  <strong style="color:#2563EB;">"${groupName}"</strong> en <strong>Finova</strong>,
                  una app para organizar gastos compartidos de forma fácil y visual.
                </p>
                <div style="background:#EFF6FF;border-left:4px solid #2563EB;border-radius:8px;padding:16px 20px;margin-bottom:28px;">
                  <p style="margin:0;color:#1E40AF;font-size:14px;">Para aceptar la invitación, creá una cuenta en Finova con este email y ${inviterName} te agregará al grupo.</p>
                </div>
                <p style="color:#9CA3AF;font-size:13px;margin:0;">La invitación fue enviada por ${inviterName} y está pendiente de que te registres.</p>
              </td></tr>
              <!-- Footer -->
              <tr><td style="padding:20px 40px;border-top:1px solid #F3F4F6;text-align:center;">
                <p style="color:#9CA3AF;font-size:12px;margin:0;">Recibiste este email porque alguien quiere compartir gastos con vos en Finova.</p>
              </td></tr>
            </table>
          </td></tr>
        </table>
      </body>
      </html>
    `;
  }
}
