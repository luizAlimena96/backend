import { Module } from '@nestjs/common';
import { CrmConfigsController } from './crm-configs.controller';
import { CrmConfigsService } from './crm-configs.service';
import { PrismaService } from '../database/prisma.service';

@Module({
    controllers: [CrmConfigsController],
    providers: [CrmConfigsService, PrismaService],
    exports: [CrmConfigsService],
})
export class CrmConfigsModule { }
