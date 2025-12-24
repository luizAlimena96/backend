import { Module } from "@nestjs/common";
import { FollowupsController } from "./followups.controller";
import { FollowupsService } from "./followups.service";
import { PrismaModule } from "../database/prisma.module";
import { IntegrationsModule } from "../integrations/integrations.module";
import { AIModule } from "../ai/ai.module";
import { CommonModule } from "../common/common.module";

@Module({
  imports: [PrismaModule, IntegrationsModule, AIModule, CommonModule],
  controllers: [FollowupsController],
  providers: [FollowupsService],
  exports: [FollowupsService],
})
export class FollowupsModule { }

