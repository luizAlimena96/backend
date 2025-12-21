import { Module } from "@nestjs/common";
import { ConversationsController } from "./conversations.controller";
import { ConversationsService } from "./conversations.service";
import { PrismaModule } from "../database/prisma.module";
import { CrmAutomationsModule } from "../crm-automations/crm-automations.module";

@Module({
  imports: [PrismaModule, CrmAutomationsModule],
  controllers: [ConversationsController],
  providers: [ConversationsService],
  exports: [ConversationsService],
})
export class ConversationsModule { }
