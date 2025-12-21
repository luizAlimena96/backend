import { Module } from '@nestjs/common';
import { CrmAutomationsController } from './crm-automations.controller';
import { CrmAutomationsService } from './crm-automations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrismaModule } from '../database/prisma.module';
import { BullModule } from '@nestjs/bullmq';

@Module({
    imports: [
        PrismaModule,
        BullModule.registerQueue({
            name: 'automation',
        }),
    ],
    controllers: [CrmAutomationsController],
    providers: [CrmAutomationsService],
    exports: [CrmAutomationsService],
})
export class CrmAutomationsModule { }
