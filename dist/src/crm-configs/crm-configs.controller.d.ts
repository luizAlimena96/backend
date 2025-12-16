import { CrmConfigsService } from './crm-configs.service';
export declare class CrmConfigsController {
    private readonly crmConfigsService;
    constructor(crmConfigsService: CrmConfigsService);
    findAll(req: any): Promise<({
        automations: {
            id: string;
            createdAt: Date;
            name: string;
            isActive: boolean;
            updatedAt: Date;
            crmStageId: string | null;
            description: string | null;
            delayMinutes: number | null;
            order: number;
            agentStateId: string | null;
            crmConfigId: string;
            actions: import("@prisma/client/runtime/library").JsonValue;
            triggerType: string;
        }[];
    } & {
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
    })[]>;
    findOne(id: string, req: any): Promise<{
        automations: {
            id: string;
            createdAt: Date;
            name: string;
            isActive: boolean;
            updatedAt: Date;
            crmStageId: string | null;
            description: string | null;
            delayMinutes: number | null;
            order: number;
            agentStateId: string | null;
            crmConfigId: string;
            actions: import("@prisma/client/runtime/library").JsonValue;
            triggerType: string;
        }[];
    } & {
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
    create(data: any, req: any): Promise<{
        automations: {
            id: string;
            createdAt: Date;
            name: string;
            isActive: boolean;
            updatedAt: Date;
            crmStageId: string | null;
            description: string | null;
            delayMinutes: number | null;
            order: number;
            agentStateId: string | null;
            crmConfigId: string;
            actions: import("@prisma/client/runtime/library").JsonValue;
            triggerType: string;
        }[];
    } & {
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
    update(id: string, data: any, req: any): Promise<{
        automations: {
            id: string;
            createdAt: Date;
            name: string;
            isActive: boolean;
            updatedAt: Date;
            crmStageId: string | null;
            description: string | null;
            delayMinutes: number | null;
            order: number;
            agentStateId: string | null;
            crmConfigId: string;
            actions: import("@prisma/client/runtime/library").JsonValue;
            triggerType: string;
        }[];
    } & {
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
}
