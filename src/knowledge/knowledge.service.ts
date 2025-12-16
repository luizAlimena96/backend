import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { OpenAIService } from "../ai/services/openai.service";
import { ConfigService } from "@nestjs/config";
import { DocumentService } from "./document.service";
import { encoding_for_model } from 'tiktoken';
import { Logger } from '@nestjs/common';

const CHUNK_SIZE = 500; // Tokens
const CHUNK_OVERLAP = 100;
const MIN_CHUNK_SIZE = 50;

@Injectable()
export class KnowledgeService implements OnModuleDestroy {
  private readonly logger = new Logger(KnowledgeService.name);
  private encoder: any; // Cached tiktoken encoder

  constructor(
    private prisma: PrismaService,
    private openaiService: OpenAIService,
    private configService: ConfigService,
    private documentService: DocumentService
  ) {
    // Initialize encoder once (performance optimization)
    this.encoder = encoding_for_model('text-embedding-3-small');
  }

  // Cleanup encoder on module destroy
  onModuleDestroy() {
    if (this.encoder) {
      this.encoder.free();
    }
  }

  async findAll(organizationId: string, agentId?: string) {
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

  async create(data: any) {
    this.logger.log(`Creating knowledge with logic V3: ${JSON.stringify(data)} `);

    // 1. Fix Agent ID
    let agentId = typeof data.agentId === 'object' ? data.agentId?.id : data.agentId;
    let title = data.title;

    // Fallback: If agentId is missing/invalid object AND title is a UUID, assume swap
    const titleIsUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.title);

    if ((!agentId || typeof agentId === 'object') && titleIsUuid) {
      agentId = data.title;
      title = data.file || 'Novo Conhecimento';
    }

    // 2. Fix Organization ID
    const organizationId = typeof data.organizationId === 'object' ? data.organizationId?.id || data.organizationId : data.organizationId;

    // 3. Fix Content
    let content = data.content;
    if (!content && data.file && typeof data.file === 'string' && !data.fileUrl) {
      // If "file" is just a string (not url) and content is empty, use it as content
      content = data.file;
    }
    if (!content) content = '';

    // Validation
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

  async update(id: string, data: any) {
    const knowledge = await this.prisma.knowledge.update({
      where: { id },
      data,
    });

    // Re-process if content or file changed
    if (data.content || data.fileUrl) {
      this.processKnowledge(knowledge.id).catch(err => {
        this.logger.log(`Background RAG processing failed on update: ${err} `);
      });
    }

    return knowledge;
  }

  async delete(id: string) {
    await this.prisma.knowledge.delete({ where: { id } });
    return { success: true };
  }

  // --- RAG Processing & Chunking Helpers ---

  /**
   * Wait for RAG processing to complete (for upload endpoint)
   * This ensures the loading screen stays visible until processing finishes
   */
  async waitForProcessing(knowledgeId: string): Promise<void> {
    await this.processKnowledge(knowledgeId);
  }

  /**
   * Main processing pipeline: Fetch -> Parse (if needed) -> Chunk -> Embed -> Save
   */
  private async processKnowledge(knowledgeId: string) {
    this.logger.log(`Processing knowledge ${knowledgeId} for RAG...`);

    try {
      // Fetch fresh knowledge data
      const knowledge = await this.prisma.knowledge.findUnique({
        where: { id: knowledgeId }
      });

      if (!knowledge) {
        this.logger.log(`Knowledge ${knowledgeId} not found.`);
        return;
      }

      let content = knowledge.content || '';

      // 1. File Parsing (PDF/Docx) if content is empty but fileUrl exists
      if ((!content || content.trim().length === 0) && knowledge.fileUrl) {
        this.logger.log(`Downloading and parsing file: ${knowledge.fileUrl} `);
        try {
          const { buffer, mimeType } = await this.documentService.downloadFile(knowledge.fileUrl);
          const result = await this.documentService.extractText(buffer, mimeType, knowledge.fileName || '');

          if (result.text && result.text.length > 0) {
            content = result.text;
            this.logger.log(`Extracted ${content.length} characters from file.`);

            // SAVE extracted content back to DB so we don't parse again
            await this.prisma.knowledge.update({
              where: { id: knowledgeId },
              data: { content: content }
            });
          } else {
            this.logger.log('Parsed text was empty.');
          }
        } catch (parseError) {
          this.logger.log(`Error parsing file: ${parseError} `);
          // Proceed if possible, or return? Return since we have no content.
          return;
        }
      }

      if (!content || content.trim().length === 0) {
        this.logger.log('Content is still empty after parsing attempts. Skipping.');
        return;
      }

      // 2. Clear existing chunks
      await this.prisma.knowledgeChunk.deleteMany({
        where: { knowledgeId }
      });

      // 3. Intelligent Chunking
      this.logger.log('Starting intelligent chunking...');
      const result = this.chunkText(content);
      this.logger.log(`Generated ${result.chunks.length} smart chunks.`);

      // 4. Get organization's OpenAI API key
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

      // 5. Generate embeddings and save
      for (const chunk of result.chunks) {
        try {
          const embedding = await this.openaiService.createEmbedding(
            apiKey,
            chunk.content
          );

          if (!embedding || embedding.length === 0) {
            this.logger.log(`Failed to generate embedding for chunk ${chunk.index}`);
            continue;
          }

          const embeddingString = `[${embedding.join(',')}]`;

          this.logger.log(`Saving chunk ${chunk.index} with ${chunk.content.length} characters`);

          await this.prisma.$executeRawUnsafe(
            `INSERT INTO "knowledge_chunks"("id", "knowledgeId", "content", "embedding", "chunkIndex", "organizationId", "agentId", "createdAt")
VALUES(gen_random_uuid(), $1, $2, $3:: vector, $4, $5, $6, NOW())`,
            knowledgeId,
            chunk.content,
            embeddingString,
            chunk.index,
            knowledge.organizationId,
            knowledge.agentId
          );
        } catch (chunkError) {
          this.logger.log(`Error processing individual chunk ${chunk.index}: ${chunkError} `);
        }
      }

      this.logger.log(`Successfully processed ${result.chunks.length} chunks with embeddings.`);

    } catch (error) {
      this.logger.log(`Error processing knowledge chunks: ${error} `);
    }
  }

  // --- Chunking Logic Ported from Frontend ---

  private countTokens(text: string): number {
    try {
      const tokens = this.encoder.encode(text);
      return tokens.length;
    } catch (error) {
      // Fallback: estimate 4 chars per token
      return Math.ceil(text.length / 4);
    }
  }

  private splitIntoSentences(text: string): string[] {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    return sentences.map(s => s.trim()).filter(s => s.length > 0);
  }

  private splitIntoParagraphs(text: string): string[] {
    return text.split(/\n\s*\n/).map(p => p.trim()).filter(p => p.length > 0);
  }

  private getOverlapText(text: string, targetTokens: number): string {
    const sentences = this.splitIntoSentences(text);
    let overlap = '';
    let tokens = 0;
    for (let i = sentences.length - 1; i >= 0; i--) {
      const sentence = sentences[i];
      const sentenceTokens = this.countTokens(sentence);
      if (tokens + sentenceTokens > targetTokens) break;
      overlap = sentence + ' ' + overlap;
      tokens += sentenceTokens;
    }
    return overlap.trim();
  }

  private chunkText(text: string) {
    if (!text || text.trim().length === 0) {
      this.logger.log('Input text for chunking is empty.');
      return { chunks: [] };
    }

    const cleanText = text.trim();
    const paragraphs = this.splitIntoParagraphs(cleanText);
    const chunks: any[] = []; // Using any to simplify minimal interface
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
          } else {
            sentenceBuffer += (sentenceBuffer ? ' ' : '') + sentence;
            sentenceTokens += sTokens;
          }
        }
        if (sentenceBuffer.length > 0) {
          chunks.push({ content: sentenceBuffer.trim(), index: chunks.length });
        }
      } else {
        if (currentTokens + paragraphTokens > CHUNK_SIZE && currentChunk.length > 0) {
          chunks.push({ content: currentChunk.trim(), index: chunks.length });
          const overlapText = this.getOverlapText(currentChunk, CHUNK_OVERLAP);
          currentChunk = overlapText + '\n\n' + paragraph;
          currentTokens = this.countTokens(currentChunk);
        } else {
          currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
          currentTokens += paragraphTokens;
        }
      }
    }

    // CRITICAL FIX: Allow small chunks if it's the only content available or remains valid
    if (currentChunk.length > 0 && (currentTokens >= MIN_CHUNK_SIZE || chunks.length === 0)) {
      chunks.push({ content: currentChunk.trim(), index: chunks.length });
    } else if (currentChunk.length > 0) {
      this.logger.log(`Discarding final chunk '${currentChunk.substring(0, 20)}...' because it's too small (${currentTokens} tokens) and we already have ${chunks.length} chunks.`);
    }

    return { chunks };
  }
}
