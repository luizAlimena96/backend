import { Module } from "@nestjs/common";
import { RemindersController } from "./reminders.controller";
import { RemindersService } from "./reminders.service";
import { PrismaModule } from "../database/prisma.module";
import { IntegrationsModule } from "../integrations/integrations.module";

@Module({
  imports: [PrismaModule, IntegrationsModule],
  controllers: [RemindersController],
  providers: [RemindersService],
})
export class RemindersModule { }

