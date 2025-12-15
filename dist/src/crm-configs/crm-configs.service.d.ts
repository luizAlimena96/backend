import { PrismaService } from '../database/prisma.service';
export declare class CrmConfigsService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(organizationId: string): Promise<({
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
    findOne(id: string, organizationId: string): Promise<{
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
    create(data: any): Promise<{
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
    update(id: string, data: any, organizationId: string): Promise<{
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
    delete(id: string, organizationId: string): Promise<{
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
