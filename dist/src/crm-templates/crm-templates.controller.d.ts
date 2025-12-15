import { CrmTemplatesService } from './crm-templates.service';
export declare class CrmTemplatesController {
    private readonly crmTemplatesService;
    constructor(crmTemplatesService: CrmTemplatesService);
    findAll(req: any, organizationId?: string): Promise<{
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
    create(data: any, req: any): Promise<{
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
    instantiate(id: string, data: any, req: any): Promise<{
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
    delete(id: string, req: any): Promise<{
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
