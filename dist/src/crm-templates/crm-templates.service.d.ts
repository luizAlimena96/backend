import { PrismaService } from '../database/prisma.service';
export declare class CrmTemplatesService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(organizationId: string): Promise<{
        id: string;
        organizationId: string | null;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        crmType: string;
        baseUrl: string;
        authType: string;
        automations: import("@prisma/client/runtime/library").JsonValue;
        isPublic: boolean;
    }[]>;
    create(data: any): Promise<{
        id: string;
        organizationId: string | null;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        crmType: string;
        baseUrl: string;
        authType: string;
        automations: import("@prisma/client/runtime/library").JsonValue;
        isPublic: boolean;
    }>;
    instantiate(templateId: string, data: any): Promise<{
        id: string;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        isActive: boolean;
        crmType: string;
        baseUrl: string;
        authType: string;
        apiKey: string;
    }>;
    delete(id: string, organizationId: string): Promise<{
        id: string;
        organizationId: string | null;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        crmType: string;
        baseUrl: string;
        authType: string;
        automations: import("@prisma/client/runtime/library").JsonValue;
        isPublic: boolean;
    }>;
}
