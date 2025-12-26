import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CrmConfigsService } from './crm-configs.service';

@Controller('crm/configs')
@UseGuards(JwtAuthGuard)
export class CrmConfigsController {
    constructor(private readonly crmConfigsService: CrmConfigsService) { }

    @Get()
    async findAll(@Query('organizationId') queryOrgId: string, @Request() req) {
        const orgId = queryOrgId || req.user.organizationId;
        // For SUPER_ADMIN, if no orgId provided, return all (or empty)
        return this.crmConfigsService.findAll(orgId);
    }

    @Get(':id')
    async findOne(@Param('id') id: string, @Query('organizationId') queryOrgId: string, @Request() req) {
        const orgId = queryOrgId || req.user.organizationId;
        return this.crmConfigsService.findOne(id, orgId);
    }

    @Post()
    async create(@Body() data: any, @Request() req) {
        const orgId = data.organizationId || req.user.organizationId;
        if (!orgId) throw new Error('Organization ID required');
        return this.crmConfigsService.create({
            ...data,
            organizationId: orgId,
        });
    }

    @Patch(':id')
    async update(@Param('id') id: string, @Body() data: any, @Request() req) {
        const orgId = data.organizationId || req.user.organizationId;
        return this.crmConfigsService.update(id, data, orgId);
    }

    @Delete(':id')
    async delete(@Param('id') id: string, @Query('organizationId') queryOrgId: string, @Request() req) {
        const orgId = queryOrgId || req.user.organizationId;
        return this.crmConfigsService.delete(id, orgId);
    }
}
