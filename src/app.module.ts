import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { HttpModule } from "@nestjs/axios";
import { ScheduleModule } from "@nestjs/schedule";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { PrismaModule } from "./database/prisma.module";
import { CommonModule } from "./common/common.module";
import { AuthModule } from "./auth/auth.module";
import { AgentsModule } from "./agents/agents.module";
import { ConversationsModule } from "./conversations/conversations.module";
import { LeadsModule } from "./leads/leads.module";
import { KnowledgeModule } from "./knowledge/knowledge.module";
import { DashboardModule } from "./dashboard/dashboard.module";
import { WebhooksModule } from "./webhooks/webhooks.module";
import { UsersModule } from "./users/users.module";
import { StatesModule } from "./states/states.module";
import { CRMModule } from "./crm/crm.module";
import { FollowupsModule } from "./followups/followups.module";
import { RemindersModule } from "./reminders/reminders.module";
import { QuickResponsesModule } from "./quick-responses/quick-responses.module";
import { ResponseTemplatesModule } from "./response-templates/response-templates.module";
import { AppointmentsModule } from "./appointments/appointments.module";
import { FeedbackModule } from "./feedback/feedback.module";
import { TagsModule } from "./tags/tags.module";
import { AIModule } from "./ai/ai.module";
import { IntegrationsModule } from "./integrations/integrations.module";
import { AdminModule } from "./admin/admin.module";
import { QueuesModule } from "./queues/queues.module";
import { EmailModule } from './email/email.module';
import { ReportsModule } from './reports/reports.module';
import { UsageModule } from './usage/usage.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { TestAIModule } from './test-ai/test-ai.module';
import { CalendarModule } from './calendar/calendar.module';
import { HealthModule } from './health/health.module';
import { GoogleModule } from './google/google.module';
import { TemplatesModule } from './templates/templates.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
    }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{
      name: 'short',
      ttl: 1000,      // 1 segundo
      limit: 10,      // 10 requisições
    }, {
      name: 'medium',
      ttl: 60000,     // 1 minuto
      limit: 100,     // 100 requisições
    }, {
      name: 'long',
      ttl: 900000,    // 15 minutos
      limit: 1000,    // 1000 requisições
    }]),
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 5,
    }),
    PrismaModule,
    CommonModule,
    AuthModule,
    AgentsModule,
    ConversationsModule,
    LeadsModule,
    KnowledgeModule,
    DashboardModule,
    WebhooksModule,
    UsersModule,
    StatesModule,
    CRMModule,
    FollowupsModule,
    RemindersModule,
    QuickResponsesModule,
    ResponseTemplatesModule,
    AppointmentsModule,
    FeedbackModule,
    TagsModule,
    AIModule,
    IntegrationsModule,
    AdminModule,
    QueuesModule,
    EmailModule,
    ReportsModule,
    UsageModule,
    OrganizationsModule,
    TestAIModule,
    CalendarModule,
    HealthModule,
    GoogleModule,
    TemplatesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule { }
