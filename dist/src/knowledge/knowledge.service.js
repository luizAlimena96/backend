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
var KnowledgeService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.KnowledgeService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../database/prisma.service");
const openai_service_1 = require("../ai/services/openai.service");
const config_1 = require("@nestjs/config");
const document_service_1 = require("./document.service");
const tiktoken_1 = require("tiktoken");
const common_2 = require("@nestjs/common");
const CHUNK_SIZE = 500;
const CHUNK_OVERLAP = 100;
const MIN_CHUNK_SIZE = 50;
let KnowledgeService = KnowledgeService_1 = class KnowledgeService {
    prisma;
    openaiService;
    configService;
    documentService;
    logger = new common_2.Logger(KnowledgeService_1.name);
    encoder;
    constructor(prisma, openaiService, configService, documentService) {
        this.prisma = prisma;
        this.openaiService = openaiService;
        this.configService = configService;
        this.documentService = documentService;
        this.encoder = (0, tiktoken_1.encoding_for_model)('text-embedding-3-small');
    }
    onModuleDestroy() {
        if (this.encoder) {
            this.encoder.free();
        }
    }
    async findAll(organizationId, agentId) {
        return this.prisma.knowledge.findMany({
            where: {
                organizationId,
                ...(agentId && { agentId }),
            },
            include: {
                agent: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: "desc" },
        });
    }
    async create(data) {
        this.logger.log(`Creating knowledge with logic V3: ${JSON.stringify(data)} `);
        let agentId = typeof data.agentId === 'object' ? data.agentId?.id : data.agentId;
        let title = data.title;
        const titleIsUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.title);
        if ((!agentId || typeof agentId === 'object') && titleIsUuid) {
            agentId = data.title;
            title = data.file || 'Novo Conhecimento';
        }
        const organizationId = typeof data.organizationId === 'object' ? data.organizationId?.id || data.organizationId : data.organizationId;
        let content = data.content;
        if (!content && data.file && typeof data.file === 'string' && !data.fileUrl) {
            content = data.file;
        }
        if (!content)
            content = '';
        if (!content && !data.fileUrl) {
            throw new Error("Content or File URL is required.");
        }
        const finalData = {
            agentId: String(agentId),
            organizationId: String(organizationId),
            title: title,
            content: content,
            type: data.type || "TEXT",
            fileUrl: data.fileUrl,
            fileName: data.fileName,
            fileSize: data.fileSize ? Number(data.fileSize) : undefined
        };
        const knowledge = await this.prisma.knowledge.create({
            data: finalData
        });
        return knowledge;
    }
    async update(id, data) {
        const knowledge = await this.prisma.knowledge.update({
            where: { id },
            data,
        });
        if (data.content || data.fileUrl) {
            this.processKnowledge(knowledge.id).catch(err => {
                this.logger.log(`Background RAG processing failed on update: ${err} `);
            });
        }
        return knowledge;
    }
    async delete(id) {
        await this.prisma.knowledge.delete({ where: { id } });
        return { success: true };
    }
    async waitForProcessing(knowledgeId) {
        await this.processKnowledge(knowledgeId);
    }
    async processKnowledge(knowledgeId) {
        this.logger.log(`Processing knowledge ${knowledgeId} for RAG...`);
        try {
            const knowledge = await this.prisma.knowledge.findUnique({
                where: { id: knowledgeId }
            });
            if (!knowledge) {
                this.logger.log(`Knowledge ${knowledgeId} not found.`);
                return;
            }
            let content = knowledge.content || '';
            if ((!content || content.trim().length === 0) && knowledge.fileUrl) {
                this.logger.log(`Downloading and parsing file: ${knowledge.fileUrl} `);
                try {
                    const { buffer, mimeType } = await this.documentService.downloadFile(knowledge.fileUrl);
                    const result = await this.documentService.extractText(buffer, mimeType, knowledge.fileName || '');
                    if (result.text && result.text.length > 0) {
                        content = result.text;
                        this.logger.log(`Extracted ${content.length} characters from file.`);
                        await this.prisma.knowledge.update({
                            where: { id: knowledgeId },
                            data: { content: content }
                        });
                    }
                    else {
                        this.logger.log('Parsed text was empty.');
                    }
                }
                catch (parseError) {
                    this.logger.log(`Error parsing file: ${parseError} `);
                    return;
                }
            }
            if (!content || content.trim().length === 0) {
                this.logger.log('Content is still empty after parsing attempts. Skipping.');
                return;
            }
            await this.prisma.knowledgeChunk.deleteMany({
                where: { knowledgeId }
            });
            this.logger.log('Starting intelligent chunking...');
            const result = this.chunkText(content);
            this.logger.log(`Generated ${result.chunks.length} smart chunks.`);
            const organization = await this.prisma.organization.findUnique({
                where: { id: knowledge.organizationId },
                select: { openaiApiKey: true }
            });
            const apiKey = organization?.openaiApiKey || this.configService.get('OPENAI_API_KEY');
            if (!apiKey) {
                this.logger.log('Skipping embedding generation: No OpenAI API key found for organization or in environment.');
                return;
            }
            this.logger.log(`Using ${organization?.openaiApiKey ? 'organization' : 'global'} OpenAI API key`);
            for (const chunk of result.chunks) {
                try {
                    const embedding = await this.openaiService.createEmbedding(apiKey, chunk.content);
                    if (!embedding || embedding.length === 0) {
                        this.logger.log(`Failed to generate embedding for chunk ${chunk.index}`);
                        continue;
                    }
                    const embeddingString = `[${embedding.join(',')}]`;
                    this.logger.log(`Saving chunk ${chunk.index} with ${chunk.content.length} characters`);
                    await this.prisma.$executeRawUnsafe(`INSERT INTO "knowledge_chunks"("id", "knowledgeId", "content", "embedding", "chunkIndex", "organizationId", "agentId", "createdAt")
VALUES(gen_random_uuid(), $1, $2, $3:: vector, $4, $5, $6, NOW())`, knowledgeId, chunk.content, embeddingString, chunk.index, knowledge.organizationId, knowledge.agentId);
                }
                catch (chunkError) {
                    this.logger.log(`Error processing individual chunk ${chunk.index}: ${chunkError} `);
                }
            }
            this.logger.log(`Successfully processed ${result.chunks.length} chunks with embeddings.`);
        }
        catch (error) {
            this.logger.log(`Error processing knowledge chunks: ${error} `);
        }
    }
    countTokens(text) {
        try {
            const tokens = this.encoder.encode(text);
            return tokens.length;
        }
        catch (error) {
            return Math.ceil(text.length / 4);
        }
    }
    splitIntoSentences(text) {
        const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
        return sentences.map(s => s.trim()).filter(s => s.length > 0);
    }
    splitIntoParagraphs(text) {
        return text.split(/\n\s*\n/).map(p => p.trim()).filter(p => p.length > 0);
    }
    getOverlapText(text, targetTokens) {
        const sentences = this.splitIntoSentences(text);
        let overlap = '';
        let tokens = 0;
        for (let i = sentences.length - 1; i >= 0; i--) {
            const sentence = sentences[i];
            const sentenceTokens = this.countTokens(sentence);
            if (tokens + sentenceTokens > targetTokens)
                break;
            overlap = sentence + ' ' + overlap;
            tokens += sentenceTokens;
        }
        return overlap.trim();
    }
    chunkText(text) {
        if (!text || text.trim().length === 0) {
            this.logger.log('Input text for chunking is empty.');
            return { chunks: [] };
        }
        const cleanText = text.trim();
        const paragraphs = this.splitIntoParagraphs(cleanText);
        const chunks = [];
        let currentChunk = '';
        let currentTokens = 0;
        this.logger.log(`Chunking text of length ${cleanText.length} into paragraphs...`);
        for (const paragraph of paragraphs) {
            const paragraphTokens = this.countTokens(paragraph);
            if (paragraphTokens > CHUNK_SIZE) {
                if (currentChunk.length > 0) {
                    chunks.push({ content: currentChunk.trim(), index: chunks.length });
                    currentChunk = '';
                    currentTokens = 0;
                }
                const sentences = this.splitIntoSentences(paragraph);
                let sentenceBuffer = '';
                let sentenceTokens = 0;
                for (const sentence of sentences) {
                    const sTokens = this.countTokens(sentence);
                    if (sentenceTokens + sTokens > CHUNK_SIZE && sentenceBuffer.length > 0) {
                        chunks.push({ content: sentenceBuffer.trim(), index: chunks.length });
                        const overlapText = this.getOverlapText(sentenceBuffer, CHUNK_OVERLAP);
                        sentenceBuffer = overlapText + ' ' + sentence;
                        sentenceTokens = this.countTokens(sentenceBuffer);
                    }
                    else {
                        sentenceBuffer += (sentenceBuffer ? ' ' : '') + sentence;
                        sentenceTokens += sTokens;
                    }
                }
                if (sentenceBuffer.length > 0) {
                    chunks.push({ content: sentenceBuffer.trim(), index: chunks.length });
                }
            }
            else {
                if (currentTokens + paragraphTokens > CHUNK_SIZE && currentChunk.length > 0) {
                    chunks.push({ content: currentChunk.trim(), index: chunks.length });
                    const overlapText = this.getOverlapText(currentChunk, CHUNK_OVERLAP);
                    currentChunk = overlapText + '\n\n' + paragraph;
                    currentTokens = this.countTokens(currentChunk);
                }
                else {
                    currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
                    currentTokens += paragraphTokens;
                }
            }
        }
        if (currentChunk.length > 0 && (currentTokens >= MIN_CHUNK_SIZE || chunks.length === 0)) {
            chunks.push({ content: currentChunk.trim(), index: chunks.length });
        }
        else if (currentChunk.length > 0) {
            this.logger.log(`Discarding final chunk '${currentChunk.substring(0, 20)}...' because it's too small (${currentTokens} tokens) and we already have ${chunks.length} chunks.`);
        }
        return { chunks };
    }
};
exports.KnowledgeService = KnowledgeService;
exports.KnowledgeService = KnowledgeService = KnowledgeService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        openai_service_1.OpenAIService,
        config_1.ConfigService,
        document_service_1.DocumentService])
], KnowledgeService);
//# sourceMappingURL=knowledge.service.js.map