import { HttpService } from '@nestjs/axios';
export declare class EmailService {
    private httpService;
    constructor(httpService: HttpService);
    sendEmail(to: string, subject: string, html: string): Promise<void>;
    private sendViaSendGrid;
    sendAppointmentReminder(email: string, appointment: any): Promise<void>;
}
