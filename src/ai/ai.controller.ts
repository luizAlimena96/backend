import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { AIService } from './ai.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AIController {
    constructor(private aiService: AIService) { }

    @Post('process')
    async processMessage(@Body() data: any) {
        return this.aiService.processMessage(data);
    }
}
