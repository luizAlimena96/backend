import { PrismaService } from '../database/prisma.service';
export declare class CrmAutomationsService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(organizationId: string): Promise<({
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
    findOne(id: string, organizationId: string): Promise<{
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
    create(data: any, organizationId: string): Promise<{
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
    update(id: string, data: any, organizationId: string): Promise<{
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
    delete(id: string, organizationId: string): Promise<{
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
