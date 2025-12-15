import { Controller, Get, Post, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
    constructor(private reportsService: ReportsService) { }

    @Get()
    async getReports(@Query('organizationId') organizationId?: string) {
        return this.reportsService.getReports(organizationId);
    }

    @Get('metrics')
    async getMetrics(@Query('organizationId') organizationId?: string) {
        return this.reportsService.getMetrics(organizationId);
    }

    @Post('generate')
    @HttpCode(HttpStatus.OK)
    async generateReport(@Body() data: any) {
        return this.reportsService.generateReport(data);
    }

    @Get(':id/download')
    async downloadReport(@Param('id') id: string) {
        const buffer = await this.reportsService.downloadReport(id);
        // TODO: Set proper headers for file download
        return buffer;
    }
}
