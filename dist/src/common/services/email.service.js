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
const axios_1 = require("@nestjs/axios");
const rxjs_1 = require("rxjs");
let EmailService = class EmailService {
    httpService;
    constructor(httpService) {
        this.httpService = httpService;
    }
    async sendEmail(to, subject, html) {
        try {
            const emailProvider = process.env.EMAIL_PROVIDER || 'smtp';
            if (emailProvider === 'sendgrid') {
                await this.sendViaSendGrid(to, subject, html);
            }
            else {
                console.log('[Email] Would send email:', { to, subject });
            }
        }
        catch (error) {
            console.error('Email sending error:', error);
        }
    }
    async sendViaSendGrid(to, subject, html) {
        const apiKey = process.env.SENDGRID_API_KEY;
        if (!apiKey)
            return;
        await (0, rxjs_1.firstValueFrom)(this.httpService.post('https://api.sendgrid.com/v3/mail/send', {
            personalizations: [{ to: [{ email: to }] }],
            from: { email: process.env.EMAIL_FROM || 'noreply@lexa.com' },
            subject,
            content: [{ type: 'text/html', value: html }],
        }, {
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
        }));
    }
    async sendAppointmentReminder(email, appointment) {
        const html = `
      <h2>Lembrete de Agendamento</h2>
      <p>Você tem um agendamento:</p>
      <p><strong>${appointment.title}</strong></p>
      <p>Data: ${new Date(appointment.scheduledAt).toLocaleString('pt-BR')}</p>
      <p>Duração: ${appointment.duration} minutos</p>
    `;
        await this.sendEmail(email, 'Lembrete de Agendamento', html);
    }
};
exports.EmailService = EmailService;
exports.EmailService = EmailService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [axios_1.HttpService])
], EmailService);
//# sourceMappingURL=email.service.js.map