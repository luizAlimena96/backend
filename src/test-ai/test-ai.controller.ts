import {
    Controller,
    Get,
    Post,
    Delete,
    Body,
    Query,
    UseGuards,
    Request,
} from '@nestjs/common';
import { TestAIService } from './test-ai.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('test-ai')
@UseGuards(JwtAuthGuard)
export class TestAIController {
    constructor(private testAIService: TestAIService) { }

    @Post()
    async processMessage(@Body() data: any, @Request() req) {
        const { id: userId, role } = req.user;
        return this.testAIService.processMessage(data, userId, role);
    }

    @Get()
    async getHistory(@Query('organizationId') organizationId: string, @Request() req) {
        const { role } = req.user;
        return this.testAIService.getHistory(organizationId, role);
    }

    @Delete()
    async resetConversation(@Query('organizationId') organizationId: string, @Request() req) {
        const { role } = req.user;
        return this.testAIService.resetConversation(organizationId, role);
    }

    @Post('trigger-followup')
    async triggerFollowup(@Body() data: any, @Request() req) {
        const { organizationId, agentId } = data;
        const { role } = req.user;
        return this.testAIService.triggerFollowup(organizationId, agentId, role);
    }
}
