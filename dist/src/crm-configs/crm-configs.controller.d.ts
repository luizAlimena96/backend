import { CrmConfigsService } from './crm-configs.service';
export declare class CrmConfigsController {
    private readonly crmConfigsService;
    constructor(crmConfigsService: CrmConfigsService);
    findAll(req: any): Promise<({
        automations: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            description: string | null;
            isActive: boolean;
            order: number;
            crmStageId: string | null;
            delayMinutes: number | null;
            crmConfigId: string;
            actions: import("@prisma/client/runtime/library").JsonValue;
            agentStateId: string | null;
            triggerType: string;
        }[];
    } & {
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
    })[]>;
    findOne(id: string, req: any): Promise<{
        automations: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            description: string | null;
            isActive: boolean;
            order: number;
            crmStageId: string | null;
            delayMinutes: number | null;
            crmConfigId: string;
            actions: import("@prisma/client/runtime/library").JsonValue;
            agentStateId: string | null;
            triggerType: string;
        }[];
    } & {
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
    create(data: any, req: any): Promise<{
        automations: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            description: string | null;
            isActive: boolean;
            order: number;
            crmStageId: string | null;
            delayMinutes: number | null;
            crmConfigId: string;
            actions: import("@prisma/client/runtime/library").JsonValue;
            agentStateId: string | null;
            triggerType: string;
        }[];
    } & {
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
    update(id: string, data: any, req: any): Promise<{
        automations: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            description: string | null;
            isActive: boolean;
            order: number;
            crmStageId: string | null;
            delayMinutes: number | null;
            crmConfigId: string;
            actions: import("@prisma/client/runtime/library").JsonValue;
            agentStateId: string | null;
            triggerType: string;
        }[];
    } & {
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
}
