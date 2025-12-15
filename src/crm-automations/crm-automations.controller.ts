import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CrmAutomationsService } from './crm-automations.service';

@Controller('crm/automations')
@UseGuards(JwtAuthGuard)
export class CrmAutomationsController {
    constructor(private readonly crmAutomationsService: CrmAutomationsService) { }

    @Get()
    async findAll(@Request() req) {
        return this.crmAutomationsService.findAll(req.user.organizationId);
    }

    @Get(':id')
    async findOne(@Param('id') id: string, @Request() req) {
        return this.crmAutomationsService.findOne(id, req.user.organizationId);
    }

    @Post()
    async create(@Body() data: any, @Request() req) {
        return this.crmAutomationsService.create(data, req.user.organizationId);
    }

    @Patch(':id')
    async update(@Param('id') id: string, @Body() data: any, @Request() req) {
        return this.crmAutomationsService.update(id, data, req.user.organizationId);
    }

    @Delete(':id')
    async delete(@Param('id') id: string, @Request() req) {
        return this.crmAutomationsService.delete(id, req.user.organizationId);
    }
}
