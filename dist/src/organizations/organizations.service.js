"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrganizationsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../database/prisma.service");
const zapsign_service_1 = require("../integrations/zapsign/zapsign.service");
let OrganizationsService = class OrganizationsService {
    prisma;
    zapSignService;
    constructor(prisma, zapSignService) {
        this.prisma = prisma;
        this.zapSignService = zapSignService;
    }
    async findAll(userId, userRole, userOrgId) {
        const where = userRole === 'SUPER_ADMIN' ? {} : { id: userOrgId || '' };
        return this.prisma.organization.findMany({
            where,
            select: {
                id: true,
                name: true,
                slug: true,
                email: true,
                phone: true,
                isActive: true,
                whatsappConnected: true,
                googleCalendarEnabled: true,
                googleTokenExpiry: true,
                crmEnabled: true,
                crmType: true,
                openaiApiKey: true,
                openaiProjectId: true,
                elevenLabsApiKey: true,
                elevenLabsVoiceId: true,
                evolutionApiUrl: true,
                evolutionInstanceName: true,
                zapSignApiToken: true,
                zapSignTemplateId: true,
                _count: {
                    select: {
                        users: true,
                        agents: true,
                        leads: true,
                    },
                },
            },
            orderBy: { name: 'asc' },
        });
    }
    async findOne(id) {
        const organization = await this.prisma.organization.findUnique({
            where: { id },
            include: {
                users: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        role: true,
                        allowedTabs: true,
                        createdAt: true,
                    },
                },
                _count: {
                    select: {
                        users: true,
                        agents: true,
                        leads: true,
                        conversations: true,
                    },
                },
            },
        });
        if (!organization) {
            throw new common_1.NotFoundException('Organização não encontrada');
        }
        return organization;
    }
    async create(data) {
        const { name, slug, email, phone, settings, openaiApiKey, openaiProjectId, elevenLabsApiKey, elevenLabsVoiceId, evolutionApiUrl, evolutionInstanceName, zapSignApiToken, zapSignTemplateId } = data;
        if (!name || !slug) {
            throw new common_1.ForbiddenException('Nome e slug são obrigatórios');
        }
        const existing = await this.prisma.organization.findUnique({
            where: { slug },
        });
        if (existing) {
            throw new common_1.ForbiddenException('Slug já está em uso');
        }
        const createData = {
            name,
            slug: slug.toLowerCase(),
            email: email || null,
            phone: phone || null,
            settings,
            isActive: true,
        };
        if (openaiApiKey)
            createData.openaiApiKey = openaiApiKey;
        if (openaiProjectId)
            createData.openaiProjectId = openaiProjectId;
        if (elevenLabsApiKey)
            createData.elevenLabsApiKey = elevenLabsApiKey;
        if (elevenLabsVoiceId)
            createData.elevenLabsVoiceId = elevenLabsVoiceId;
        if (evolutionApiUrl)
            createData.evolutionApiUrl = evolutionApiUrl;
        if (evolutionInstanceName)
            createData.evolutionInstanceName = evolutionInstanceName;
        if (zapSignApiToken)
            createData.zapSignApiToken = zapSignApiToken;
        if (zapSignTemplateId)
            createData.zapSignTemplateId = zapSignTemplateId;
        return this.prisma.organization.create({
            data: createData,
        });
    }
    async update(id, data, userRole) {
        const allowedFields = userRole === 'SUPER_ADMIN'
            ? data
            : {
                name: data.name,
                email: data.email,
                phone: data.phone,
                niche: data.niche,
                document: data.document,
                zipCode: data.zipCode,
                street: data.street,
                number: data.number,
                neighborhood: data.neighborhood,
                city: data.city,
                state: data.state,
                settings: data.settings,
            };
        const cleanData = Object.entries(allowedFields).reduce((acc, [key, value]) => {
            if (value !== undefined) {
                acc[key] = value;
            }
            return acc;
        }, {});
        try {
            return await this.prisma.organization.update({
                where: { id },
                data: cleanData,
            });
        }
        catch (error) {
            if (error?.code === 'P2025' || error?.message?.includes('Unknown argument')) {
                console.warn('[Organizations] Some fields may not exist in DB yet:', error.message);
                const safeFields = {
                    name: cleanData.name,
                    email: cleanData.email,
                    phone: cleanData.phone,
                    niche: cleanData.niche,
                    settings: cleanData.settings,
                };
                const safeCleaned = Object.entries(safeFields).reduce((acc, [key, value]) => {
                    if (value !== undefined)
                        acc[key] = value;
                    return acc;
                }, {});
                if (Object.keys(safeCleaned).length > 0) {
                    return this.prisma.organization.update({
                        where: { id },
                        data: safeCleaned,
                    });
                }
            }
            throw error;
        }
    }
    async remove(id) {
        await this.prisma.organization.delete({
            where: { id },
        });
        return { success: true };
    }
    async updateZapSignConfig(id, data) {
        return this.prisma.organization.update({
            where: { id },
            data: {
                zapSignApiToken: data.apiToken,
                zapSignTemplateId: data.templateId,
            }
        });
    }
    async testZapSignConnection(apiToken) {
        try {
            await this.zapSignService.getTemplates(apiToken);
            return { success: true, message: 'Conexão realizada com sucesso!' };
        }
        catch (error) {
            return { success: false, message: 'Falha na autenticação: Verifique o token.' };
        }
    }
    canAccessOrganization(userRole, userOrgId, targetOrgId) {
        if (userRole === 'SUPER_ADMIN')
            return true;
        return userOrgId === targetOrgId;
    }
};
exports.OrganizationsService = OrganizationsService;
exports.OrganizationsService = OrganizationsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        zapsign_service_1.ZapSignService])
], OrganizationsService);
//# sourceMappingURL=organizations.service.js.map