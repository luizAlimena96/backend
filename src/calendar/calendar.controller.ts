import { Controller, Get, Post, Put, Delete, Query, Body, Param, UseGuards } from '@nestjs/common';
import { CalendarService } from './calendar.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('calendar')
@UseGuards(JwtAuthGuard)
export class CalendarController {
    constructor(private calendarService: CalendarService) { }

    @Get('google-events')
    async getGoogleEvents(@Query('organizationId') organizationId: string) {
        if (!organizationId) {
            return [];
        }
        return this.calendarService.getGoogleEvents(organizationId);
    }

    // Blocked Slots Management
    @Get('blocked-slots')
    async getBlockedSlots(@Query('organizationId') organizationId: string) {
        return this.calendarService.getBlockedSlots(organizationId);
    }

    @Post('blocked-slots')
    async createBlockedSlot(@Body() data: {
        organizationId: string;
        startTime: string;
        endTime: string;
        title?: string;
        allDay?: boolean;
    }) {
        return this.calendarService.createBlockedSlot(data);
    }

    @Delete('blocked-slots/:id')
    async deleteBlockedSlot(@Param('id') id: string) {
        return this.calendarService.deleteBlockedSlot(id);
    }

    // Working Hours Management
    @Get('working-hours')
    async getWorkingHours(@Query('organizationId') organizationId: string) {
        return this.calendarService.getWorkingHours(organizationId);
    }

    @Put('working-hours')
    async updateWorkingHours(@Body() data: {
        organizationId: string;
        workingHours: any;
    }) {
        return this.calendarService.updateWorkingHours(data.organizationId, data.workingHours);
    }
}
