import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, Sse, MessageEvent } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { Observable, fromEvent } from "rxjs";
import { map, filter } from "rxjs/operators";
import { ConversationsService } from "./conversations.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@Controller("conversations")
@UseGuards(JwtAuthGuard)
export class ConversationsController {
  constructor(
    private conversationsService: ConversationsService,
    private eventEmitter: EventEmitter2
  ) { }

  @Get()
  async findAll(@Query("organizationId") organizationId: string) {
    return this.conversationsService.findAll(organizationId);
  }

  @Get(":id")
  async findOne(@Param("id") id: string) {
    return this.conversationsService.findOne(id);
  }

  @Post()
  async create(@Body() data: any) {
    return this.conversationsService.create(data);
  }

  @Patch(":id")
  async update(@Param("id") id: string, @Body() data: any) {
    return this.conversationsService.update(id, data);
  }

  @Patch(":id/ai-toggle")
  async toggleAI(@Param("id") id: string, @Body("enabled") enabled: boolean) {
    return this.conversationsService.toggleAI(id, enabled);
  }

  @Sse(':id/stream')
  sse(@Param('id') id: string): Observable<MessageEvent> {
    return fromEvent(this.eventEmitter, 'conversation.message').pipe(
      filter((payload: any) => payload.conversationId === id),
      map((payload: any) => ({
        data: {
          type: 'new-message',
          message: payload.message,
          conversationId: id
        }
      } as MessageEvent))
    );
  }

  // Messages
  @Get(":id/messages")
  async getMessages(@Param("id") id: string) {
    return this.conversationsService.getMessages(id);
  }

  @Post(":id/messages")
  async sendMessage(
    @Param("id") id: string,
    @Body("content") content: string,
    @Body("role") role: string
  ) {
    const fromMe = role === 'assistant';
    return this.conversationsService.sendMessage(id, content, fromMe);
  }

  // Tags
  @Post(":id/tags")
  async addTag(@Param("id") id: string, @Body("tagId") tagId: string) {
    return this.conversationsService.addTag(id, tagId);
  }

  @Delete(":id/tags/:tagId")
  async removeTag(@Param("id") id: string, @Param("tagId") tagId: string) {
    return this.conversationsService.removeTag(id, tagId);
  }
}
