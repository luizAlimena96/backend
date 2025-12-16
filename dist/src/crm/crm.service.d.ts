import { PrismaService } from "../database/prisma.service";
export declare class CRMService {
    private prisma;
    constructor(prisma: PrismaService);
    findAllConfigs(organizationId: string): Promise<{
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
    }[]>;
    createConfig(data: any): Promise<{
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
    updateConfig(id: string, data: any): Promise<{
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
    deleteConfig(id: string): Promise<{
        success: boolean;
    }>;
    findAllStages(agentId: string): Promise<{
        id: string;
        organizationId: string;
        agentId: string;
        createdAt: Date;
        name: string;
        updatedAt: Date;
        description: string | null;
        order: number;
        color: string;
    }[]>;
    createStage(data: any): Promise<{
        id: string;
        organizationId: string;
        agentId: string;
        createdAt: Date;
        name: string;
        updatedAt: Date;
        description: string | null;
        order: number;
        color: string;
    }>;
    updateStage(id: string, data: any): Promise<{
        id: string;
        organizationId: string;
        agentId: string;
        createdAt: Date;
        name: string;
        updatedAt: Date;
        description: string | null;
        order: number;
        color: string;
    }>;
    deleteStage(id: string): Promise<{
        success: boolean;
    }>;
    reorderStages(agentId: string, stageIds: string[]): Promise<{
        success: boolean;
    }>;
    findAllAutomations(crmConfigId: string): Promise<{
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
    }[]>;
    createAutomation(data: any): Promise<{
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
    updateAutomation(id: string, data: any): Promise<{
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
    deleteAutomation(id: string): Promise<{
        success: boolean;
    }>;
}
