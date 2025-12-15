"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchedulingService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
let SchedulingService = class SchedulingService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createAppointment(data) {
        return this.prisma.appointment.create({
            data: {
                leadId: data.leadId,
                title: data.title,
                scheduledAt: data.scheduledAt,
                duration: data.duration || 60,
                type: data.type || 'MEETING',
                notes: data.notes,
                organizationId: data.organizationId,
                status: 'SCHEDULED',
            },
        });
    }
    async getAvailableSlots(organizationId, date) {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        const appointments = await this.prisma.appointment.findMany({
            where: {
                organizationId,
                scheduledAt: {
                    gte: startOfDay,
                    lte: endOfDay,
                },
                status: { not: 'CANCELLED' },
            },
        });
        const slots = [];
        for (let hour = 9; hour < 18; hour++) {
            const slotTime = new Date(date);
            slotTime.setHours(hour, 0, 0, 0);
            const isBooked = appointments.some(apt => apt.scheduledAt.getTime() === slotTime.getTime());
            if (!isBooked) {
                slots.push({ time: slotTime, available: true });
            }
        }
        return slots;
    }
    async cancelAppointment(id) {
        return this.prisma.appointment.update({
            where: { id },
            data: { status: 'CANCELLED' },
        });
    }
    async rescheduleAppointment(id, newDate) {
        return this.prisma.appointment.update({
            where: { id },
            data: { scheduledAt: newDate },
        });
    }
};
exports.SchedulingService = SchedulingService;
exports.SchedulingService = SchedulingService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SchedulingService);
//# sourceMappingURL=scheduling.service.js.map