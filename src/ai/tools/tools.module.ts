import { Module } from '@nestjs/common';
import { SchedulingToolsService } from './scheduling-tools.service';
import { PrismaModule } from '../../database/prisma.module';


@Module({
    imports: [PrismaModule],
    providers: [SchedulingToolsService],
    exports: [SchedulingToolsService],
})
export class ToolsModule { }
