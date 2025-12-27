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
import { WhatsAppIntegrationService } from '../integrations/whatsapp/whatsapp-integration.service';

@Controller('organizations')
@UseGuards(JwtAuthGuard)
export class OrganizationsController {
    constructor(
        private organizationsService: OrganizationsService,
        private whatsappService: WhatsAppIntegrationService,
    ) { }

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
    // WHATSAPP CONNECTION
    // ============================================

    @Get(':id/whatsapp')
    async getWhatsAppStatus(@Param('id') id: string, @Request() req) {
        const { role, organizationId } = req.user;

        if (!this.organizationsService.canAccessOrganization(role, organizationId, id)) {
            throw new ForbiddenException('Sem permissão para ver status desta organização');
        }

        try {
            const org = await this.organizationsService.findOne(id);

            // If no instance name, not connected
            if (!org.evolutionInstanceName) {
                return {
                    connected: false,
                    instanceName: null,
                    alertPhone1: org.whatsappAlertPhone1 || null,
                    alertPhone2: org.whatsappAlertPhone2 || null,
                };
            }

            // Check status with Evolution API
            try {
                const status = await this.whatsappService.getInstanceStatus(org.evolutionInstanceName);

                // Evolution API returns { instance: { state: 'open' | 'close' | ... } } or { state: 'open' | ... }
                const connectionState = status?.instance?.state || status?.state || 'unknown';
                const isConnected = connectionState === 'open';

                // Update organization whatsappConnected field if status changed
                if (org.whatsappConnected !== isConnected) {
                    await this.organizationsService.update(id, {
                        whatsappConnected: isConnected,
                        whatsappConnectedAt: isConnected ? new Date() : null,
                    }, role);
                }

                return {
                    connected: isConnected,
                    connectionState,
                    instanceName: org.evolutionInstanceName,
                    phone: org.whatsappPhone || null,
                    alertPhone1: org.whatsappAlertPhone1 || null,
                    alertPhone2: org.whatsappAlertPhone2 || null,
                    lastConnected: org.whatsappConnectedAt || null,
                };
            } catch (apiError: any) {
                console.error('[WhatsApp Status] Evolution API error:', apiError?.message);
                // Return cached status if API fails
                return {
                    connected: org.whatsappConnected || false,
                    connectionState: 'unknown',
                    instanceName: org.evolutionInstanceName,
                    phone: org.whatsappPhone || null,
                    alertPhone1: org.whatsappAlertPhone1 || null,
                    alertPhone2: org.whatsappAlertPhone2 || null,
                    lastConnected: org.whatsappConnectedAt || null,
                    error: 'Não foi possível verificar status em tempo real',
                };
            }
        } catch (error: any) {
            console.error('WhatsApp status error:', error);
            return {
                connected: false,
                error: error.message || 'Erro ao verificar status',
            };
        }
    }

    @Post(':id/whatsapp')
    async connectWhatsApp(
        @Param('id') id: string,
        @Body() data: { alertPhone1?: string; alertPhone2?: string },
        @Request() req
    ) {
        const { role, organizationId } = req.user;

        if (!this.organizationsService.canAccessOrganization(role, organizationId, id)) {
            throw new ForbiddenException('Sem permissão para conectar WhatsApp desta organização');
        }

        try {
            // Get organization to get/create instance name
            const org = await this.organizationsService.findOne(id);
            let instanceName = org.evolutionInstanceName;

            // If no instance name, create one based on org id
            if (!instanceName) {
                instanceName = `org_${id.replace(/-/g, '_').substring(0, 20)}`;

                // Try to create instance in Evolution API
                try {
                    await this.whatsappService.createInstance(instanceName);
                } catch (createError: any) {
                    // Instance might already exist, continue
                    console.log('Instance creation result:', createError?.response?.data || createError.message);
                }

                // Save instance name to organization
                await this.organizationsService.update(id, { evolutionInstanceName: instanceName }, role);
            }

            // Save alert phones if provided (or update with existing if already set)
            const alertPhone1 = data.alertPhone1 || org.whatsappAlertPhone1;
            const alertPhone2 = data.alertPhone2 || org.whatsappAlertPhone2 || process.env.LEXA_PHONE;

            if (alertPhone1 || alertPhone2) {
                await this.organizationsService.update(id, {
                    whatsappAlertPhone1: alertPhone1 || undefined,
                    whatsappAlertPhone2: alertPhone2 || undefined,
                }, role);
            }

            // Get QR code
            const qrCode = await this.whatsappService.getQRCode(instanceName);

            return {
                success: true,
                qrCode,
                instanceName,
            };
        } catch (error: any) {
            console.error('WhatsApp connect error:', error);
            return {
                success: false,
                error: error?.response?.data?.message || error.message || 'Erro ao conectar WhatsApp',
            };
        }
    }

