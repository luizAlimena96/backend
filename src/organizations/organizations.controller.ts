import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    Request,
    HttpCode,
    HttpStatus,
    ForbiddenException,
} from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('organizations')
@UseGuards(JwtAuthGuard)
export class OrganizationsController {
    constructor(private organizationsService: OrganizationsService) { }

    @Get()
    async findAll(@Request() req) {
        const { id: userId, role, organizationId } = req.user;
        return this.organizationsService.findAll(userId, role, organizationId);
    }

    @Get(':id')
    async findOne(@Param('id') id: string, @Request() req) {
        const { role, organizationId } = req.user;

        if (!this.organizationsService.canAccessOrganization(role, organizationId, id)) {
            throw new ForbiddenException('Sem permissão para acessar esta organização');
        }

        return this.organizationsService.findOne(id);
    }

    @Post()
    async create(@Body() data: any, @Request() req) {
        const { role } = req.user;

        if (role !== 'SUPER_ADMIN') {
            throw new ForbiddenException('Apenas SUPER_ADMIN pode criar organizações');
        }

        return this.organizationsService.create(data);
    }

    @Put(':id')
    async update(@Param('id') id: string, @Body() data: any, @Request() req) {
        const { role, organizationId } = req.user;

        if (!this.organizationsService.canAccessOrganization(role, organizationId, id)) {
            throw new ForbiddenException('Sem permissão para editar esta organização');
        }

        return this.organizationsService.update(id, data, role);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.OK)
    async remove(@Param('id') id: string, @Request() req) {
        const { role } = req.user;

        if (role !== 'SUPER_ADMIN') {
            throw new ForbiddenException('Apenas SUPER_ADMIN pode deletar organizações');
        }

        return this.organizationsService.remove(id);
    }

    // ============================================
    // ZAPSIGN CONFIG (Organization Level)
    // ============================================

    @Post(':id/zapsign')
    async saveZapSignConfig(
        @Param('id') id: string,
        @Body() data: { enabled: boolean; apiToken: string; templateId: string },
        @Request() req
    ) {
        const { role, organizationId } = req.user;

        if (!this.organizationsService.canAccessOrganization(role, organizationId, id)) {
            throw new ForbiddenException('Sem permissão para configurar esta organização');
        }

        return this.organizationsService.updateZapSignConfig(id, data);
    }

    @Post(':id/zapsign/test')
    async testZapSignConfig(
        @Param('id') id: string,
        @Body() data: { apiToken: string },
        @Request() req
    ) {
        const { role, organizationId } = req.user;

        if (!this.organizationsService.canAccessOrganization(role, organizationId, id)) {
            throw new ForbiddenException('Sem permissão para testar conexão desta organização');
        }

        return this.organizationsService.testZapSignConnection(data.apiToken);
    }
}
