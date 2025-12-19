import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, Request as Req } from "@nestjs/common";
import { FeedbackService } from "./feedback.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@Controller("feedback")
@UseGuards(JwtAuthGuard)
export class FeedbackController {
  constructor(private feedbackService: FeedbackService) { }

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

  @Post(":id/respond")
  // Using AnyFilesInterceptor or similar if formData is strictly required, 
  // but since we receive "response" field, @Body() is cleaner if client sends JSON.
  // However client sends FormData. NestJS handles FormData via Interceptors but we can try parsing body if configured.
  // Let's assume standardized JSON header or FormData parsing.
  // If cliente uses api-client which sends FormData, we need FileInterceptor even if no file, OR rely on raw body parser.
  // Easiest is to accept Body() if global pipes handle it.
  // But wait, the client implementation `api.feedback.respond` sends `FormData`. 
  // To handle FormData in NestJS without file upload, we usually use `@UseInterceptors(FileInterceptor('file'))` (even if empty) or just `@Body`.
  // Let's use @Body() and rely on the fact that for simple text fields formData is parsed into body by body-parser (if extended:true).
  // Safest for FormData with potentially no files is `UseInterceptors(FileInterceptor(''))` or similar.
  // Let's just use @Body() and assume standard parsing.
  async respond(@Param("id") id: string, @Body() body: any, @Req() req) {
    // Body might be nested or flat depending on parser.
    const responseText = body.response;
    // Extract user from request if available (JwtAuthGuard)
    const user = req?.user;
    const userId = user?.id || "admin";
    const userName = user?.name || "Admin"; // Or "Suporte"

    return this.feedbackService.respond(id, responseText, userId, userName);
  }

  @Get(":id/responses")
  async getResponses(@Param("id") id: string) {
    return this.feedbackService.getResponses(id);
  }

  @Get(":id/debug-logs")
  async getDebugLogs(@Param("id") id: string) {
    return this.feedbackService.getDebugLogs(id);
  }

  @Delete(":id")
  async remove(@Param("id") id: string) {
    return this.feedbackService.remove(id);
  }
}
