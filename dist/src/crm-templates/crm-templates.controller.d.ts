import { CrmTemplatesService } from './crm-templates.service';
export declare class CrmTemplatesController {
    private readonly crmTemplatesService;
    constructor(crmTemplatesService: CrmTemplatesService);
    findAll(req: any, organizationId?: string): Promise<{
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
    create(data: any, req: any): Promise<{
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
    instantiate(id: string, data: any, req: any): Promise<{
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
    delete(id: string, req: any): Promise<{
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
