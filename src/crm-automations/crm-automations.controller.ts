import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CrmAutomationsService } from './crm-automations.service';

@Controller('crm/automations')
@UseGuards(JwtAuthGuard)
export class CrmAutomationsController {
    constructor(private readonly crmAutomationsService: CrmAutomationsService) { }

    @Get()
    async findAll(@Request() req, @Body() body) {
        // GET usually doesn't have body, pass as query param ideally, but for now let's hope req.user works or we check query
        const orgId = req.query.organizationId || req.user.organizationId;
        if (!orgId) throw new Error('Organization ID required');
        return this.crmAutomationsService.findAll(orgId);
    }

    @Get(':id')
    async findOne(@Param('id') id: string, @Request() req) {
        const orgId = req.query.organizationId || req.user.organizationId;
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
    async delete(@Param('id') id: string, @Request() req) {
        const orgId = req.query.organizationId || req.body.organizationId || req.user.organizationId;
        return this.crmAutomationsService.delete(id, orgId);
    }
}
