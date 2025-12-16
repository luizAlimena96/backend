import { Controller, Get, Post, Put, Patch, Delete, Param, Body, Query, UseGuards } from "@nestjs/common";
import { StatesService } from "./states.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@Controller("states")
@UseGuards(JwtAuthGuard)
export class StatesController {
  constructor(private statesService: StatesService) { }

  @Get()
  async findAll(@Query("agentId") agentId: string) {
    return this.statesService.findAll(agentId);
  }

  @Post()
  async create(@Body() data: any) {
    return this.statesService.create(data);
  }

  @Put(":id")
  async update(@Param("id") id: string, @Body() data: any) {
    return this.statesService.update(id, data);
  }

  @Patch(":id")
  async updatePartial(@Param("id") id: string, @Body() data: any) {
    return this.statesService.update(id, data);
  }

  @Delete(":id")
  async delete(@Param("id") id: string) {
    return this.statesService.delete(id);
  }
}
