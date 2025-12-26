import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CrmAutomationsService } from './crm-automations.service';

@Controller('crm/automations')
@UseGuards(JwtAuthGuard)
export class CrmAutomationsController {
    constructor(private readonly crmAutomationsService: CrmAutomationsService) { }

    @Get()
    async findAll(@Query('organizationId') queryOrgId: string, @Request() req) {
        const orgId = queryOrgId || req.user.organizationId;
        if (!orgId) throw new Error('Organization ID required');
        return this.crmAutomationsService.findAll(orgId);
    }

    @Get(':id')
    async findOne(@Param('id') id: string, @Query('organizationId') queryOrgId: string, @Request() req) {
        const orgId = queryOrgId || req.user.organizationId;
        return this.crmAutomationsService.findOne(id, orgId);
    }

    @Post()
    async create(@Body() data: any, @Request() req) {
        const orgId = data.organizationId || req.user.organizationId;
        if (!orgId) throw new Error('Organization ID required');
        return this.crmAutomationsService.create(data, orgId);
    }

    @Patch(':id')
    async update(@Param('id') id: string, @Body() data: any, @Request() req) {
        const orgId = data.organizationId || req.user.organizationId;
        return this.crmAutomationsService.update(id, data, orgId);
    }

    @Delete(':id')
    async delete(@Param('id') id: string, @Query('organizationId') queryOrgId: string, @Request() req) {
        const orgId = queryOrgId || req.user.organizationId;
        return this.crmAutomationsService.delete(id, orgId);
    }
}
