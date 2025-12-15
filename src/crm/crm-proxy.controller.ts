import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Controller('crm')
@UseGuards(JwtAuthGuard)
export class CRMProxyController {
    constructor(private httpService: HttpService) { }

    @Post('proxy')
    async proxyRequest(@Body() data: {
        url: string;
        method: string;
        headers: Record<string, string>;
        body?: any;
    }): Promise<any> {
        const startTime = Date.now();

        try {
            const response = await firstValueFrom(
                this.httpService.request({
                    url: data.url,
                    method: data.method as any,
                    headers: data.headers,
                    data: data.body,
                    timeout: 30000,
                })
            );

            const responseTime = Date.now() - startTime;

            return {
                status: response.status,
                statusText: response.statusText,
                headers: response.headers,
                data: response.data,
                responseTime,
            };
        } catch (error: any) {
            const responseTime = Date.now() - startTime;

            if (error.response) {
                return {
                    status: error.response.status,
                    statusText: error.response.statusText,
                    error: error.message,
                    details: error.response.data,
                    responseTime,
                };
            }

            return {
                status: 0,
                statusText: 'Error',
                error: error.message,
                details: {
                    message: 'Erro ao fazer requisição para o CRM',
                    originalError: error.message,
                },
                responseTime,
            };
        }
    }
}
