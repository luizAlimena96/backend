import { Controller, Get, Post, Put, Delete, Patch, Param, Body, Query, UseGuards } from "@nestjs/common";
import { CRMService } from "./crm.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@Controller("crm")
@UseGuards(JwtAuthGuard)
export class CRMController {
  constructor(private crmService: CRMService) { }

  @Get("configs")
  async findAllConfigs(@Query("organizationId") organizationId: string) {
    return this.crmService.findAllConfigs(organizationId);
  }

  @Post("configs")
  async createConfig(@Body() data: any) {
    return this.crmService.createConfig(data);
  }

  @Put("configs/:id")
  async updateConfig(@Param("id") id: string, @Body() data: any) {
    return this.crmService.updateConfig(id, data);
  }

  @Delete("configs/:id")
  async deleteConfig(@Param("id") id: string) {
    return this.crmService.deleteConfig(id);
  }

  @Get("stages")
  async findAllStages(@Query("agentId") agentId: string) {
    return this.crmService.findAllStages(agentId);
  }

  @Post("stages")
  async createStage(@Body() data: any) {
    return this.crmService.createStage(data);
  }

  @Put("stages/:id")
  async updateStage(@Param("id") id: string, @Body() data: any) {
    return this.crmService.updateStage(id, data);
  }

  @Delete("stages/:id")
  async deleteStage(@Param("id") id: string) {
    return this.crmService.deleteStage(id);
  }

  @Patch("stages/reorder")
  async reorderStages(@Body("agentId") agentId: string, @Body("stageIds") stageIds: string[]) {
    return this.crmService.reorderStages(agentId, stageIds);
  }

  @Get("automations")
  async findAllAutomations(@Query("crmConfigId") crmConfigId: string) {
    return this.crmService.findAllAutomations(crmConfigId);
  }

  @Post("automations")
  async createAutomation(@Body() data: any) {
    return this.crmService.createAutomation(data);
  }

  @Put("automations/:id")
  async updateAutomation(@Param("id") id: string, @Body() data: any) {
    return this.crmService.updateAutomation(id, data);
  }

  @Delete("automations/:id")
  async deleteAutomation(@Param("id") id: string) {
    return this.crmService.deleteAutomation(id);
  }
}
