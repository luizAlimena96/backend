import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CrmConfigsService } from './crm-configs.service';

@Controller('crm/configs')
@UseGuards(JwtAuthGuard)
export class CrmConfigsController {
    constructor(private readonly crmConfigsService: CrmConfigsService) { }

    @Get()
    async findAll(@Request() req) {
        return this.crmConfigsService.findAll(req.user.organizationId);
    }

    @Get(':id')
    async findOne(@Param('id') id: string, @Request() req) {
        return this.crmConfigsService.findOne(id, req.user.organizationId);
    }

    @Post()
    async create(@Body() data: any, @Request() req) {
        return this.crmConfigsService.create({
            ...data,
            organizationId: data.organizationId || req.user.organizationId,
        });
    }

    @Patch(':id')
    async update(@Param('id') id: string, @Body() data: any, @Request() req) {
        return this.crmConfigsService.update(id, data, req.user.organizationId);
    }

    @Delete(':id')
    async delete(@Param('id') id: string, @Request() req) {
        return this.crmConfigsService.delete(id, req.user.organizationId);
    }
}
