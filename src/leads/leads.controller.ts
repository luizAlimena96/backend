import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards } from "@nestjs/common";
import { LeadsService } from "./leads.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@Controller("leads")
@UseGuards(JwtAuthGuard)
export class LeadsController {
  constructor(private leadsService: LeadsService) {}

  @Get()
  async findAll(@Query("organizationId") organizationId: string, @Query("agentId") agentId?: string) {
    return this.leadsService.findAll(organizationId, agentId);
  }

  @Get(":id")
  async findOne(@Param("id") id: string) {
    return this.leadsService.findOne(id);
  }

  @Post()
  async create(@Body() data: any) {
    return this.leadsService.create(data);
  }

  @Put(":id")
  async update(@Param("id") id: string, @Body() data: any) {
    return this.leadsService.update(id, data);
  }

  @Delete(":id")
  async delete(@Param("id") id: string) {
    return this.leadsService.delete(id);
  }
}
