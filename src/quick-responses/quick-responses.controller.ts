import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards } from "@nestjs/common";
import { QuickResponsesService } from "./quick-responses.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@Controller("quick-responses")
@UseGuards(JwtAuthGuard)
export class QuickResponsesController {
  constructor(private quickResponsesService: QuickResponsesService) {}

  @Get()
  async findAll(@Query("organizationId") organizationId: string) {
    return this.quickResponsesService.findAll(organizationId);
  }

  @Post()
  async create(@Body() data: any) {
    return this.quickResponsesService.create(data);
  }

  @Put(":id")
  async update(@Param("id") id: string, @Body() data: any) {
    return this.quickResponsesService.update(id, data);
  }

  @Delete(":id")
  async delete(@Param("id") id: string) {
    return this.quickResponsesService.delete(id);
  }
}
