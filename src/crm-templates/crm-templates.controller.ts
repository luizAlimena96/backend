import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CrmTemplatesService } from './crm-templates.service';

@Controller('crm/templates')
@UseGuards(JwtAuthGuard)
export class CrmTemplatesController {
    constructor(private readonly crmTemplatesService: CrmTemplatesService) { }

    @Get()
    async findAll(@Query('organizationId') queryOrgId: string, @Request() req) {
        const orgId = queryOrgId || req.user.organizationId;
        return this.crmTemplatesService.findAll(orgId);
    }

    @Post()
    async create(@Body() data: any, @Request() req) {
        const orgId = data.organizationId || req.user.organizationId;
        if (!orgId) throw new Error('Organization ID required');
        return this.crmTemplatesService.create({
            ...data,
            organizationId: orgId,
        });
    }

    @Post(':id/instantiate')
    async instantiate(@Param('id') id: string, @Body() data: any, @Request() req) {
        const orgId = data.organizationId || req.user.organizationId;
        if (!orgId) throw new Error('Organization ID required');
        return this.crmTemplatesService.instantiate(id, {
            ...data,
            organizationId: orgId,
        });
    }

    @Delete(':id')
    async delete(@Param('id') id: string, @Query('organizationId') queryOrgId: string, @Request() req) {
        const orgId = queryOrgId || req.user.organizationId;
        return this.crmTemplatesService.delete(id, orgId);
    }
}
