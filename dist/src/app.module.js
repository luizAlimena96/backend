"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const axios_1 = require("@nestjs/axios");
const schedule_1 = require("@nestjs/schedule");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const prisma_module_1 = require("./database/prisma.module");
const common_module_1 = require("./common/common.module");
const auth_module_1 = require("./auth/auth.module");
const agents_module_1 = require("./agents/agents.module");
const conversations_module_1 = require("./conversations/conversations.module");
const leads_module_1 = require("./leads/leads.module");
const knowledge_module_1 = require("./knowledge/knowledge.module");
const dashboard_module_1 = require("./dashboard/dashboard.module");
const webhooks_module_1 = require("./webhooks/webhooks.module");
const users_module_1 = require("./users/users.module");
const states_module_1 = require("./states/states.module");
const crm_module_1 = require("./crm/crm.module");
const followups_module_1 = require("./followups/followups.module");
const reminders_module_1 = require("./reminders/reminders.module");
const quick_responses_module_1 = require("./quick-responses/quick-responses.module");
const response_templates_module_1 = require("./response-templates/response-templates.module");
const appointments_module_1 = require("./appointments/appointments.module");
const feedback_module_1 = require("./feedback/feedback.module");
const tags_module_1 = require("./tags/tags.module");
const ai_module_1 = require("./ai/ai.module");
const integrations_module_1 = require("./integrations/integrations.module");
const admin_module_1 = require("./admin/admin.module");
const queues_module_1 = require("./queues/queues.module");
const email_module_1 = require("./email/email.module");
const reports_module_1 = require("./reports/reports.module");
const usage_module_1 = require("./usage/usage.module");
const organizations_module_1 = require("./organizations/organizations.module");
const test_ai_module_1 = require("./test-ai/test-ai.module");
const calendar_module_1 = require("./calendar/calendar.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                envFilePath: ".env",
            }),
            schedule_1.ScheduleModule.forRoot(),
            axios_1.HttpModule.register({
                timeout: 30000,
                maxRedirects: 5,
            }),
            prisma_module_1.PrismaModule,
            common_module_1.CommonModule,
            auth_module_1.AuthModule,
            agents_module_1.AgentsModule,
            conversations_module_1.ConversationsModule,
            leads_module_1.LeadsModule,
            knowledge_module_1.KnowledgeModule,
            dashboard_module_1.DashboardModule,
            webhooks_module_1.WebhooksModule,
            users_module_1.UsersModule,
            states_module_1.StatesModule,
            crm_module_1.CRMModule,
            followups_module_1.FollowupsModule,
            reminders_module_1.RemindersModule,
            quick_responses_module_1.QuickResponsesModule,
            response_templates_module_1.ResponseTemplatesModule,
            appointments_module_1.AppointmentsModule,
            feedback_module_1.FeedbackModule,
            tags_module_1.TagsModule,
            ai_module_1.AIModule,
            integrations_module_1.IntegrationsModule,
            admin_module_1.AdminModule,
            queues_module_1.QueuesModule,
            email_module_1.EmailModule,
            reports_module_1.ReportsModule,
            usage_module_1.UsageModule,
            organizations_module_1.OrganizationsModule,
            test_ai_module_1.TestAIModule,
            calendar_module_1.CalendarModule,
        ],
        controllers: [app_controller_1.AppController],
        providers: [app_service_1.AppService],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map