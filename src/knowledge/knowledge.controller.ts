import { Controller, Get, Post, Put, Delete, Query, Body, UseGuards } from "@nestjs/common";
import { KnowledgeService } from "./knowledge.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@Controller("knowledge")
@UseGuards(JwtAuthGuard)
export class KnowledgeController {
  constructor(private knowledgeService: KnowledgeService) {}

  @Get()
  async findAll(@Query("organizationId") organizationId: string, @Query("agentId") agentId?: string) {
    return this.knowledgeService.findAll(organizationId, agentId);
  }

  @Post()
  async create(@Body() data: any) {
    return this.knowledgeService.create(data);
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