    @Delete(':id/whatsapp')
    async disconnectWhatsApp(@Param('id') id: string, @Request() req) {
        const { role, organizationId } = req.user;

        if (!this.organizationsService.canAccessOrganization(role, organizationId, id)) {
            throw new ForbiddenException('Sem permissão para desconectar WhatsApp desta organização');
        }

        try {
            const org = await this.organizationsService.findOne(id);
            if (org.evolutionInstanceName) {
                // Logout from Evolution API
                await this.whatsappService.logoutInstance(org.evolutionInstanceName);
            }

            // Update organization
            await this.organizationsService.update(id, {
                whatsappConnected: false,
                whatsappConnectedAt: null,
                // We keep instance name and alert phones for easier reconnection
            }, role);

            return { success: true };
        } catch (error: any) {
            console.error('WhatsApp disconnect error:', error);
            return {
                success: false,
                error: error.message || 'Erro ao desconectar WhatsApp',
            };
        }
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

    // ============================================
    // CRM SYNC CONFIG (Calendar/Webhooks)
    // ============================================

    @Get(':id/crm-sync')
    async getCrmSyncConfig(@Param('id') id: string, @Request() req) {
        const { role, organizationId } = req.user;

        if (!this.organizationsService.canAccessOrganization(role, organizationId, id)) {
            throw new ForbiddenException('Sem permissão para ver configuração CRM desta organização');
        }

        return this.organizationsService.getCrmSyncConfig(id);
    }

    @Post(':id/crm-sync')
    async saveCrmSyncConfig(
        @Param('id') id: string,
        @Body() data: any,
        @Request() req
    ) {
        const { role, organizationId } = req.user;

        if (!this.organizationsService.canAccessOrganization(role, organizationId, id)) {
            throw new ForbiddenException('Sem permissão para configurar CRM desta organização');
        }

        return this.organizationsService.updateCrmSyncConfig(id, data);
    }

    @Post(':id/crm-sync/test')
    async testCrmSyncConfig(
        @Param('id') id: string,
        @Body() data: { apiUrl: string; apiKey?: string },
        @Request() req
    ) {
        const { role, organizationId } = req.user;

        if (!this.organizationsService.canAccessOrganization(role, organizationId, id)) {
            throw new ForbiddenException('Sem permissão para testar CRM desta organização');
        }

        return this.organizationsService.testCrmSyncConnection(data.apiUrl, data.apiKey);
    }

    @Delete(':id/crm-sync')
    async deleteCrmSyncConfig(@Param('id') id: string, @Request() req) {
        const { role, organizationId } = req.user;

        if (!this.organizationsService.canAccessOrganization(role, organizationId, id)) {
            throw new ForbiddenException('Sem permissão para configurar CRM desta organização');
        }

        return this.organizationsService.updateCrmSyncConfig(id, {
            crmCalendarSyncEnabled: false,
            crmCalendarApiUrl: null,
            crmCalendarApiKey: null,
            crmCalendarType: null,
            appointmentWebhookUrl: null,
            appointmentWebhookEnabled: false
        });
    }

    // ============================================
    // USER MANAGEMENT (Organization Level)
    // ============================================

    @Get(':id/users')
    async listUsers(@Param('id') id: string, @Request() req) {
        const { role, organizationId } = req.user;

        if (!this.organizationsService.canAccessOrganization(role, organizationId, id)) {
            throw new ForbiddenException('Sem permissão para ver usuários desta organização');
        }

        return this.organizationsService.getUsers(id);
    }

    @Post(':id/users')
    async createUser(
        @Param('id') id: string,
        @Body() data: { name: string; email: string; password: string; role?: string; allowedTabs?: string[] },
        @Request() req
    ) {
        const { role, organizationId } = req.user;

        if (!this.organizationsService.canAccessOrganization(role, organizationId, id)) {
            throw new ForbiddenException('Sem permissão para criar usuários nesta organização');
        }

        return this.organizationsService.createUser(id, data);
    }

    @Put(':id/users/:userId')
    async updateUser(
        @Param('id') id: string,
        @Param('userId') userId: string,
        @Body() data: any,
        @Request() req
    ) {
        const { role, organizationId } = req.user;

        if (!this.organizationsService.canAccessOrganization(role, organizationId, id)) {
            throw new ForbiddenException('Sem permissão para editar usuários desta organização');
        }

        return this.organizationsService.updateUser(userId, data);
    }

    @Delete(':id/users/:userId')
    async deleteUser(
        @Param('id') id: string,
        @Param('userId') userId: string,
        @Request() req
    ) {
        const { role, organizationId } = req.user;

        if (!this.organizationsService.canAccessOrganization(role, organizationId, id)) {
            throw new ForbiddenException('Sem permissão para remover usuários desta organização');
        }

        return this.organizationsService.deleteUser(userId);
    }
}
