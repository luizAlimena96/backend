import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards, Request, Inject } from "@nestjs/common";
import { AgentsService } from "./agents.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PrismaService } from "../database/prisma.service";

@Controller("agents")
@UseGuards(JwtAuthGuard)
export class AgentsController {
  constructor(
    private agentsService: AgentsService,
    @Inject(PrismaService) private prisma: PrismaService
  ) { }

  // ============================================
  // BASIC CRUD
  // ============================================

  @Get()
  async findAll(@Query("organizationId") queryOrgId?: string, @Request() req?) {
    // Use query param if provided, otherwise use user's organizationId
    const organizationId = queryOrgId || req?.user?.organizationId;

    console.log(`[AgentsController] findAll - queryOrgId: ${queryOrgId}, user.organizationId: ${req?.user?.organizationId}, using: ${organizationId}`);

    return this.agentsService.findAll(organizationId);
  }

  @Get(":id")
  async findOne(@Param("id") id: string, @Query("include") include?: string) {
    return this.agentsService.findOne(id, include);
  }

  @Post()
  async create(@Body() data: any, @Request() req) {
    // Use organizationId from body (frontend sends it) or fallback to user's org
    const organizationId = data.organizationId || req.user.organizationId;
    return this.agentsService.create(data, req.user.id, organizationId);
  }

  @Put(":id")
  async update(@Param("id") id: string, @Body() data: any) {
    return this.agentsService.update(id, data);
  }

  @Delete(":id")
  async delete(@Param("id") id: string) {
    return this.agentsService.delete(id);
  }

  // ============================================
  // ZAPSIGN CONFIG
  // ============================================

  @Get(":id/zapsign-config")
  async getZapSignConfig(@Param("id") id: string) {
    const agent = await this.agentsService.findOne(id);
    return {
      zapSignFieldMapping: agent.zapSignFieldMapping,
      zapSignTriggerCrmStageId: agent.zapSignTriggerCrmStageId,
    };
  }

  @Post(":id/zapsign-config")
  async saveZapSignConfig(
    @Param("id") id: string,
    @Body() data: { fieldMapping: any; triggerCrmStageId: string }
  ) {
    return this.agentsService.update(id, {
      zapSignFieldMapping: data.fieldMapping,
      zapSignTriggerCrmStageId: data.triggerCrmStageId,
    });
  }

  // ============================================
  // FSM PROMPTS
  // ============================================

  @Get(":id/fsm-prompts")
  async getFsmPrompts(@Param("id") id: string) {
    const agent = await this.agentsService.findOne(id);
    return {
      dataExtractor: agent.fsmDataExtractorPrompt,
      stateDecider: agent.fsmStateDeciderPrompt,
      validator: agent.fsmValidatorPrompt,
    };
  }

  @Put(":id/fsm-prompts")
  async updateFsmPrompts(
    @Param("id") id: string,
    @Body() data: { dataExtractor: string; stateDecider: string; validator: string }
  ) {
    return this.agentsService.update(id, {
      fsmDataExtractorPrompt: data.dataExtractor,
      fsmStateDeciderPrompt: data.stateDecider,
      fsmValidatorPrompt: data.validator,
    });
  }

  // ============================================
  // CRM STAGES
  // ============================================

  @Get(":id/crm-stages")
  async getCrmStages(@Param("id") id: string) {
    return this.prisma.cRMStage.findMany({
      where: { agentId: id },
      include: {
        states: {
          select: { id: true, name: true, order: true },
          orderBy: { order: "asc" },
        },
      },
      orderBy: { order: "asc" },
    });
  }

  @Post(":id/crm-stages")
  async createCrmStage(
    @Param("id") id: string,
    @Body() data: any,
    @Request() req
  ) {
    const agent = await this.agentsService.findOne(id);
    return this.prisma.cRMStage.create({
      data: {
        name: data.name,
        description: data.description,
        color: data.color,
        order: data.order,
        agentId: id,
        organizationId: agent.organizationId,
      },
    });
  }

