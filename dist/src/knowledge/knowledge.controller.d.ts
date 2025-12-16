import { KnowledgeService } from "./knowledge.service";
import { DocumentService } from "./document.service";
export declare class KnowledgeController {
    private knowledgeService;
    private documentService;
    constructor(knowledgeService: KnowledgeService, documentService: DocumentService);
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
    upload(file: Express.Multer.File, title: string, agentId: string, organizationId: string): Promise<{
        success: boolean;
        knowledge: {
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
        };
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
}
