import { Module } from '@nestjs/common';
import { KnowledgeService } from './knowledge.service';
import { KnowledgeController } from './knowledge.controller';
import { PrismaModule } from '../database/prisma.module';
import { AIModule } from '../ai/ai.module';
import { HttpModule } from '@nestjs/axios';
import { DocumentService } from './document.service';

@Module({
  imports: [PrismaModule, AIModule, HttpModule],
  controllers: [KnowledgeController],
  providers: [KnowledgeService, DocumentService],
  exports: [KnowledgeService],
})
export class KnowledgeModule { }
