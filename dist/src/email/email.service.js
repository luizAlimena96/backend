"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailService = void 0;
const common_1 = require("@nestjs/common");
const resend_1 = require("resend");
const config_1 = require("@nestjs/config");
let EmailService = class EmailService {
    configService;
    resend = null;
    apiKey;
    fromEmail;
    constructor(configService) {
        this.configService = configService;
        this.apiKey = this.configService.get('RESEND_API_KEY');
        if (!this.apiKey) {
            console.warn('RESEND_API_KEY not found. Email sending will fail.');
        }
        else {
            this.resend = new resend_1.Resend(this.apiKey);
        }
        this.fromEmail = this.configService.get('EMAIL_FROM') || 'LEXA IA <noreply@lexa.com>';
    }
    async sendPasswordResetEmail(email, resetLink, userName = 'Usuário') {
        try {
            if (!this.resend) {
                console.error('[Email Service] Resend is not initialized. RESEND_API_KEY might be missing.');
                return { success: false, error: 'Email service not configured.' };
            }
            const { data, error } = await this.resend.emails.send({
                from: this.fromEmail,
                to: [email],
                subject: 'Recuperação de Senha - LEXA IA',
                html: `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Recuperação de Senha</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">LEXA IA</h1>
                            <p style="margin: 10px 0 0 0; color: #e0e7ff; font-size: 14px;">Sua assistente virtual inteligente</p>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 40px 20px 40px;">
                            <h2 style="margin: 0 0 20px 0; color: #1f2937; font-size: 24px; font-weight: 600;">Olá, ${userName}!</h2>
                            <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                                Recebemos uma solicitação para redefinir a senha da sua conta LEXA IA.
                            </p>
                            <p style="margin: 0 0 30px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                                Clique no botão abaixo para criar uma nova senha:
                            </p>
                            
                            <!-- Button -->
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center" style="padding: 0 0 30px 0;">
                                        <a href="${resetLink}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.4);">
                                            Redefinir Senha
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Alternative Link -->
                            <p style="margin: 0 0 20px 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                                Ou copie e cole este link no seu navegador:
                            </p>
                            <p style="margin: 0 0 30px 0; padding: 12px; background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; word-break: break-all; font-size: 13px; color: #4b5563;">
                                ${resetLink}
                            </p>
                            
                            <!-- Warning -->
                            <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 6px; margin-bottom: 30px;">
                                <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.6;">
                                    <strong>⚠️ Importante:</strong> Este link expira em <strong>1 hora</strong>.
                                </p>
                            </div>
                            
                            <!-- Security Notice -->
                            <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                                Se você não solicitou esta redefinição de senha, ignore este email. Sua senha permanecerá inalterada.
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f9fafb; padding: 30px 40px; border-top: 1px solid #e5e7eb;">
                            <p style="margin: 0 0 10px 0; color: #9ca3af; font-size: 13px; text-align: center;">
                                © 2025 LEXA IA. Todos os direitos reservados.
                            </p>
                            <p style="margin: 0; color: #9ca3af; font-size: 13px; text-align: center;">
                                Este é um email automático, por favor não responda.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
        `,
            });
            if (error) {
                console.error('[Email Service] Error sending password reset email:', error);
                return { success: false, error: error.message };
            }
            console.log('[Email Service] Password reset email sent successfully:', data);
            return { success: true };
        }
        catch (error) {
            console.error('[Email Service] Unexpected error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
};
exports.EmailService = EmailService;
exports.EmailService = EmailService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], EmailService);
//# sourceMappingURL=email.service.js.map