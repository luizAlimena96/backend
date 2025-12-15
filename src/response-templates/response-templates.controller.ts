import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards } from "@nestjs/common";
import { ResponseTemplatesService } from "./response-templates.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@Controller("response-templates")
@UseGuards(JwtAuthGuard)
export class ResponseTemplatesController {
  constructor(private responseTemplatesService: ResponseTemplatesService) {}

  @Get()
  async findAll(@Query("organizationId") organizationId: string, @Query("category") category?: string) {
    return this.responseTemplatesService.findAll(organizationId, category);
  }

  @Post()
  async create(@Body() data: any) {
    return this.responseTemplatesService.create(data);
  }

  @Put(":id")
  async update(@Param("id") id: string, @Body() data: any) {
    return this.responseTemplatesService.update(id, data);
  }

  @Delete(":id")
  async delete(@Param("id") id: string) {
    return this.responseTemplatesService.delete(id);
  }
}
