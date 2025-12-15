import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards } from "@nestjs/common";
import { AppointmentsService } from "./appointments.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@Controller("appointments")
@UseGuards(JwtAuthGuard)
export class AppointmentsController {
  constructor(private appointmentsService: AppointmentsService) {}

  @Get()
  async findAll(@Query("organizationId") organizationId: string, @Query("leadId") leadId?: string) {
    return this.appointmentsService.findAll(organizationId, leadId);
  }

  @Get(":id")
  async findOne(@Param("id") id: string) {
    return this.appointmentsService.findOne(id);
  }

  @Post()
  async create(@Body() data: any) {
    return this.appointmentsService.create(data);
  }

  @Put(":id")
  async update(@Param("id") id: string, @Body() data: any) {
    return this.appointmentsService.update(id, data);
  }

  @Delete(":id")
  async delete(@Param("id") id: string) {
    return this.appointmentsService.delete(id);
  }
}
