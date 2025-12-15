import { Module } from '@nestjs/common';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { CrmAutomationsController } from './crm-automations.controller';
import { CrmAutomationsService } from './crm-automations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrismaModule } from '../database/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [CrmAutomationsController],
    providers: [CrmAutomationsService],
    exports: [CrmAutomationsService],
})
export class CrmAutomationsModule { }
