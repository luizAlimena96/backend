import { PrismaService } from '../database/prisma.service';
export declare class CRMTemplatesController {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(organizationId: string): Promise<{
        name: string;
        id: string;
        organizationId: string | null;
        createdAt: Date;
        updatedAt: Date;
        crmType: string;
        description: string | null;
        baseUrl: string;
        authType: string;
        automations: import("@prisma/client/runtime/library").JsonValue;
        isPublic: boolean;
    }[]>;
    create(data: {
        name: string;
        description?: string;
        crmConfigId: string;
        organizationId: string;
    }): Promise<{
        name: string;
        id: string;
        organizationId: string | null;
        createdAt: Date;
        updatedAt: Date;
        crmType: string;
        description: string | null;
        baseUrl: string;
        authType: string;
        automations: import("@prisma/client/runtime/library").JsonValue;
        isPublic: boolean;
    }>;
    instantiate(id: string, data: {
        organizationId: string;
        name: string;
        apiKey: string;
    }): Promise<{
        isActive: boolean;
        name: string;
        id: string;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        crmType: string;
        apiKey: string;
        baseUrl: string;
        authType: string;
    }>;
    delete(id: string): Promise<{
        name: string;
        id: string;
        organizationId: string | null;
        createdAt: Date;
        updatedAt: Date;
        crmType: string;
        description: string | null;
        baseUrl: string;
        authType: string;
        automations: import("@prisma/client/runtime/library").JsonValue;
        isPublic: boolean;
    }>;
}
