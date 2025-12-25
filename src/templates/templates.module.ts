import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TemplatesController } from './templates.controller';
import { TemplatesService } from './templates.service';
import { PrismaModule } from '../database/prisma.module';

@Module({
    imports: [PrismaModule, HttpModule],
    controllers: [TemplatesController],
    providers: [TemplatesService],
    exports: [TemplatesService],
})
export class TemplatesModule { }
