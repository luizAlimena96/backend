import { Controller, Get, Post, Put, Delete, Query, Body, UseGuards, UseInterceptors, UploadedFile, BadRequestException } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { KnowledgeService } from "./knowledge.service";
import { DocumentService } from "./document.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@Controller("knowledge")
@UseGuards(JwtAuthGuard)
export class KnowledgeController {
  constructor(
    private knowledgeService: KnowledgeService,
    private documentService: DocumentService
  ) { }

  @Get()
  async findAll(@Query("organizationId") organizationId: string, @Query("agentId") agentId?: string) {
    return this.knowledgeService.findAll(organizationId, agentId);
  }

  @Post()
  async create(@Body() data: any) {
    return this.knowledgeService.create(data);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @UploadedFile() file: any,
    @Body('title') title: string,
    @Body('agentId') agentId: string,
    @Body('organizationId') organizationId: string,
  ) {
    console.log('[Upload] Received request');
    console.log('[Upload] File:', file ? { name: file.originalname, size: file.size, mimetype: file.mimetype } : 'NO FILE');
    console.log('[Upload] Title:', title);
    console.log('[Upload] AgentId:', agentId);
    console.log('[Upload] OrganizationId:', organizationId);

    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    if (!title || !agentId || !organizationId) {
      throw new BadRequestException('Missing required fields: title, agentId, organizationId');
    }

    console.log('[Upload] Extracting text from file...');

    // Extract text from PDF buffer
    const { text, metadata } = await this.documentService.extractText(
      file.buffer,
      file.mimetype,
      file.originalname
    );

    if (!text || text.trim().length === 0) {
      throw new BadRequestException('Could not extract text from file');
    }

    console.log('[Upload] Creating knowledge with extracted text...');

    const startTime = Date.now();

    // Create knowledge with extracted text (no fileUrl, just content)
    const knowledge = await this.knowledgeService.create({
      title,
      agentId,
      organizationId,
      content: text,
      type: 'DOCUMENT',
      fileName: file.originalname,
      fileSize: file.size,
    });

    console.log('[Upload] Knowledge created:', knowledge.id);
    console.log('[Upload] Waiting for RAG processing to complete...');
    console.log('[Upload] This may take 1-2 minutes for large PDFs...');

    try {
      // Wait for RAG processing (chunking + embeddings) to complete
      // This ensures the loading screen stays visible until everything is done
      await this.knowledgeService.waitForProcessing(knowledge.id);

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`[Upload] RAG processing completed successfully in ${duration}s`);

      return { success: true, knowledge };
    } catch (error) {
      console.error('[Upload] RAG processing failed:', error);
      throw new BadRequestException('Failed to process document: ' + error.message);
    }
  }

  @Put()
  async update(@Query("id") id: string, @Body() data: any) {
    return this.knowledgeService.update(id, data);
  }

  @Delete()
  async delete(@Query("id") id: string) {
    return this.knowledgeService.delete(id);
  }
}