  @Put(":agentId/crm-stages/:stageId")
  async updateCrmStage(
    @Param("agentId") agentId: string,
    @Param("stageId") stageId: string,
    @Body() data: any
  ) {
    // Update stage
    const stage = await this.prisma.cRMStage.update({
      where: { id: stageId },
      data: {
        name: data.name,
        description: data.description,
        color: data.color,
      },
    });

    // Update state associations
    if (data.stateIds) {
      await this.prisma.state.updateMany({
        where: { crmStageId: stageId },
        data: { crmStageId: null },
      });

      await this.prisma.state.updateMany({
        where: { id: { in: data.stateIds } },
        data: { crmStageId: stageId },
      });
    }

    return stage;
  }

  @Delete(":agentId/crm-stages/:stageId")
  async deleteCrmStage(
    @Param("agentId") agentId: string,
    @Param("stageId") stageId: string
  ) {
    return this.prisma.cRMStage.delete({
      where: { id: stageId },
    });
  }

  @Post(":id/crm-stages/reorder")
  async reorderCrmStages(
    @Param("id") id: string,
    @Body() data: { stages: Array<{ id: string; order: number }> }
  ) {
    await Promise.all(
      data.stages.map((stage) =>
        this.prisma.cRMStage.update({
          where: { id: stage.id },
          data: { order: stage.order },
        })
      )
    );
    return { success: true };
  }

  // ============================================
  // AUTO SCHEDULING
  // ============================================

  @Get(":id/auto-scheduling")
  async getAutoSchedulingConfigs(@Param("id") id: string) {
    return this.prisma.autoSchedulingConfig.findMany({
      where: { agentId: id },
      include: {
        crmStage: { select: { id: true, name: true, color: true } },
        moveToStage: { select: { id: true, name: true, color: true } },
        reminders: { orderBy: { minutesBefore: "desc" } },
      },
    });
  }

  @Post(":id/auto-scheduling")
  async createAutoSchedulingConfig(
    @Param("id") id: string,
    @Body() data: any
  ) {
    const teamPhones = typeof data.teamPhones === 'string'
      ? data.teamPhones.split(',').map(p => p.trim()).filter(p => p)
      : (Array.isArray(data.teamPhones) ? data.teamPhones : []);

    return this.prisma.autoSchedulingConfig.create({
      data: {
        agentId: id,
        crmStageId: data.crmStageId,
        duration: Number(data.duration),
        minAdvanceHours: Number(data.minAdvanceHours),
        preferredTime: data.preferredTime,
        daysOfWeek: data.daysOfWeek,
        messageTemplate: data.messageTemplate,
        autoConfirm: Boolean(data.autoConfirm),
        moveToStageId: data.moveToStageId || null,
        sendConfirmation: data.sendConfirmation !== undefined ? Boolean(data.sendConfirmation) : true,
        confirmationTemplate: data.confirmationTemplate,
        notifyTeam: Boolean(data.notifyTeam),
        teamPhones: teamPhones,
        cancellationTemplate: data.cancellationTemplate,
        reschedulingTemplate: data.reschedulingTemplate,
        isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
        reminderWindowStart: data.reminderWindowStart,
        reminderWindowEnd: data.reminderWindowEnd,
        reminders: {
          create: data.reminders?.map((r: any) => ({
            minutesBefore: Number(r.minutesBefore),
            sendToLead: Boolean(r.sendToLead),
            sendToTeam: Boolean(r.sendToTeam),
            additionalPhones: [],
            leadMessageTemplate: r.leadMessageTemplate,
            teamMessageTemplate: r.teamMessageTemplate,
            isActive: r.isActive !== undefined ? Boolean(r.isActive) : true
          }))
        }
      },
    });
  }

