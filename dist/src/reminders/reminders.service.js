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
exports.RemindersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../database/prisma.service");
const whatsapp_integration_service_1 = require("../integrations/whatsapp/whatsapp-integration.service");
let RemindersService = class RemindersService {
    prisma;
    whatsappService;
    constructor(prisma, whatsappService) {
        this.prisma = prisma;
        this.whatsappService = whatsappService;
    }
    async findAll(agentId) {
        return this.prisma.reminder.findMany({
            where: { agentId },
            orderBy: { scheduledFor: "asc" },
        });
    }
    async create(data) {
        return this.prisma.reminder.create({ data });
    }
    async update(id, data) {
        return this.prisma.reminder.update({ where: { id }, data });
    }
    async delete(id) {
        await this.prisma.reminder.delete({ where: { id } });
        return { success: true };
    }
    async sendPendingReminders() {
        console.log('[Reminders Service] Checking for pending reminders...');
        try {
            const now = new Date();
            const pendingReminders = await this.prisma.reminder.findMany({
                where: {
                    scheduledFor: { lte: now },
                    isActive: true,
                },
                include: {
                    agent: {
                        include: {
                            organization: true,
                        },
                    },
                },
            });
            console.log(`[Reminders Service] Found ${pendingReminders.length} pending reminders`);
            let successCount = 0;
            let errorCount = 0;
            for (const reminder of pendingReminders) {
                try {
                    console.log(`[Reminders Service] Processing reminder: ${reminder.id}`);
                    const instanceName = reminder.agent.instance;
                    for (const recipient of reminder.recipients) {
                        try {
                            if (reminder.mediaType === 'text') {
                                await this.whatsappService.sendMessage(instanceName, recipient, reminder.message);
                            }
                            else if (reminder.mediaType === 'media' && reminder.message) {
                                await this.whatsappService.sendMedia(instanceName, recipient, reminder.message, reminder.title);
                            }
                            console.log(`[Reminders Service] ✅ Sent to ${recipient}`);
                        }
                        catch (sendError) {
                            console.error(`[Reminders Service] ❌ Failed to send to ${recipient}:`, sendError);
                        }
                    }
                    await this.prisma.reminder.update({
                        where: { id: reminder.id },
                        data: { isActive: false },
                    });
                    successCount++;
                    console.log(`[Reminders Service] ✅ Processed reminder ${reminder.id}`);
                }
                catch (error) {
                    errorCount++;
                    console.error(`[Reminders Service] ❌ Error processing reminder ${reminder.id}:`, error);
                }
            }
            console.log(`[Reminders Service] Completed: ${successCount} success, ${errorCount} errors`);
            return {
                processed: pendingReminders.length,
                success: successCount,
                errors: errorCount,
            };
        }
        catch (error) {
            console.error('[Reminders Service] Error in sendPendingReminders:', error);
            throw error;
        }
    }
};
exports.RemindersService = RemindersService;
exports.RemindersService = RemindersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        whatsapp_integration_service_1.WhatsAppIntegrationService])
], RemindersService);
//# sourceMappingURL=reminders.service.js.map