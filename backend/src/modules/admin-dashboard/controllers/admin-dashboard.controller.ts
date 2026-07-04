import { Controller, Get, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../../auth/guards/admin.guard';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AdminDashboardOverview } from '../types/admin-dashboard.types';
import { AdminKpiService } from '../services/admin-kpi.service';

/**
 * Admin dashboard overview controller.
 */
@Controller('admin/dashboard')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminDashboardController {
  constructor(private readonly adminKpiService: AdminKpiService) {}

  /**
   * Returns professional KPI cards and top providers for the admin overview.
   *
   * @returns Dashboard overview payload.
   */
  @Get('overview')
  async getOverview(): Promise<AdminDashboardOverview> {
    return this.adminKpiService.getOverview();
  }
}
