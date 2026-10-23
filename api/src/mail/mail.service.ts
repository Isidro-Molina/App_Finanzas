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

  private escapeHtml(text: string): string {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
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
    const safeInviter = this.escapeHtml(inviterName);
    const safeGroup = this.escapeHtml(groupName);

    const subject = userExists
      ? `${inviterName} te invitó al grupo "${groupName}" en Finova`
      : `${inviterName} te invita a unirte a "${groupName}" en Finova`;

    const html = userExists
      ? this.templateExistingUser({
          inviterName: safeInviter,
          groupName: safeGroup,
        })
      : this.templateNewUser({
          inviterName: safeInviter,
          groupName: safeGroup,
        });

    try {
      await this.transporter.sendMail({
        from: `"Finova App" <${process.env.MAIL_USER}>`,
        to: toEmail,
        subject,
        html,
      });
      this.logger.log(`Email de invitación enviado a ${toEmail}`);
    } catch (error: unknown) {
      // No interrumpimos el flujo si el email falla — el usuario igual queda en el grupo
      const errMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error enviando email a ${toEmail}: ${errMsg}`);
    }
  }

  /** Envía el código de 6 dígitos para restablecer la contraseña. */
  async sendPasswordResetCode({
    toEmail,
    name,
    code,
  }: {
    toEmail: string;
    name: string;
    code: string;
  }): Promise<void> {
    const safeName = this.escapeHtml(name);
    const html = `
      <!DOCTYPE html>
      <html lang="es">
      <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
      <body style="margin:0;padding:0;background:#f4f6fb;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:40px 0;">
          <tr><td align="center">
            <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
              <tr><td style="background:linear-gradient(135deg,#1D4ED8,#2563EB);padding:32px 40px;text-align:center;">
                <span style="font-size:28px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;">Finova</span>
                <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:14px;">Tu dinero, organizado.</p>
              </td></tr>
              <tr><td style="padding:36px 40px;">
                <h2 style="margin:0 0 8px;font-size:22px;color:#111827;font-weight:700;">Restablecer contraseña 🔐</h2>
                <p style="color:#6B7280;font-size:15px;line-height:1.6;margin:0 0 24px;">
                  Hola <strong style="color:#111827;">${safeName}</strong>, usá este código para elegir una nueva contraseña. Vence en 15 minutos.
                </p>
                <div style="background:#EFF6FF;border-radius:12px;padding:20px;text-align:center;margin-bottom:24px;">
                  <span style="font-size:36px;font-weight:800;letter-spacing:10px;color:#1D4ED8;">${code}</span>
                </div>
                <p style="color:#9CA3AF;font-size:13px;margin:0;">Si no pediste este cambio, ignorá este email: tu contraseña seguirá siendo la misma.</p>
              </td></tr>
            </table>
          </td></tr>
        </table>
      </body>
      </html>
    `;

    try {
      await this.transporter.sendMail({
        from: `"Finova App" <${process.env.MAIL_USER}>`,
        to: toEmail,
        subject: `${code} es tu código para restablecer tu contraseña de Finova`,
        html,
      });
      this.logger.log(`Código de recuperación enviado a ${toEmail}`);
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Error enviando código de recuperación a ${toEmail}: ${errMsg}`,
      );
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
                <h2 style="margin:0 0 8px;font-size:22px;color:#111827;font-weight:700;">¡Te invitaron a un grupo! 🎉</h2>
                <p style="color:#6B7280;font-size:15px;line-height:1.6;margin:0 0 24px;">
                  <strong style="color:#111827;">${inviterName}</strong> te invitó al grupo
                  <strong style="color:#2563EB;">"${groupName}"</strong> en Finova.
                  Podés aceptar o rechazar la invitación desde la app.
                </p>
                <div style="background:#EFF6FF;border-left:4px solid #2563EB;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
                  <p style="margin:0;color:#1E40AF;font-size:14px;">💡 Abrí la app de Finova y andá a la pestaña <strong>Notificaciones</strong> para responder la invitación a <strong>"${groupName}"</strong>.</p>
                </div>
              </td></tr>
              <!-- Footer -->
              <tr><td style="padding:20px 40px;border-top:1px solid #F3F4F6;text-align:center;">
                <p style="color:#9CA3AF;font-size:12px;margin:0;">Recibiste este email porque alguien te invitó a un grupo en Finova.</p>
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
