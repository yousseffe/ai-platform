import { Controller, Get, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../../../shared/guards/admin.guard';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { AdminDashboardOverview } from '../types/admin-dashboard.types';
import { AdminKpiService } from '../services/admin-kpi.service';

@Controller('admin/dashboard')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminDashboardController {
  constructor(private readonly adminKpiService: AdminKpiService) {}

  @Get('overview')
  async getOverview(): Promise<AdminDashboardOverview> {
    return this.adminKpiService.getOverview();
  }
}
