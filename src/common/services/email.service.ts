import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class EmailService {
    constructor(private httpService: HttpService) { }

    async sendEmail(to: string, subject: string, html: string): Promise<void> {
        try {
            // Using a generic email service (configure with your provider)
            const emailProvider = process.env.EMAIL_PROVIDER || 'smtp';

            if (emailProvider === 'sendgrid') {
                await this.sendViaSendGrid(to, subject, html);
            } else {
                console.log('[Email] Would send email:', { to, subject });
            }
        } catch (error) {
            console.error('Email sending error:', error);
        }
    }

    private async sendViaSendGrid(to: string, subject: string, html: string): Promise<void> {
        const apiKey = process.env.SENDGRID_API_KEY;
        if (!apiKey) return;

        await firstValueFrom(
            this.httpService.post(
                'https://api.sendgrid.com/v3/mail/send',
                {
                    personalizations: [{ to: [{ email: to }] }],
                    from: { email: process.env.EMAIL_FROM || 'noreply@lexa.com' },
                    subject,
                    content: [{ type: 'text/html', value: html }],
                },
                {
                    headers: {
                        Authorization: `Bearer ${apiKey}`,
                        'Content-Type': 'application/json',
                    },
                }
            )
        );
    }

    async sendAppointmentReminder(email: string, appointment: any): Promise<void> {
        const html = `
      <h2>Lembrete de Agendamento</h2>
      <p>Você tem um agendamento:</p>
      <p><strong>${appointment.title}</strong></p>
      <p>Data: ${new Date(appointment.scheduledAt).toLocaleString('pt-BR')}</p>
      <p>Duração: ${appointment.duration} minutos</p>
    `;

        await this.sendEmail(email, 'Lembrete de Agendamento', html);
    }
}
