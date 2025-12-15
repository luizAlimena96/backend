import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards } from "@nestjs/common";
import { TagsService } from "./tags.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@Controller("tags")
@UseGuards(JwtAuthGuard)
export class TagsController {
  constructor(private tagsService: TagsService) {}

  @Get()
  async findAll(@Query("organizationId") organizationId: string) {
    return this.tagsService.findAll(organizationId);
  }

  @Post()
  async create(@Body() data: any) {
    return this.tagsService.create(data);
  }

  @Put(":id")
  async update(@Param("id") id: string, @Body() data: any) {
    return this.tagsService.update(id, data);
  }

  @Delete(":id")
  async delete(@Param("id") id: string) {
    return this.tagsService.delete(id);
  }
}
