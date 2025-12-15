import { Module } from "@nestjs/common";
import { QuickResponsesController } from "./quick-responses.controller";
import { QuickResponsesService } from "./quick-responses.service";

@Module({
  controllers: [QuickResponsesController],
  providers: [QuickResponsesService],
})
export class QuickResponsesModule {}
