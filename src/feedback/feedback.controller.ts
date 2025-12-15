import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from "@nestjs/common";
import { FeedbackService } from "./feedback.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@Controller("feedback")
@UseGuards(JwtAuthGuard)
export class FeedbackController {
  constructor(private feedbackService: FeedbackService) {}

  @Get()
  async findAll(@Query("organizationId") organizationId: string) {
    return this.feedbackService.findAll(organizationId);
  }

  @Get(":id")
  async findOne(@Param("id") id: string) {
    return this.feedbackService.findOne(id);
  }

  @Post()
  async create(@Body() data: any) {
    return this.feedbackService.create(data);
  }

  @Patch(":id/resolve")
  async resolve(@Param("id") id: string, @Body("response") response: string) {
    return this.feedbackService.resolve(id, response);
  }

  @Patch(":id/reopen")
  async reopen(@Param("id") id: string) {
    return this.feedbackService.reopen(id);
  }
}