  @Put(":agentId/auto-scheduling/:configId")
  async updateAutoSchedulingConfig(
    @Param("agentId") agentId: string,
    @Param("configId") configId: string,
    @Body() data: any
  ) {
    // Transaction to handle reminders replacement
    return this.prisma.$transaction(async (tx) => {
      const teamPhones = typeof data.teamPhones === 'string'
        ? data.teamPhones.split(',').map(p => p.trim()).filter(p => p)
        : (Array.isArray(data.teamPhones) ? data.teamPhones : []);

      // 1. Update main config
      const updated = await tx.autoSchedulingConfig.update({
        where: { id: configId },
        data: {
          duration: Number(data.duration),
          minAdvanceHours: Number(data.minAdvanceHours),
          preferredTime: data.preferredTime,
          daysOfWeek: data.daysOfWeek,
          messageTemplate: data.messageTemplate,
          autoConfirm: Boolean(data.autoConfirm),
          moveToStageId: data.moveToStageId || null,
          sendConfirmation: data.sendConfirmation !== undefined ? Boolean(data.sendConfirmation) : true,
          confirmationTemplate: data.confirmationTemplate,
          notifyTeam: Boolean(data.notifyTeam),
          teamPhones: teamPhones,
          cancellationTemplate: data.cancellationTemplate,
          reschedulingTemplate: data.reschedulingTemplate,
          isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
          reminderWindowStart: data.reminderWindowStart,
          reminderWindowEnd: data.reminderWindowEnd,
        },
      });

      // 2. Handle reminders update (Replace All strategy for simplicity)
      if (data.reminders) {
        await tx.appointmentReminderConfig.deleteMany({
          where: { autoSchedulingConfigId: configId }
        });

        if (data.reminders.length > 0) {
          await tx.appointmentReminderConfig.createMany({
            data: data.reminders.map((r: any) => ({
              autoSchedulingConfigId: configId,
              minutesBefore: Number(r.minutesBefore),
              sendToLead: Boolean(r.sendToLead),
              sendToTeam: Boolean(r.sendToTeam),
              additionalPhones: [],
              leadMessageTemplate: r.leadMessageTemplate,
              teamMessageTemplate: r.teamMessageTemplate,
              isActive: r.isActive !== undefined ? Boolean(r.isActive) : true
            }))
          });
        }
      }

      return updated;
    });
  }

  @Delete(":agentId/auto-scheduling/:configId")
  async deleteAutoSchedulingConfig(
    @Param("agentId") agentId: string,
    @Param("configId") configId: string
  ) {
    return this.prisma.autoSchedulingConfig.delete({
      where: { id: configId },
    });
  }

  @Post(":id/auto-scheduling/test-slots")
  async testAvailableSlots(
    @Param("id") id: string,
    @Body() data: { date: string; duration: number }
  ) {
    // TODO: Implement actual slot testing logic
    // For now return mock data
    return {
      slots: [
        { start: "09:00", end: "10:00", available: true },
        { start: "10:00", end: "11:00", available: true },
        { start: "11:00", end: "12:00", available: false },
        { start: "14:00", end: "15:00", available: true },
        { start: "15:00", end: "16:00", available: true },
      ],
    };
  }

  // ============================================
  // APPOINTMENT REMINDERS
  // ============================================

  @Get(":agentId/auto-scheduling/:configId/reminders")
  async getReminders(
    @Param("agentId") agentId: string,
    @Param("configId") configId: string
  ) {
    return this.prisma.appointmentReminderConfig.findMany({
      where: { autoSchedulingConfigId: configId },
      orderBy: { minutesBefore: "desc" },
    });
  }

  @Post(":agentId/auto-scheduling/:configId/reminders")
  async createReminder(
    @Param("agentId") agentId: string,
    @Param("configId") configId: string,
    @Body() data: any
  ) {
    return this.prisma.appointmentReminderConfig.create({
      data: {
        autoSchedulingConfigId: configId,
        minutesBefore: data.minutesBefore,
        sendToLead: data.sendToLead,
        sendToTeam: data.sendToTeam,
        leadMessageTemplate: data.leadMessageTemplate,
        teamMessageTemplate: data.teamMessageTemplate,
        isActive: data.isActive,
      },
    });
  }

