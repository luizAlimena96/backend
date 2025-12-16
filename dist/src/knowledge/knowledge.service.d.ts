import { OnModuleDestroy } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { OpenAIService } from "../ai/services/openai.service";
import { ConfigService } from "@nestjs/config";
import { DocumentService } from "./document.service";
export declare class KnowledgeService implements OnModuleDestroy {
    private prisma;
    private openaiService;
    private configService;
    private documentService;
    private readonly logger;
    private encoder;
    constructor(prisma: PrismaService, openaiService: OpenAIService, configService: ConfigService, documentService: DocumentService);
    onModuleDestroy(): void;
    findAll(organizationId: string, agentId?: string): Promise<({
        agent: {
            id: string;
            name: string;
        };
    } & {
        id: string;
        organizationId: string;
        agentId: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        type: import(".prisma/client").$Enums.KnowledgeType;
        content: string;
        fileUrl: string | null;
        fileName: string | null;
        fileSize: number | null;
    })[]>;
    create(data: any): Promise<{
        id: string;
        organizationId: string;
        agentId: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        type: import(".prisma/client").$Enums.KnowledgeType;
        content: string;
        fileUrl: string | null;
        fileName: string | null;
        fileSize: number | null;
    }>;
    update(id: string, data: any): Promise<{
        id: string;
        organizationId: string;
        agentId: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        type: import(".prisma/client").$Enums.KnowledgeType;
        content: string;
        fileUrl: string | null;
        fileName: string | null;
        fileSize: number | null;
    }>;
    delete(id: string): Promise<{
        success: boolean;
    }>;
    waitForProcessing(knowledgeId: string): Promise<void>;
    private processKnowledge;
    private countTokens;
    private splitIntoSentences;
    private splitIntoParagraphs;
    private getOverlapText;
    private chunkText;
}
