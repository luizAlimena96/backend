import { PrismaService } from '../database/prisma.service';
export declare class CrmConfigsService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(organizationId: string): Promise<({
        automations: {
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
        }[];
    } & {
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
    })[]>;
    findOne(id: string, organizationId: string): Promise<{
        automations: {
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
        }[];
    } & {
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
    create(data: any): Promise<{
        automations: {
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
        }[];
    } & {
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
    update(id: string, data: any, organizationId: string): Promise<{
        automations: {
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
        }[];
    } & {
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
    delete(id: string, organizationId: string): Promise<{
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
}
