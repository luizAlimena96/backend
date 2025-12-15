import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { DashboardService } from "./dashboard.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@Controller("dashboard")
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private dashboardService: DashboardService) { }

  @Get("metrics")
  async getMetrics(@Query("organizationId") organizationId: string) {
    return this.dashboardService.getMetrics(organizationId);
  }

  @Get("performance")
  async getPerformance(@Query("organizationId") organizationId: string) {
    return this.dashboardService.getPerformance(organizationId);
  }

  @Get("activities")
  async getActivities(@Query("organizationId") organizationId: string) {
    return this.dashboardService.getActivities(organizationId);
  }
}
