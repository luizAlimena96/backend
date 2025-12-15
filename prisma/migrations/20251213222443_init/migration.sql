-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'USER');

-- CreateEnum
CREATE TYPE "Tone" AS ENUM ('FORMAL', 'CASUAL', 'FRIENDLY', 'PROFESSIONAL');

-- CreateEnum
CREATE TYPE "KnowledgeType" AS ENUM ('DOCUMENT', 'FAQ', 'TEXT');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL_SENT', 'WON', 'LOST');

-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('TEXT', 'IMAGE', 'AUDIO', 'DOCUMENT', 'VIDEO');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'CRM_BLOCKED');

-- CreateEnum
CREATE TYPE "FeedbackStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'RESOLVED', 'RESPONDED');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "LogLevel" AS ENUM ('ERROR', 'WARN', 'INFO', 'DEBUG');

-- CreateEnum
CREATE TYPE "QuickResponseType" AS ENUM ('TEXT', 'AUDIO', 'IMAGE');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ReportType" AS ENUM ('CONVERSAS', 'FEEDBACK', 'PERFORMANCE', 'ATENDIMENTO', 'GERAL');

-- CreateEnum
CREATE TYPE "ReportPeriod" AS ENUM ('SEMANAL', 'MENSAL', 'TRIMESTRAL', 'ANUAL', 'PERSONALIZADO');

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "settings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "evolutionApiUrl" TEXT,
    "evolutionApiKey" TEXT,
    "evolutionInstanceName" TEXT,
    "whatsappConnected" BOOLEAN NOT NULL DEFAULT false,
    "whatsappQrCode" TEXT,
    "whatsappPhone" TEXT,
    "whatsappConnectedAt" TIMESTAMP(3),
    "crmEnabled" BOOLEAN NOT NULL DEFAULT false,
    "crmType" TEXT,
    "crmWebhookUrl" TEXT,
    "crmApiKey" TEXT,
    "crmAuthType" TEXT,
    "crmFieldMapping" JSONB,
    "crmCalendarSyncEnabled" BOOLEAN NOT NULL DEFAULT false,
    "crmCalendarApiUrl" TEXT,
    "crmCalendarApiKey" TEXT,
    "crmCalendarSyncInterval" INTEGER NOT NULL DEFAULT 15,
    "crmCalendarType" TEXT,
    "appointmentWebhookUrl" TEXT,
    "appointmentWebhookEnabled" BOOLEAN NOT NULL DEFAULT false,
    "zapSignApiToken" TEXT,
    "zapSignTemplateId" TEXT,
    "zapSignEnabled" BOOLEAN NOT NULL DEFAULT false,
    "openaiApiKey" TEXT,
    "openaiModel" TEXT DEFAULT 'gpt-4o-mini',
    "elevenLabsApiKey" TEXT,
    "elevenLabsVoiceId" TEXT,
    "elevenLabsModel" TEXT DEFAULT 'eleven_multilingual_v2',
    "city" TEXT,
    "document" TEXT,
    "neighborhood" TEXT,
    "niche" TEXT,
    "number" TEXT,
    "state" TEXT,
    "street" TEXT,
    "zipCode" TEXT,
    "googleAccessToken" TEXT,
    "googleCalendarEnabled" BOOLEAN NOT NULL DEFAULT false,
    "googleCalendarId" TEXT,
    "googleRefreshToken" TEXT,
    "googleTokenExpiry" TIMESTAMP(3),
    "workingHours" JSONB,
    "openaiProjectId" TEXT,
    "whatsappAlertPhone1" TEXT,
    "whatsappAlertPhone2" TEXT,
    "whatsappLastConnected" TIMESTAMP(3),
    "whatsappLastDisconnected" TIMESTAMP(3),
    "whatsappMonitoringEnabled" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendar_events" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "googleEventId" TEXT NOT NULL,
    "summary" TEXT,
    "description" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "isAllDay" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL,
    "location" TEXT,
    "attendees" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendar_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blocked_slots" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "title" TEXT,
    "allDay" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blocked_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "allowedTabs" JSONB,
    "image" TEXT,
    "resetToken" TEXT,
    "resetTokenExpiry" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agents" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "tone" "Tone" NOT NULL DEFAULT 'FRIENDLY',
    "language" TEXT NOT NULL DEFAULT 'pt-BR',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "instance" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "allowDynamicDuration" BOOLEAN NOT NULL DEFAULT false,
    "blockedDates" JSONB,
    "bufferTime" INTEGER NOT NULL DEFAULT 15,
    "customTimeWindows" JSONB,
    "followupDelay" INTEGER NOT NULL DEFAULT 24,
    "followupEnabled" BOOLEAN NOT NULL DEFAULT true,
    "googleAccessToken" TEXT,
    "googleCalendarEnabled" BOOLEAN NOT NULL DEFAULT false,
    "googleCalendarId" TEXT,
    "googleRefreshToken" TEXT,
    "googleTokenExpiry" TIMESTAMP(3),
    "instructions" TEXT,
    "maxMeetingDuration" INTEGER NOT NULL DEFAULT 120,
    "meetingDuration" INTEGER NOT NULL DEFAULT 60,
    "minAdvanceHours" INTEGER NOT NULL DEFAULT 0,
    "minMeetingDuration" INTEGER NOT NULL DEFAULT 30,
    "notificationEnabled" BOOLEAN NOT NULL DEFAULT false,
    "notificationTemplate" TEXT,
    "organizationId" TEXT NOT NULL,
    "personality" TEXT,
    "reminderEnabled" BOOLEAN NOT NULL DEFAULT true,
    "reminderHours" INTEGER NOT NULL DEFAULT 2,
    "reminderMessage" TEXT,
    "systemPrompt" TEXT,
    "useCustomTimeWindows" BOOLEAN NOT NULL DEFAULT false,
    "workingHours" JSONB,
    "dataCollectionInstructions" TEXT,
    "followupDecisionPrompt" TEXT,
    "followupHours" JSONB,
    "initialStateId" TEXT,
    "messageBufferDelayMs" INTEGER NOT NULL DEFAULT 2000,
    "messageBufferEnabled" BOOLEAN NOT NULL DEFAULT false,
    "messageBufferMaxSize" INTEGER NOT NULL DEFAULT 5,
    "notificationPhones" TEXT[],
    "prohibitions" TEXT,
    "responseDelay" INTEGER NOT NULL DEFAULT 0,
    "writingStyle" TEXT,
    "dataExtractionPrompt" TEXT,
    "fsmDataExtractorPrompt" TEXT,
    "fsmStateDeciderPrompt" TEXT,
    "fsmValidatorPrompt" TEXT,
    "audioResponseEnabled" BOOLEAN NOT NULL DEFAULT true,
    "zapSignFieldMapping" JSONB,
    "zapSignTriggerCrmStageId" TEXT,

    CONSTRAINT "agents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" "KnowledgeType" NOT NULL,
    "fileUrl" TEXT,
    "fileName" TEXT,
    "fileSize" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "agentId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "knowledge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_chunks" (
    "id" TEXT NOT NULL,
    "knowledgeId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "embedding" vector,
    "chunkIndex" INTEGER NOT NULL,
    "organizationId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "knowledge_chunks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "followups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "condition" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "delayHours" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "agentId" TEXT NOT NULL,
    "aiDecisionEnabled" BOOLEAN NOT NULL DEFAULT false,
    "aiDecisionPrompt" TEXT,
    "audioVoiceId" TEXT,
    "mediaType" TEXT NOT NULL DEFAULT 'text',
    "mediaUrl" TEXT,
    "organizationId" TEXT NOT NULL,
    "respectBusinessHours" BOOLEAN NOT NULL DEFAULT false,
    "specificHour" INTEGER,
    "specificMinute" INTEGER,
    "specificTimeEnabled" BOOLEAN NOT NULL DEFAULT false,
    "delayMinutes" INTEGER DEFAULT 0,
    "matrixStageId" TEXT,

    CONSTRAINT "followups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reminders" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "recipients" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "agentId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "advanceTime" INTEGER,
    "mediaType" TEXT NOT NULL DEFAULT 'text',

    CONSTRAINT "reminders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "phone" TEXT NOT NULL,
    "phoneWith9" TEXT,
    "phoneNo9" TEXT,
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "source" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "agentId" TEXT NOT NULL,
    "address" TEXT,
    "contractDate" TIMESTAMP(3),
    "cpf" TEXT,
    "currentState" TEXT,
    "extractedData" JSONB,
    "log" TEXT,
    "maritalStatus" TEXT,
    "organizationId" TEXT NOT NULL,
    "profession" TEXT,
    "zapSignDocumentId" TEXT,
    "zapSignSignedAt" TIMESTAMP(3),
    "zapSignStatus" TEXT,
    "birthDate" TIMESTAMP(3),
    "rg" TEXT,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" TEXT NOT NULL,
    "whatsapp" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "agentId" TEXT NOT NULL,
    "leadId" TEXT,
    "organizationId" TEXT NOT NULL,
    "aiEnabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "type" "MessageType" NOT NULL,
    "content" TEXT NOT NULL,
    "fromMe" BOOLEAN NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "conversationId" TEXT NOT NULL,
    "thought" TEXT,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memory" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "agentId" TEXT NOT NULL,

    CONSTRAINT "memory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "location" TEXT,
    "meetingLink" TEXT,
    "notes" TEXT,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'SCHEDULED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "leadId" TEXT,
    "crmEventId" TEXT,
    "crmSynced" BOOLEAN NOT NULL DEFAULT false,
    "googleEventId" TEXT,
    "organizationId" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedback" (
    "id" TEXT NOT NULL,
    "customer" TEXT NOT NULL,
    "phone" TEXT,
    "message" TEXT NOT NULL,
    "status" "FeedbackStatus" NOT NULL DEFAULT 'PENDING',
    "severity" "Severity" NOT NULL DEFAULT 'MEDIUM',
    "category" TEXT,
    "response" TEXT,
    "images" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "conversationId" TEXT,
    "organizationId" TEXT,
    "respondedAt" TIMESTAMP(3),
    "respondedBy" TEXT,
    "aiThinking" TEXT,
    "currentState" TEXT,
    "extractedData" JSONB,
    "rating" INTEGER DEFAULT 3,

    CONSTRAINT "feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedback_responses" (
    "id" TEXT NOT NULL,
    "feedbackId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedback_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "response_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "variables" TEXT[],
    "organizationId" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "response_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flow_rules" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "condition" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "agentId" TEXT NOT NULL,

    CONSTRAINT "flow_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "states" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "missionPrompt" TEXT NOT NULL,
    "availableRoutes" JSONB NOT NULL,
    "dataKey" TEXT,
    "dataDescription" TEXT,
    "dataType" TEXT,
    "mediaId" TEXT,
    "tools" TEXT,
    "crmStatus" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "agentId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "dataCollections" JSONB,
    "mediaTiming" TEXT,
    "prohibitions" TEXT,
    "responseType" TEXT,
    "crmStageId" TEXT,

    CONSTRAINT "states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_stages" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "order" INTEGER NOT NULL DEFAULT 0,
    "agentId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crm_stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auto_scheduling_configs" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "crmStageId" TEXT NOT NULL,
    "duration" INTEGER NOT NULL DEFAULT 60,
    "minAdvanceHours" INTEGER NOT NULL DEFAULT 2,
    "preferredTime" TEXT,
    "daysOfWeek" TEXT[],
    "messageTemplate" TEXT NOT NULL,
    "autoConfirm" BOOLEAN NOT NULL DEFAULT false,
    "moveToStageId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "cancellationTemplate" TEXT,
    "confirmationTemplate" TEXT,
    "notifyTeam" BOOLEAN NOT NULL DEFAULT false,
    "reschedulingTemplate" TEXT,
    "sendConfirmation" BOOLEAN NOT NULL DEFAULT true,
    "teamPhones" TEXT[],

    CONSTRAINT "auto_scheduling_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointment_reminder_configs" (
    "id" TEXT NOT NULL,
    "autoSchedulingConfigId" TEXT NOT NULL,
    "minutesBefore" INTEGER NOT NULL,
    "sendToLead" BOOLEAN NOT NULL DEFAULT true,
    "sendToTeam" BOOLEAN NOT NULL DEFAULT false,
    "leadMessageTemplate" TEXT NOT NULL,
    "teamMessageTemplate" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointment_reminder_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "error_logs" (
    "id" TEXT NOT NULL,
    "level" "LogLevel" NOT NULL,
    "message" TEXT NOT NULL,
    "code" TEXT,
    "stack" TEXT,
    "context" JSONB,
    "userId" TEXT,
    "organizationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "error_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_webhooks" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'POST',
    "headers" JSONB,
    "bodyTemplate" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crm_webhooks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_webhook_logs" (
    "id" TEXT NOT NULL,
    "webhookId" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "response" JSONB,
    "statusCode" INTEGER,
    "success" BOOLEAN NOT NULL,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crm_webhook_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reminder_logs" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reminder_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointment_reminders" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "reminderConfigId" TEXT,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "minutesBefore" INTEGER NOT NULL,
    "sendToLead" BOOLEAN NOT NULL DEFAULT true,
    "sendToTeam" BOOLEAN NOT NULL DEFAULT false,
    "leadMessageTemplate" TEXT NOT NULL,
    "teamMessageTemplate" TEXT,
    "teamPhones" TEXT[],
    "sent" BOOLEAN NOT NULL DEFAULT false,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "appointment_reminders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "followup_logs" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "followupId" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "message" TEXT NOT NULL,

    CONSTRAINT "followup_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "debug_logs" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "conversationId" TEXT,
    "clientMessage" TEXT NOT NULL,
    "aiResponse" TEXT NOT NULL,
    "currentState" TEXT,
    "aiThinking" TEXT,
    "organizationId" TEXT,
    "agentId" TEXT,
    "leadId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "debug_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_configs" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "crmType" TEXT NOT NULL,
    "baseUrl" TEXT NOT NULL,
    "authType" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crm_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_automations" (
    "id" TEXT NOT NULL,
    "crmConfigId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "actions" JSONB NOT NULL,
    "agentStateId" TEXT,
    "description" TEXT,
    "triggerType" TEXT NOT NULL DEFAULT 'STATE_CHANGE',
    "delayMinutes" INTEGER,
    "order" INTEGER NOT NULL DEFAULT 0,
    "crmStageId" TEXT,

    CONSTRAINT "crm_automations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "crmType" TEXT NOT NULL,
    "baseUrl" TEXT NOT NULL,
    "authType" TEXT NOT NULL,
    "automations" JSONB NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "organizationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crm_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automation_logs" (
    "id" TEXT NOT NULL,
    "automationId" TEXT,
    "agentFollowUpId" TEXT,
    "conversationId" TEXT NOT NULL,
    "leadMessageId" TEXT NOT NULL,
    "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "automation_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_followups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "agentStateId" TEXT,
    "triggerMode" TEXT NOT NULL DEFAULT 'TIMER',
    "delayMinutes" INTEGER,
    "scheduledTime" TEXT,
    "messageTemplate" TEXT NOT NULL,
    "mediaUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "videoUrl" TEXT,
    "businessHoursEnabled" BOOLEAN NOT NULL DEFAULT false,
    "businessHoursStart" TEXT,
    "businessHoursEnd" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "crmStageId" TEXT,

    CONSTRAINT "agent_followups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_notifications" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "agentStateId" TEXT,
    "leadMessage" TEXT,
    "teamMessage" TEXT,
    "teamPhones" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quick_responses" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "QuickResponseType" NOT NULL,
    "content" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quick_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "ReportType" NOT NULL,
    "period" "ReportPeriod" NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'PROCESSING',
    "organizationId" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "includeGraphs" BOOLEAN NOT NULL DEFAULT true,
    "includeDetails" BOOLEAN NOT NULL DEFAULT true,
    "format" TEXT NOT NULL DEFAULT 'PDF',
    "fileUrl" TEXT,
    "downloads" INTEGER NOT NULL DEFAULT 0,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ConversationTags" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ConversationTags_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "calendar_events_googleEventId_key" ON "calendar_events"("googleEventId");

-- CreateIndex
CREATE INDEX "calendar_events_organizationId_idx" ON "calendar_events"("organizationId");

-- CreateIndex
CREATE INDEX "calendar_events_startTime_endTime_idx" ON "calendar_events"("startTime", "endTime");

-- CreateIndex
CREATE INDEX "calendar_events_organizationId_startTime_idx" ON "calendar_events"("organizationId", "startTime");

-- CreateIndex
CREATE INDEX "blocked_slots_organizationId_idx" ON "blocked_slots"("organizationId");

-- CreateIndex
CREATE INDEX "blocked_slots_startTime_endTime_idx" ON "blocked_slots"("startTime", "endTime");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_resetToken_key" ON "users"("resetToken");

-- CreateIndex
CREATE INDEX "users_organizationId_idx" ON "users"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "agents_instance_key" ON "agents"("instance");

-- CreateIndex
CREATE INDEX "agents_organizationId_idx" ON "agents"("organizationId");

-- CreateIndex
CREATE INDEX "knowledge_organizationId_idx" ON "knowledge"("organizationId");

-- CreateIndex
CREATE INDEX "knowledge_organizationId_type_idx" ON "knowledge"("organizationId", "type");

-- CreateIndex
CREATE INDEX "knowledge_organizationId_agentId_idx" ON "knowledge"("organizationId", "agentId");

-- CreateIndex
CREATE INDEX "knowledge_chunks_organizationId_idx" ON "knowledge_chunks"("organizationId");

-- CreateIndex
CREATE INDEX "knowledge_chunks_organizationId_agentId_idx" ON "knowledge_chunks"("organizationId", "agentId");

-- CreateIndex
CREATE INDEX "knowledge_chunks_knowledgeId_idx" ON "knowledge_chunks"("knowledgeId");

-- CreateIndex
CREATE INDEX "followups_organizationId_idx" ON "followups"("organizationId");

-- CreateIndex
CREATE INDEX "followups_organizationId_isActive_idx" ON "followups"("organizationId", "isActive");

-- CreateIndex
CREATE INDEX "followups_organizationId_agentId_idx" ON "followups"("organizationId", "agentId");

-- CreateIndex
CREATE INDEX "reminders_organizationId_idx" ON "reminders"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "leads_phone_key" ON "leads"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "leads_cpf_key" ON "leads"("cpf");

-- CreateIndex
CREATE INDEX "leads_phone_idx" ON "leads"("phone");

-- CreateIndex
CREATE INDEX "leads_phoneWith9_idx" ON "leads"("phoneWith9");

-- CreateIndex
CREATE INDEX "leads_phoneNo9_idx" ON "leads"("phoneNo9");

-- CreateIndex
CREATE INDEX "leads_currentState_idx" ON "leads"("currentState");

-- CreateIndex
CREATE INDEX "leads_organizationId_idx" ON "leads"("organizationId");

-- CreateIndex
CREATE INDEX "leads_organizationId_status_idx" ON "leads"("organizationId", "status");

-- CreateIndex
CREATE INDEX "leads_organizationId_phone_idx" ON "leads"("organizationId", "phone");

-- CreateIndex
CREATE INDEX "leads_organizationId_email_idx" ON "leads"("organizationId", "email");

-- CreateIndex
CREATE INDEX "leads_organizationId_currentState_idx" ON "leads"("organizationId", "currentState");

-- CreateIndex
CREATE INDEX "leads_organizationId_updatedAt_idx" ON "leads"("organizationId", "updatedAt");

-- CreateIndex
CREATE INDEX "conversations_whatsapp_idx" ON "conversations"("whatsapp");

-- CreateIndex
CREATE INDEX "conversations_organizationId_idx" ON "conversations"("organizationId");

-- CreateIndex
CREATE INDEX "conversations_organizationId_leadId_idx" ON "conversations"("organizationId", "leadId");

-- CreateIndex
CREATE INDEX "conversations_organizationId_whatsapp_idx" ON "conversations"("organizationId", "whatsapp");

-- CreateIndex
CREATE INDEX "tags_organizationId_idx" ON "tags"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "tags_organizationId_name_key" ON "tags"("organizationId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "messages_messageId_key" ON "messages"("messageId");

-- CreateIndex
CREATE INDEX "messages_messageId_idx" ON "messages"("messageId");

-- CreateIndex
CREATE INDEX "memory_sessionId_idx" ON "memory"("sessionId");

-- CreateIndex
CREATE INDEX "memory_agentId_sessionId_idx" ON "memory"("agentId", "sessionId");

-- CreateIndex
CREATE INDEX "appointments_leadId_idx" ON "appointments"("leadId");

-- CreateIndex
CREATE INDEX "appointments_organizationId_idx" ON "appointments"("organizationId");

-- CreateIndex
CREATE INDEX "appointments_scheduledAt_idx" ON "appointments"("scheduledAt");

-- CreateIndex
CREATE INDEX "feedback_conversationId_idx" ON "feedback"("conversationId");

-- CreateIndex
CREATE INDEX "feedback_organizationId_idx" ON "feedback"("organizationId");

-- CreateIndex
CREATE INDEX "feedback_status_idx" ON "feedback"("status");

-- CreateIndex
CREATE INDEX "feedback_responses_feedbackId_idx" ON "feedback_responses"("feedbackId");

-- CreateIndex
CREATE INDEX "response_templates_organizationId_idx" ON "response_templates"("organizationId");

-- CreateIndex
CREATE INDEX "response_templates_organizationId_category_idx" ON "response_templates"("organizationId", "category");

-- CreateIndex
CREATE INDEX "states_agentId_idx" ON "states"("agentId");

-- CreateIndex
CREATE INDEX "states_organizationId_idx" ON "states"("organizationId");

-- CreateIndex
CREATE INDEX "states_organizationId_agentId_idx" ON "states"("organizationId", "agentId");

-- CreateIndex
CREATE UNIQUE INDEX "states_agentId_name_key" ON "states"("agentId", "name");

-- CreateIndex
CREATE INDEX "crm_stages_agentId_idx" ON "crm_stages"("agentId");

-- CreateIndex
CREATE INDEX "crm_stages_organizationId_idx" ON "crm_stages"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "crm_stages_agentId_name_key" ON "crm_stages"("agentId", "name");

-- CreateIndex
CREATE INDEX "auto_scheduling_configs_agentId_idx" ON "auto_scheduling_configs"("agentId");

-- CreateIndex
CREATE INDEX "auto_scheduling_configs_crmStageId_idx" ON "auto_scheduling_configs"("crmStageId");

-- CreateIndex
CREATE UNIQUE INDEX "auto_scheduling_configs_agentId_crmStageId_key" ON "auto_scheduling_configs"("agentId", "crmStageId");

-- CreateIndex
CREATE INDEX "appointment_reminder_configs_autoSchedulingConfigId_idx" ON "appointment_reminder_configs"("autoSchedulingConfigId");

-- CreateIndex
CREATE INDEX "error_logs_level_idx" ON "error_logs"("level");

-- CreateIndex
CREATE INDEX "error_logs_createdAt_idx" ON "error_logs"("createdAt");

-- CreateIndex
CREATE INDEX "error_logs_organizationId_idx" ON "error_logs"("organizationId");

-- CreateIndex
CREATE INDEX "crm_webhooks_organizationId_idx" ON "crm_webhooks"("organizationId");

-- CreateIndex
CREATE INDEX "crm_webhooks_event_idx" ON "crm_webhooks"("event");

-- CreateIndex
CREATE INDEX "crm_webhook_logs_webhookId_idx" ON "crm_webhook_logs"("webhookId");

-- CreateIndex
CREATE INDEX "crm_webhook_logs_createdAt_idx" ON "crm_webhook_logs"("createdAt");

-- CreateIndex
CREATE INDEX "crm_webhook_logs_success_idx" ON "crm_webhook_logs"("success");

-- CreateIndex
CREATE INDEX "reminder_logs_scheduledFor_status_idx" ON "reminder_logs"("scheduledFor", "status");

-- CreateIndex
CREATE INDEX "reminder_logs_appointmentId_idx" ON "reminder_logs"("appointmentId");

-- CreateIndex
CREATE INDEX "appointment_reminders_scheduledFor_sent_idx" ON "appointment_reminders"("scheduledFor", "sent");

-- CreateIndex
CREATE INDEX "appointment_reminders_appointmentId_idx" ON "appointment_reminders"("appointmentId");

-- CreateIndex
CREATE INDEX "followup_logs_leadId_idx" ON "followup_logs"("leadId");

-- CreateIndex
CREATE INDEX "followup_logs_sentAt_idx" ON "followup_logs"("sentAt");

-- CreateIndex
CREATE INDEX "debug_logs_phone_idx" ON "debug_logs"("phone");

-- CreateIndex
CREATE INDEX "debug_logs_conversationId_idx" ON "debug_logs"("conversationId");

-- CreateIndex
CREATE INDEX "debug_logs_organizationId_idx" ON "debug_logs"("organizationId");

-- CreateIndex
CREATE INDEX "debug_logs_createdAt_idx" ON "debug_logs"("createdAt");

-- CreateIndex
CREATE INDEX "crm_configs_organizationId_idx" ON "crm_configs"("organizationId");

-- CreateIndex
CREATE INDEX "crm_automations_crmConfigId_idx" ON "crm_automations"("crmConfigId");

-- CreateIndex
CREATE INDEX "crm_automations_agentStateId_idx" ON "crm_automations"("agentStateId");

-- CreateIndex
CREATE UNIQUE INDEX "automation_logs_automationId_conversationId_leadMessageId_key" ON "automation_logs"("automationId", "conversationId", "leadMessageId");

-- CreateIndex
CREATE UNIQUE INDEX "automation_logs_agentFollowUpId_conversationId_leadMessageI_key" ON "automation_logs"("agentFollowUpId", "conversationId", "leadMessageId");

-- CreateIndex
CREATE INDEX "agent_followups_agentId_idx" ON "agent_followups"("agentId");

-- CreateIndex
CREATE INDEX "agent_followups_agentStateId_idx" ON "agent_followups"("agentStateId");

-- CreateIndex
CREATE INDEX "agent_followups_crmStageId_idx" ON "agent_followups"("crmStageId");

-- CreateIndex
CREATE INDEX "agent_notifications_agentId_idx" ON "agent_notifications"("agentId");

-- CreateIndex
CREATE INDEX "agent_notifications_agentStateId_idx" ON "agent_notifications"("agentStateId");

-- CreateIndex
CREATE INDEX "quick_responses_organizationId_idx" ON "quick_responses"("organizationId");

-- CreateIndex
CREATE INDEX "_ConversationTags_B_index" ON "_ConversationTags"("B");

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocked_slots" ADD CONSTRAINT "blocked_slots_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agents" ADD CONSTRAINT "agents_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agents" ADD CONSTRAINT "agents_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge" ADD CONSTRAINT "knowledge_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge" ADD CONSTRAINT "knowledge_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_chunks" ADD CONSTRAINT "knowledge_chunks_knowledgeId_fkey" FOREIGN KEY ("knowledgeId") REFERENCES "knowledge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "followups" ADD CONSTRAINT "followups_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "followups" ADD CONSTRAINT "followups_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tags" ADD CONSTRAINT "tags_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memory" ADD CONSTRAINT "memory_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback_responses" ADD CONSTRAINT "feedback_responses_feedbackId_fkey" FOREIGN KEY ("feedbackId") REFERENCES "feedback"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "response_templates" ADD CONSTRAINT "response_templates_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flow_rules" ADD CONSTRAINT "flow_rules_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "states" ADD CONSTRAINT "states_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "states" ADD CONSTRAINT "states_crmStageId_fkey" FOREIGN KEY ("crmStageId") REFERENCES "crm_stages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "states" ADD CONSTRAINT "states_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_stages" ADD CONSTRAINT "crm_stages_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_stages" ADD CONSTRAINT "crm_stages_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auto_scheduling_configs" ADD CONSTRAINT "auto_scheduling_configs_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auto_scheduling_configs" ADD CONSTRAINT "auto_scheduling_configs_crmStageId_fkey" FOREIGN KEY ("crmStageId") REFERENCES "crm_stages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auto_scheduling_configs" ADD CONSTRAINT "auto_scheduling_configs_moveToStageId_fkey" FOREIGN KEY ("moveToStageId") REFERENCES "crm_stages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_reminder_configs" ADD CONSTRAINT "appointment_reminder_configs_autoSchedulingConfigId_fkey" FOREIGN KEY ("autoSchedulingConfigId") REFERENCES "auto_scheduling_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_webhooks" ADD CONSTRAINT "crm_webhooks_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_webhook_logs" ADD CONSTRAINT "crm_webhook_logs_webhookId_fkey" FOREIGN KEY ("webhookId") REFERENCES "crm_webhooks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reminder_logs" ADD CONSTRAINT "reminder_logs_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_reminders" ADD CONSTRAINT "appointment_reminders_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "followup_logs" ADD CONSTRAINT "followup_logs_followupId_fkey" FOREIGN KEY ("followupId") REFERENCES "followups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "followup_logs" ADD CONSTRAINT "followup_logs_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_configs" ADD CONSTRAINT "crm_configs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_automations" ADD CONSTRAINT "crm_automations_agentStateId_fkey" FOREIGN KEY ("agentStateId") REFERENCES "states"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_automations" ADD CONSTRAINT "crm_automations_crmConfigId_fkey" FOREIGN KEY ("crmConfigId") REFERENCES "crm_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_automations" ADD CONSTRAINT "crm_automations_crmStageId_fkey" FOREIGN KEY ("crmStageId") REFERENCES "crm_stages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_logs" ADD CONSTRAINT "automation_logs_agentFollowUpId_fkey" FOREIGN KEY ("agentFollowUpId") REFERENCES "agent_followups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_logs" ADD CONSTRAINT "automation_logs_automationId_fkey" FOREIGN KEY ("automationId") REFERENCES "crm_automations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_logs" ADD CONSTRAINT "automation_logs_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_followups" ADD CONSTRAINT "agent_followups_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_followups" ADD CONSTRAINT "agent_followups_agentStateId_fkey" FOREIGN KEY ("agentStateId") REFERENCES "states"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_followups" ADD CONSTRAINT "agent_followups_crmStageId_fkey" FOREIGN KEY ("crmStageId") REFERENCES "crm_stages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_notifications" ADD CONSTRAINT "agent_notifications_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_notifications" ADD CONSTRAINT "agent_notifications_agentStateId_fkey" FOREIGN KEY ("agentStateId") REFERENCES "states"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quick_responses" ADD CONSTRAINT "quick_responses_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ConversationTags" ADD CONSTRAINT "_ConversationTags_A_fkey" FOREIGN KEY ("A") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ConversationTags" ADD CONSTRAINT "_ConversationTags_B_fkey" FOREIGN KEY ("B") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
