import { PrismaService } from '../database/prisma.service';
export declare class CrmTemplatesService {
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
    create(data: any): Promise<{
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
    instantiate(templateId: string, data: any): Promise<{
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
    delete(id: string, organizationId: string): Promise<{
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
