import { Module } from '@nestjs/common';
import { GoogleController } from './google.controller';
import { PrismaModule } from '../database/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [GoogleController],
    providers: [],
    exports: [],
})
export class GoogleModule { }
