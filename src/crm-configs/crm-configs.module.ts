import { Module } from '@nestjs/common';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { CrmConfigsController } from './crm-configs.controller';
import { CrmConfigsService } from './crm-configs.service';
import { PrismaService } from '../database/prisma.service';

@Module({
    imports: [PrismaModule],
    controllers: [CrmConfigsController],
    providers: [CrmConfigsService],
    exports: [CrmConfigsService],
})
export class CrmConfigsModule { }
