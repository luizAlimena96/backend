import { PrismaService } from "../database/prisma.service";
export declare class CRMService {
    private prisma;
    constructor(prisma: PrismaService);
    findAllConfigs(organizationId: string): Promise<{
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
    }[]>;
    createConfig(data: any): Promise<{
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
    updateConfig(id: string, data: any): Promise<{
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
    deleteConfig(id: string): Promise<{
        success: boolean;
    }>;
    findAllStages(agentId: string): Promise<{
        name: string;
        id: string;
        organizationId: string;
        agentId: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        order: number;
        color: string;
    }[]>;
    createStage(data: any): Promise<{
        name: string;
        id: string;
        organizationId: string;
        agentId: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        order: number;
        color: string;
    }>;
    updateStage(id: string, data: any): Promise<{
        name: string;
        id: string;
        organizationId: string;
        agentId: string;
        createdAt: Date;
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
    }[]>;
    createAutomation(data: any): Promise<{
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
    updateAutomation(id: string, data: any): Promise<{
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
    deleteAutomation(id: string): Promise<{
        success: boolean;
    }>;
}
