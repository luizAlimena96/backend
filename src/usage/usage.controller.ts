import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { UsageService } from './usage.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('usage')
@UseGuards(JwtAuthGuard)
export class UsageController {
    constructor(private usageService: UsageService) { }

    @Get('openai')
    async getOpenAICosts(
        @Query('organizationId') organizationId: string,
        @Query('period') period: 'day' | 'week' | 'month' = 'month',
    ) {
        return this.usageService.getOpenAICosts(organizationId, period);
    }

    @Get('elevenlabs')
    async getElevenLabsCosts(
        @Query('organizationId') organizationId: string,
        @Query('period') period: 'day' | 'week' | 'month' = 'month',
    ) {
        return this.usageService.getElevenLabsCosts(organizationId, period);
    }
}
