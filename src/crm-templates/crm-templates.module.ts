import { Module } from '@nestjs/common';
import { CrmTemplatesController } from './crm-templates.controller';
import { CrmTemplatesService } from './crm-templates.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrismaModule } from '../database/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [CrmTemplatesController],
    providers: [CrmTemplatesService],
    exports: [CrmTemplatesService],
})
export class CrmTemplatesModule { }
