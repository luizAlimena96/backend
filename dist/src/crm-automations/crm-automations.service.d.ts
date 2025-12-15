import { PrismaService } from '../database/prisma.service';
export declare class CrmAutomationsService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(organizationId: string): Promise<({
        crmStage: {
            id: string;
            organizationId: string;
            agentId: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            description: string | null;
            order: number;
            color: string;
        } | null;
        crmConfig: {
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
        };
    } & {
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
    })[]>;
    findOne(id: string, organizationId: string): Promise<{
        crmStage: {
            id: string;
            organizationId: string;
            agentId: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            description: string | null;
            order: number;
            color: string;
        } | null;
        crmConfig: {
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
        };
    } & {
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
    }>;
    create(data: any, organizationId: string): Promise<{
        crmStage: {
            id: string;
            organizationId: string;
            agentId: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            description: string | null;
            order: number;
            color: string;
        } | null;
        crmConfig: {
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
        };
    } & {
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
    }>;
    update(id: string, data: any, organizationId: string): Promise<{
        crmStage: {
            id: string;
            organizationId: string;
            agentId: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            description: string | null;
            order: number;
            color: string;
        } | null;
        crmConfig: {
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
        };
    } & {
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
    }>;
    delete(id: string, organizationId: string): Promise<{
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
    }>;
}
