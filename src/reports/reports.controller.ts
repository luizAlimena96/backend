import { Controller, Get, Post, Body, Param, Query, UseGuards, HttpCode, HttpStatus, Req, Res } from '@nestjs/common';
import { Response } from 'express';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
    constructor(private reportsService: ReportsService) { }

    @Get()
    async getReports(@Query('organizationId') queryOrgId: string, @Req() req) {
        // Prefer authenticated user's organization or allow query override if super admin (simplified: just use user's)
        const organizationId = req.user.organizationId || queryOrgId;
        return this.reportsService.getReports(organizationId);
    }

    @Get('metrics')
    async getMetrics(@Query('organizationId') queryOrgId: string, @Req() req) {
        const organizationId = req.user.organizationId || queryOrgId;
        return this.reportsService.getMetrics(organizationId);
    }

    @Post('generate')
    @HttpCode(HttpStatus.OK)
    async generateReport(@Body() data: any, @Req() req) {
        return this.reportsService.generateReport({
            ...data,
            organizationId: req.user.organizationId
        });
    }

    @Get(':id/download')
    async downloadReport(@Param('id') id: string, @Res() res: Response) {
        const buffer = await this.reportsService.downloadReport(id);

        res.set({
            'Content-Type': 'text/plain',
            'Content-Disposition': `attachment; filename="relatorio-${id}.txt"`,
            'Content-Length': buffer.length,
        });

        res.send(buffer);
    }
}
