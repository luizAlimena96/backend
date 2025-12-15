import { PrismaService } from '../../database/prisma.service';
import { OpenAIService } from '../services/openai.service';
export interface SearchResult {
    id: string;
    content: string;
    similarity: number;
    knowledgeId: string;
    knowledgeTitle?: string;
    chunkIndex: number;
}
export interface SearchOptions {
    topK?: number;
    minSimilarity?: number;
}
export interface KnowledgeStats {
    totalChunks: number;
    chunksWithEmbeddings: number;
    embeddingModel: string;
}
export declare class KnowledgeSearchService {
    private prisma;
    private openaiService;
    constructor(prisma: PrismaService, openaiService: OpenAIService);
    searchKnowledge(query: string, agentId: string, organizationId: string, apiKey: string, options?: SearchOptions): Promise<SearchResult[]>;
    formatKnowledgeContext(results: SearchResult[]): string;
    getKnowledgeStats(agentId: string, organizationId: string): Promise<KnowledgeStats>;
}
