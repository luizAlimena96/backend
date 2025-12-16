import { CrmAutomationsService } from './crm-automations.service';
export declare class CrmAutomationsController {
    private readonly crmAutomationsService;
    constructor(crmAutomationsService: CrmAutomationsService);
    findAll(req: any): Promise<({
        crmStage: {
            id: string;
            organizationId: string;
            agentId: string;
            createdAt: Date;
            name: string;
            updatedAt: Date;
            description: string | null;
            order: number;
            color: string;
        } | null;
        crmConfig: {
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
        };
    } & {
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
    })[]>;
    findOne(id: string, req: any): Promise<{
        crmStage: {
            id: string;
            organizationId: string;
            agentId: string;
            createdAt: Date;
            name: string;
            updatedAt: Date;
            description: string | null;
            order: number;
            color: string;
        } | null;
        crmConfig: {
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
        };
    } & {
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
    }>;
    create(data: any, req: any): Promise<{
        crmStage: {
            id: string;
            organizationId: string;
            agentId: string;
            createdAt: Date;
            name: string;
            updatedAt: Date;
            description: string | null;
            order: number;
            color: string;
        } | null;
        crmConfig: {
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
        };
    } & {
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
    }>;
    update(id: string, data: any, req: any): Promise<{
        crmStage: {
            id: string;
            organizationId: string;
            agentId: string;
            createdAt: Date;
            name: string;
            updatedAt: Date;
            description: string | null;
            order: number;
            color: string;
        } | null;
        crmConfig: {
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
        };
    } & {
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
    }>;
    delete(id: string, req: any): Promise<{
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
    }>;
}
