import { Module } from '@nestjs/common';
import { SchedulingToolsService } from './scheduling-tools.service';
import { ContractToolsService } from './contract-tools.service';
import { PrismaModule } from '../../database/prisma.module';
import { IntegrationsModule } from '../../integrations/integrations.module';


@Module({
    imports: [PrismaModule, IntegrationsModule],
    providers: [SchedulingToolsService, ContractToolsService],
    exports: [SchedulingToolsService, ContractToolsService],
})
export class ToolsModule { }

