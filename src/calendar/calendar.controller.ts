import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CalendarService } from './calendar.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('calendar')
@UseGuards(JwtAuthGuard)
export class CalendarController {
    constructor(private calendarService: CalendarService) { }

    @Get('google-events')
    async getGoogleEvents(@Query('agentId') agentId: string) {
        if (!agentId) {
            return [];
        }
        return this.calendarService.getGoogleEvents(agentId);
    }
}
