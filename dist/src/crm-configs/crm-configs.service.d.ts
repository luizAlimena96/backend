import { PrismaService } from '../database/prisma.service';
export declare class CrmConfigsService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(organizationId: string): Promise<({
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
    findOne(id: string, organizationId: string): Promise<{
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
    create(data: any): Promise<{
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
    update(id: string, data: any, organizationId: string): Promise<{
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
    delete(id: string, organizationId: string): Promise<{
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
