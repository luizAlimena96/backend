import { Injectable } from '@nestjs/common';
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

@Injectable()
export class KnowledgeSearchService {
    constructor(
        private prisma: PrismaService,
        private openaiService: OpenAIService,
    ) { }

    /**
     * Search for relevant knowledge chunks using vector similarity
     */
    async searchKnowledge(
        query: string,
        agentId: string,
        organizationId: string,
        apiKey: string,
        options: SearchOptions = {}
    ): Promise<SearchResult[]> {
        const { topK = 50, minSimilarity = 0.5 } = options;

        try {
            console.log('[Knowledge Search] Starting search...', {
                queryLength: query.length,
                agentId,
                organizationId,
                options: { topK, minSimilarity },
            });

            // Generate embedding for the query
            const queryEmbedding = await this.openaiService.createEmbedding(apiKey, query);

            if (!queryEmbedding || queryEmbedding.length === 0) {
                console.error('[Knowledge Search] Failed to generate query embedding');
                return [];
            }

            console.log('[Knowledge Search] Embedding generated, dimensions:', queryEmbedding.length);

            // Format embedding for pgvector
            const embeddingString = `[${queryEmbedding.join(',')}]`;

            // Check if there are any chunks
            const chunkCountResult = await this.prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
                `SELECT COUNT(*) as count FROM knowledge_chunks WHERE "organizationId" = $1 AND "agentId" = $2`,
                organizationId,
                agentId
            );
            const chunkCount = Number(chunkCountResult[0]?.count || 0);

            console.log('[Knowledge Search] Total chunks in DB:', chunkCount);

            if (chunkCount === 0) {
                console.log('[Knowledge Search] No knowledge chunks found');
                return [];
            }

            // Check chunks with embeddings
            const chunksWithEmbedding = await this.prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
                `SELECT COUNT(*) as count FROM knowledge_chunks WHERE "organizationId" = $1 AND "agentId" = $2 AND embedding IS NOT NULL`,
                organizationId,
                agentId
            );
            console.log('[Knowledge Search] Chunks with embeddings:', Number(chunksWithEmbedding[0]?.count || 0));

            // Vector similarity search with pgvector
            // <=> operator is cosine distance (1 - similarity)
            const results = await this.prisma.$queryRawUnsafe<
                Array<{
                    id: string;
                    content: string;
                    knowledge_id: string;
                    chunk_index: number;
                    distance: number;
                }>
            >(
                `SELECT 
                    kc.id,
                    kc.content,
                    kc."knowledgeId" as knowledge_id,
                    kc."chunkIndex" as chunk_index,
                    (kc.embedding <=> $1::vector) as distance
                FROM knowledge_chunks kc
                WHERE kc."organizationId" = $2
                    AND kc."agentId" = $3
                    AND kc.embedding IS NOT NULL
                ORDER BY distance ASC
                LIMIT $4`,
                embeddingString,
                organizationId,
                agentId,
                topK
            );

            console.log('[Knowledge Search] Raw query results:', results.length, 'chunks found');

            // Filter by minimum similarity and transform results
            const searchResults: SearchResult[] = [];

            for (const row of results) {
                const distance = parseFloat(String(row.distance));
                const similarity = 1 - distance; // Convert distance to similarity

                if (similarity >= minSimilarity) {
                    // Get knowledge title
                    const knowledge = await this.prisma.knowledge.findUnique({
                        where: { id: row.knowledge_id },
                        select: { title: true },
                    });

                    searchResults.push({
                        id: row.id,
                        content: row.content,
                        similarity,
                        knowledgeId: row.knowledge_id,
                        knowledgeTitle: knowledge?.title,
                        chunkIndex: row.chunk_index,
                    });
                }
            }

            console.log(`[Knowledge Search] ${searchResults.length} chunks passed similarity threshold`);

            return searchResults;
        } catch (error: any) {
            console.error('[Knowledge Search] Error:', error);
            return [];
        }
    }

    /**
     * Format search results as context for AI prompts
     */
    formatKnowledgeContext(results: SearchResult[]): string {
        if (results.length === 0) {
            return '';
        }

        const contextParts = results.map((result, index) => {
            const source = result.knowledgeTitle
                ? `[Fonte: ${result.knowledgeTitle}]`
                : `[Chunk ${result.chunkIndex + 1}]`;

            return `--- Conhecimento ${index + 1} ${source} ---\n${result.content}`;
        });

        return `\n\n# BASE DE CONHECIMENTO RELEVANTE\n\n${contextParts.join('\n\n')}`;
    }

    /**
     * Get statistics about the knowledge base for an agent
     */
    async getKnowledgeStats(agentId: string, organizationId: string): Promise<KnowledgeStats> {
        try {
            // Count total chunks
            const totalResult = await this.prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
                `SELECT COUNT(*) as count FROM knowledge_chunks WHERE "organizationId" = $1 AND "agentId" = $2`,
                organizationId,
                agentId
            );
            const totalChunks = Number(totalResult[0]?.count || 0);

            // Count chunks with embeddings
            const embeddingResult = await this.prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
                `SELECT COUNT(*) as count FROM knowledge_chunks WHERE "organizationId" = $1 AND "agentId" = $2 AND embedding IS NOT NULL`,
                organizationId,
                agentId
            );
            const chunksWithEmbeddings = Number(embeddingResult[0]?.count || 0);

            return {
                totalChunks,
                chunksWithEmbeddings,
                embeddingModel: 'text-embedding-3-small',
            };
        } catch (error) {
            console.error('[Knowledge Search] Error getting stats:', error);
            return {
                totalChunks: 0,
                chunksWithEmbeddings: 0,
                embeddingModel: 'text-embedding-3-small',
            };
        }
    }
}
