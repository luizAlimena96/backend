import { CrmAutomationsService } from './crm-automations.service';
export declare class CrmAutomationsController {
    private readonly crmAutomationsService;
    constructor(crmAutomationsService: CrmAutomationsService);
    findAll(req: any): Promise<({
        crmStage: {
            name: string;
            id: string;
            organizationId: string;
            agentId: string;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            order: number;
            color: string;
        } | null;
        crmConfig: {
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
        };
    } & {
        isActive: boolean;
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        delayMinutes: number | null;
        order: number;
        crmStageId: string | null;
        agentStateId: string | null;
        crmConfigId: string;
        actions: import("@prisma/client/runtime/library").JsonValue;
        triggerType: string;
    })[]>;
    findOne(id: string, req: any): Promise<{
        crmStage: {
            name: string;
            id: string;
            organizationId: string;
            agentId: string;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            order: number;
            color: string;
        } | null;
        crmConfig: {
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
        };
    } & {
        isActive: boolean;
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        delayMinutes: number | null;
        order: number;
        crmStageId: string | null;
        agentStateId: string | null;
        crmConfigId: string;
        actions: import("@prisma/client/runtime/library").JsonValue;
        triggerType: string;
    }>;
    create(data: any, req: any): Promise<{
        crmStage: {
            name: string;
            id: string;
            organizationId: string;
            agentId: string;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            order: number;
            color: string;
        } | null;
        crmConfig: {
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
        };
    } & {
        isActive: boolean;
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        delayMinutes: number | null;
        order: number;
        crmStageId: string | null;
        agentStateId: string | null;
        crmConfigId: string;
        actions: import("@prisma/client/runtime/library").JsonValue;
        triggerType: string;
    }>;
    update(id: string, data: any, req: any): Promise<{
        crmStage: {
            name: string;
            id: string;
            organizationId: string;
            agentId: string;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            order: number;
            color: string;
        } | null;
        crmConfig: {
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
        };
    } & {
        isActive: boolean;
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        delayMinutes: number | null;
        order: number;
        crmStageId: string | null;
        agentStateId: string | null;
        crmConfigId: string;
        actions: import("@prisma/client/runtime/library").JsonValue;
        triggerType: string;
    }>;
    delete(id: string, req: any): Promise<{
        isActive: boolean;
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        delayMinutes: number | null;
        order: number;
        crmStageId: string | null;
        agentStateId: string | null;
        crmConfigId: string;
        actions: import("@prisma/client/runtime/library").JsonValue;
        triggerType: string;
    }>;
}
