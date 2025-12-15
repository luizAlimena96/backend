"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.KnowledgeSearchService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
const openai_service_1 = require("../services/openai.service");
let KnowledgeSearchService = class KnowledgeSearchService {
    prisma;
    openaiService;
    constructor(prisma, openaiService) {
        this.prisma = prisma;
        this.openaiService = openaiService;
    }
    async searchKnowledge(query, agentId, organizationId, apiKey, options = {}) {
        const { topK = 50, minSimilarity = 0.5 } = options;
        try {
            console.log('[Knowledge Search] Starting search...', {
                queryLength: query.length,
                agentId,
                organizationId,
                options: { topK, minSimilarity },
            });
            const queryEmbedding = await this.openaiService.createEmbedding(apiKey, query);
            if (!queryEmbedding || queryEmbedding.length === 0) {
                console.error('[Knowledge Search] Failed to generate query embedding');
                return [];
            }
            console.log('[Knowledge Search] Embedding generated, dimensions:', queryEmbedding.length);
            const embeddingString = `[${queryEmbedding.join(',')}]`;
            const chunkCountResult = await this.prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM knowledge_chunks WHERE "organizationId" = $1 AND "agentId" = $2`, organizationId, agentId);
            const chunkCount = Number(chunkCountResult[0]?.count || 0);
            console.log('[Knowledge Search] Total chunks in DB:', chunkCount);
            if (chunkCount === 0) {
                console.log('[Knowledge Search] No knowledge chunks found');
                return [];
            }
            const chunksWithEmbedding = await this.prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM knowledge_chunks WHERE "organizationId" = $1 AND "agentId" = $2 AND embedding IS NOT NULL`, organizationId, agentId);
            console.log('[Knowledge Search] Chunks with embeddings:', Number(chunksWithEmbedding[0]?.count || 0));
            const results = await this.prisma.$queryRawUnsafe(`SELECT 
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
                LIMIT $4`, embeddingString, organizationId, agentId, topK);
            console.log('[Knowledge Search] Raw query results:', results.length, 'chunks found');
            const searchResults = [];
            for (const row of results) {
                const distance = parseFloat(String(row.distance));
                const similarity = 1 - distance;
                if (similarity >= minSimilarity) {
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
        }
        catch (error) {
            console.error('[Knowledge Search] Error:', error);
            return [];
        }
    }
    formatKnowledgeContext(results) {
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
    async getKnowledgeStats(agentId, organizationId) {
        try {
            const totalResult = await this.prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM knowledge_chunks WHERE "organizationId" = $1 AND "agentId" = $2`, organizationId, agentId);
            const totalChunks = Number(totalResult[0]?.count || 0);
            const embeddingResult = await this.prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM knowledge_chunks WHERE "organizationId" = $1 AND "agentId" = $2 AND embedding IS NOT NULL`, organizationId, agentId);
            const chunksWithEmbeddings = Number(embeddingResult[0]?.count || 0);
            return {
                totalChunks,
                chunksWithEmbeddings,
                embeddingModel: 'text-embedding-3-small',
            };
        }
        catch (error) {
            console.error('[Knowledge Search] Error getting stats:', error);
            return {
                totalChunks: 0,
                chunksWithEmbeddings: 0,
                embeddingModel: 'text-embedding-3-small',
            };
        }
    }
};
exports.KnowledgeSearchService = KnowledgeSearchService;
exports.KnowledgeSearchService = KnowledgeSearchService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        openai_service_1.OpenAIService])
], KnowledgeSearchService);
//# sourceMappingURL=knowledge-search.service.js.map