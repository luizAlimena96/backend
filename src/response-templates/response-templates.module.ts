import { Module } from "@nestjs/common";
import { ResponseTemplatesController } from "./response-templates.controller";
import { ResponseTemplatesService } from "./response-templates.service";

@Module({
  controllers: [ResponseTemplatesController],
  providers: [ResponseTemplatesService],
})
export class ResponseTemplatesModule {}
