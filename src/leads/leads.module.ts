import { Module, forwardRef } from "@nestjs/common";
import { LeadsController } from "./leads.controller";
import { LeadsService } from "./leads.service";
import { AIModule } from "../ai/ai.module";
import { CrmAutomationsModule } from "../crm-automations/crm-automations.module";

@Module({
  imports: [
    AIModule,
    forwardRef(() => CrmAutomationsModule) // Using forwardRef just to be safe although not strictly cyclic yet unless CrmAnalytics imports Leads
  ],
  controllers: [LeadsController],
  providers: [LeadsService],
  exports: [LeadsService],
})
export class LeadsModule { }
