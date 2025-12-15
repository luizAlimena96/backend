import { PrismaService } from "../database/prisma.service";
export declare class KnowledgeService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(organizationId: string, agentId?: string): Promise<({
        agent: {
            name: string;
            id: string;
        };
    } & {
        id: string;
        type: import(".prisma/client").$Enums.KnowledgeType;
        organizationId: string;
        agentId: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        content: string;
        fileUrl: string | null;
        fileName: string | null;
        fileSize: number | null;
    })[]>;
    create(data: any): Promise<{
        id: string;
        type: import(".prisma/client").$Enums.KnowledgeType;
        organizationId: string;
        agentId: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        content: string;
        fileUrl: string | null;
        fileName: string | null;
        fileSize: number | null;
    }>;
    update(id: string, data: any): Promise<{
        id: string;
        type: import(".prisma/client").$Enums.KnowledgeType;
        organizationId: string;
        agentId: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        content: string;
        fileUrl: string | null;
        fileName: string | null;
        fileSize: number | null;
    }>;
    delete(id: string): Promise<{
        success: boolean;
    }>;
}
