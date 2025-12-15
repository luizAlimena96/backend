import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards } from "@nestjs/common";
import { FollowupsService } from "./followups.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@Controller("followups")
@UseGuards(JwtAuthGuard)
export class FollowupsController {
  constructor(private followupsService: FollowupsService) { }

  @Get()
  async findAll(@Query("agentId") agentId: string) {
    return this.followupsService.findAll(agentId);
  }

  @Get(":id")
  async findOne(@Param("id") id: string) {
    return this.followupsService.findOne(id);
  }

  @Post()
  async create(@Body() data: any) {
    return this.followupsService.create(data);
  }

  @Put(":id")
  async update(@Param("id") id: string, @Body() data: any) {
    return this.followupsService.update(id, data);
  }

  @Delete(":id")
  async delete(@Param("id") id: string) {
    return this.followupsService.delete(id);
  }

  @Post("check")
  async checkFollowUps() {
    return this.followupsService.checkAgentFollowUps();
  }
}