  @Put(":agentId/auto-scheduling/:configId/reminders/:reminderId")
  async updateReminder(
    @Param("agentId") agentId: string,
    @Param("configId") configId: string,
    @Param("reminderId") reminderId: string,
    @Body() data: any
  ) {
    return this.prisma.appointmentReminderConfig.update({
      where: { id: reminderId },
      data: {
        minutesBefore: data.minutesBefore,
        sendToLead: data.sendToLead,
        sendToTeam: data.sendToTeam,
        leadMessageTemplate: data.leadMessageTemplate,
        teamMessageTemplate: data.teamMessageTemplate,
        isActive: data.isActive,
      },
    });
  }

  @Delete(":agentId/auto-scheduling/:configId/reminders/:reminderId")
  async deleteReminder(
    @Param("agentId") agentId: string,
    @Param("configId") configId: string,
    @Param("reminderId") reminderId: string
  ) {
    return this.prisma.appointmentReminderConfig.delete({
      where: { id: reminderId },
    });
  }

  // ============================================
  // SCHEDULING RULES
  // ============================================

  @Get(":id/scheduling-rules")
  async getSchedulingRules(@Param("id") id: string) {
    console.log('[Agents] 📅 Getting scheduling rules for agent:', id);

    const agent = await this.agentsService.findOne(id);

    // Return scheduling-related settings from agent and organization
    const organization = await this.prisma.organization.findUnique({
      where: { id: agent.organizationId },
      select: { workingHours: true },
    });

    return {
      workingHours: organization?.workingHours || null,
      googleCalendarEnabled: agent.googleCalendarEnabled || false,
      googleCalendarId: agent.googleCalendarId || null,
      meetingDuration: agent.meetingDuration || 60,
      minMeetingDuration: agent.minMeetingDuration || 30,
      maxMeetingDuration: agent.maxMeetingDuration || 120,
      minAdvanceHours: agent.minAdvanceHours || 0,
      useCustomTimeWindows: agent.useCustomTimeWindows || false,
    };
  }

  @Put(":id/scheduling-rules")
  async updateSchedulingRules(
    @Param("id") id: string,
    @Body() data: {
      workingHours?: any;
      meetingDuration?: number;
      minMeetingDuration?: number;
      maxMeetingDuration?: number;
      minAdvanceHours?: number;
      useCustomTimeWindows?: boolean;
    }
  ) {
    console.log('[Agents] 📅 Updating scheduling rules for agent:', id, data);

    const agent = await this.agentsService.findOne(id);

    // Update agent scheduling settings
    const agentUpdates: any = {};
    if (data.meetingDuration !== undefined) agentUpdates.meetingDuration = data.meetingDuration;
    if (data.minMeetingDuration !== undefined) agentUpdates.minMeetingDuration = data.minMeetingDuration;
    if (data.maxMeetingDuration !== undefined) agentUpdates.maxMeetingDuration = data.maxMeetingDuration;
    if (data.minAdvanceHours !== undefined) agentUpdates.minAdvanceHours = data.minAdvanceHours;
    if (data.useCustomTimeWindows !== undefined) agentUpdates.useCustomTimeWindows = data.useCustomTimeWindows;

    if (Object.keys(agentUpdates).length > 0) {
      await this.agentsService.update(id, agentUpdates);
    }

    // Update organization working hours if provided
    if (data.workingHours !== undefined) {
      await this.prisma.organization.update({
        where: { id: agent.organizationId },
        data: { workingHours: data.workingHours },
      });
    }

    return { success: true, message: 'Scheduling rules updated successfully' };
  }
}
