import { CrmTemplatesService } from './crm-templates.service';
export declare class CrmTemplatesController {
    private readonly crmTemplatesService;
    constructor(crmTemplatesService: CrmTemplatesService);
    findAll(req: any, organizationId?: string): Promise<{
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
    create(data: any, req: any): Promise<{
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
    instantiate(id: string, data: any, req: any): Promise<{
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
    delete(id: string, req: any): Promise<{
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
