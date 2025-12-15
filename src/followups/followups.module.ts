import { Module } from "@nestjs/common";
import { FollowupsController } from "./followups.controller";
import { FollowupsService } from "./followups.service";
import { PrismaModule } from "../database/prisma.module";
import { IntegrationsModule } from "../integrations/integrations.module";

@Module({
  imports: [PrismaModule, IntegrationsModule],
  controllers: [FollowupsController],
  providers: [FollowupsService],
  exports: [FollowupsService],
})
export class FollowupsModule { }
