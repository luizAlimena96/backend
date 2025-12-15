import { Controller, Get, Post, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CrmTemplatesService } from './crm-templates.service';

@Controller('crm/templates')
@UseGuards(JwtAuthGuard)
export class CrmTemplatesController {
    constructor(private readonly crmTemplatesService: CrmTemplatesService) { }

    @Get()
    async findAll(@Request() req, @Param('organizationId') organizationId?: string) {
        return this.crmTemplatesService.findAll(organizationId || req.user.organizationId);
    }

    @Post()
    async create(@Body() data: any, @Request() req) {
        return this.crmTemplatesService.create({
            ...data,
            organizationId: data.organizationId || req.user.organizationId,
        });
    }

    @Post(':id/instantiate')
    async instantiate(@Param('id') id: string, @Body() data: any, @Request() req) {
        return this.crmTemplatesService.instantiate(id, {
            ...data,
            organizationId: data.organizationId || req.user.organizationId,
        });
    }

    @Delete(':id')
    async delete(@Param('id') id: string, @Request() req) {
        return this.crmTemplatesService.delete(id, req.user.organizationId);
    }
}
