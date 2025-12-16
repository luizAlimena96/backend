import { PrismaService } from '../database/prisma.service';
export declare class CRMTemplatesController {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(organizationId: string): Promise<{
        id: string;
        organizationId: string | null;
        createdAt: Date;
        name: string;
        updatedAt: Date;
        description: string | null;
        crmType: string;
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
        id: string;
        organizationId: string | null;
        createdAt: Date;
        name: string;
        updatedAt: Date;
        description: string | null;
        crmType: string;
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
        id: string;
        organizationId: string;
        createdAt: Date;
        name: string;
        isActive: boolean;
        updatedAt: Date;
        crmType: string;
        apiKey: string;
        baseUrl: string;
        authType: string;
    }>;
    delete(id: string): Promise<{
        id: string;
        organizationId: string | null;
        createdAt: Date;
        name: string;
        updatedAt: Date;
        description: string | null;
        crmType: string;
        baseUrl: string;
        authType: string;
        automations: import("@prisma/client/runtime/library").JsonValue;
        isPublic: boolean;
    }>;
}
