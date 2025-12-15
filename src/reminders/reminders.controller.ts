import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards } from "@nestjs/common";
import { RemindersService } from "./reminders.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@Controller("reminders")
@UseGuards(JwtAuthGuard)
export class RemindersController {
  constructor(private remindersService: RemindersService) { }

  @Get()
  async findAll(@Query("agentId") agentId: string) {
    return this.remindersService.findAll(agentId);
  }

  @Post()
  async create(@Body() data: any) {
    return this.remindersService.create(data);
  }

  @Put(":id")
  async update(@Param("id") id: string, @Body() data: any) {
    return this.remindersService.update(id, data);
  }

  @Delete(":id")
  async delete(@Param("id") id: string) {
    return this.remindersService.delete(id);
  }

  @Post("send-pending")
  async sendPending() {
    return this.remindersService.sendPendingReminders();
  }
}
