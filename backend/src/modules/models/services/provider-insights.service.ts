import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ModelLog } from '../entities/model-log.entity';
import { SystemConfig } from '../../wallets/entities/system-config.entity';
import { OwnerType } from '../../../shared/enums/owner-type.enum';

interface ProviderScope {
  userId: string;
  workspaceId?: string;
  workspaceType?: OwnerType;
}

interface ScopeFilter {
  whereSql: string;
  params: unknown[];
}

interface SummaryRow {
  totalRequests: string;
  successfulRequests: string;
  failedRequests: string;
  grossCredits: string;
  estimatedRevenueEgp: string;
  averageLatencyMs: string;
  activeModels: string;
  activeTypes: string;
  activeTaskTypes: string;
}

interface SeriesRow {
  bucketDate: string;
  totalRequests: string;
  successfulRequests: string;
  failedRequests: string;
  grossCredits: string;
  estimatedRevenueEgp: string;
}

interface TopModelRow {
  modelId: string;
  modelName: string;
  type: string;
  taskType: string;
  framework: string;
  totalRequests: string;
  successfulRequests: string;
  failedRequests: string;
  grossCredits: string;
  estimatedRevenueEgp: string;
  averageLatencyMs: string;
}

interface BreakdownRow {
  label: string | null;
  totalRequests: string;
  successfulRequests: string;
  failedRequests: string;
  grossCredits: string;
  estimatedRevenueEgp: string;
}

export interface ProviderInsightsResponse {
  generatedAt: string;
  periodDays: number;
  creditsPerEgp: number;
  summary: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    grossCredits: number;
    estimatedRevenueEgp: number;
    averageLatencyMs: number;
    successRate: number;
    averageRevenuePerRequestEgp: number;
    activeModels: number;
    activeTypes: number;
    activeTaskTypes: number;
  };
  comparison: {
    current: {
      revenueEgp: number;
      requests: number;
      successRate: number;
    };
    previous: {
      revenueEgp: number;
      requests: number;
      successRate: number;
    };
    revenueDeltaPercent: number;
    requestsDeltaPercent: number;
    successRateDeltaPercent: number;
  };
  series: Array<{
    date: string;
    requests: number;
    successes: number;
    failures: number;
    grossCredits: number;
    revenueEgp: number;
    successRate: number;
  }>;
  topModels: Array<{
    modelId: string;
    modelName: string;
    type: string;
    taskType: string;
    framework: string;
    requests: number;
    successes: number;
    failures: number;
    grossCredits: number;
    revenueEgp: number;
    avgLatencyMs: number;
    successRate: number;
  }>;
  typeBreakdown: Array<{
    type: string;
    requests: number;
    successes: number;
    failures: number;
    grossCredits: number;
    revenueEgp: number;
    successRate: number;
  }>;
  taskBreakdown: Array<{
    taskType: string;
    requests: number;
    successes: number;
    failures: number;
    grossCredits: number;
    revenueEgp: number;
    successRate: number;
  }>;
}

@Injectable()
export class ProviderInsightsService {
  constructor(
    @InjectRepository(ModelLog)
    private readonly modelLogRepository: Repository<ModelLog>,
    @InjectRepository(SystemConfig)
    private readonly systemConfigRepository: Repository<SystemConfig>,
  ) {}

  async getInsights(
    scope: ProviderScope,
    days = 30,
  ): Promise<ProviderInsightsResponse> {
    const periodDays = this.clampDays(days);
    const creditsPerEgp = await this.resolveCreditsPerEgp();
    const now = new Date();
    const currentStart = this.startOfDay(this.addDays(now, -(periodDays - 1)));
    const previousStart = this.startOfDay(
      this.addDays(currentStart, -periodDays),
    );
    const previousEnd = new Date(currentStart.getTime() - 1);

    const [
      summaryRow,
      previousRow,
      seriesRows,
      topModelRows,
      typeRows,
      taskRows,
    ] = await Promise.all([
      this.getSummary(scope, currentStart, now, creditsPerEgp),
      this.getSummary(scope, previousStart, previousEnd, creditsPerEgp),
      this.getSeries(scope, currentStart, now, creditsPerEgp),
      this.getTopModels(scope, currentStart, now, creditsPerEgp),
      this.getBreakdown(
        scope,
        currentStart,
        now,
        creditsPerEgp,
        'model.type',
        'type',
      ),
      this.getBreakdown(
        scope,
        currentStart,
        now,
        creditsPerEgp,
        'model."taskType"',
        'taskType',
      ),
    ]);

    const summary = this.mapSummary(summaryRow);
    const previous = this.mapSummary(previousRow);

    return {
      generatedAt: now.toISOString(),
      periodDays,
      creditsPerEgp,
      summary: {
        ...summary,
        successRate: this.toPercent(
          summary.successfulRequests,
          summary.totalRequests,
        ),
        averageRevenuePerRequestEgp:
          summary.totalRequests > 0
            ? summary.estimatedRevenueEgp / summary.totalRequests
            : 0,
      },
      comparison: {
        current: {
          revenueEgp: summary.estimatedRevenueEgp,
          requests: summary.totalRequests,
          successRate: this.toPercent(
            summary.successfulRequests,
            summary.totalRequests,
          ),
        },
        previous: {
          revenueEgp: previous.estimatedRevenueEgp,
          requests: previous.totalRequests,
          successRate: this.toPercent(
            previous.successfulRequests,
            previous.totalRequests,
          ),
        },
        revenueDeltaPercent: this.computeDeltaPercent(
          summary.estimatedRevenueEgp,
          previous.estimatedRevenueEgp,
        ),
        requestsDeltaPercent: this.computeDeltaPercent(
          summary.totalRequests,
          previous.totalRequests,
        ),
        successRateDeltaPercent:
          this.toPercent(summary.successfulRequests, summary.totalRequests) -
          this.toPercent(previous.successfulRequests, previous.totalRequests),
      },
      series: this.fillSeries(periodDays, currentStart, seriesRows),
      topModels: topModelRows.map((row) => {
        const requests = this.toNumber(row.totalRequests);
        const successes = this.toNumber(row.successfulRequests);
        const failures = this.toNumber(row.failedRequests);
        return {
          modelId: row.modelId,
          modelName: row.modelName,
          type: row.type || 'UNKNOWN',
          taskType: row.taskType || 'OTHER',
          framework: row.framework || 'CUSTOM',
          requests,
          successes,
          failures,
          grossCredits: this.toNumber(row.grossCredits),
          revenueEgp: this.toNumber(row.estimatedRevenueEgp),
          avgLatencyMs: this.toNumber(row.averageLatencyMs),
          successRate: this.toPercent(successes, requests),
        };
      }),
      typeBreakdown: typeRows.map((row) => this.mapTypeBreakdown(row)),
      taskBreakdown: taskRows.map((row) => this.mapTaskBreakdown(row)),
    };
  }

  private async getSummary(
    scope: ProviderScope,
    start: Date,
    end: Date,
    creditsPerEgp: number,
  ): Promise<SummaryRow> {
    const scopeFilter = this.createScopeFilter(scope);
    const startParam = scopeFilter.params.length + 1;
    const endParam = startParam + 1;
    const creditsParam = endParam + 1;

    const rows = await this.queryRows<SummaryRow>(
      `
        SELECT
          COUNT(log.id) AS "totalRequests",
          SUM(CASE WHEN log.status = 'SUCCESS' THEN 1 ELSE 0 END) AS "successfulRequests",
          SUM(CASE WHEN log.status = 'FAILED' THEN 1 ELSE 0 END) AS "failedRequests",
          COALESCE(SUM(log.credits_charged), 0) AS "grossCredits",
          COALESCE(${this.revenueExpression(`$${creditsParam}`)}, 0) AS "estimatedRevenueEgp",
          COALESCE(AVG(log.response_time_ms), 0) AS "averageLatencyMs",
          COUNT(DISTINCT model.id) AS "activeModels",
          COUNT(DISTINCT model.type) AS "activeTypes",
          COUNT(DISTINCT model."taskType") AS "activeTaskTypes"
        FROM model_logs log
        INNER JOIN models model ON model.id = log.model_id
        WHERE ${scopeFilter.whereSql}
          AND log.created_at BETWEEN $${startParam} AND $${endParam}
      `,
      [...scopeFilter.params, start, end, creditsPerEgp],
    );

    const row = rows[0] as SummaryRow | undefined;

    return (
      row ?? {
        totalRequests: '0',
        successfulRequests: '0',
        failedRequests: '0',
        grossCredits: '0',
        estimatedRevenueEgp: '0',
        averageLatencyMs: '0',
        activeModels: '0',
        activeTypes: '0',
        activeTaskTypes: '0',
      }
    );
  }

  private async getSeries(
    scope: ProviderScope,
    start: Date,
    end: Date,
    creditsPerEgp: number,
  ): Promise<SeriesRow[]> {
    const scopeFilter = this.createScopeFilter(scope);
    const startParam = scopeFilter.params.length + 1;
    const endParam = startParam + 1;
    const creditsParam = endParam + 1;

    return this.queryRows<SeriesRow>(
      `
        SELECT
          DATE_TRUNC('day', log.created_at) AS "bucketDate",
          COUNT(log.id) AS "totalRequests",
          SUM(CASE WHEN log.status = 'SUCCESS' THEN 1 ELSE 0 END) AS "successfulRequests",
          SUM(CASE WHEN log.status = 'FAILED' THEN 1 ELSE 0 END) AS "failedRequests",
          COALESCE(SUM(log.credits_charged), 0) AS "grossCredits",
          COALESCE(${this.revenueExpression(`$${creditsParam}`)}, 0) AS "estimatedRevenueEgp"
        FROM model_logs log
        INNER JOIN models model ON model.id = log.model_id
        WHERE ${scopeFilter.whereSql}
          AND log.created_at BETWEEN $${startParam} AND $${endParam}
        GROUP BY DATE_TRUNC('day', log.created_at)
        ORDER BY DATE_TRUNC('day', log.created_at) ASC
      `,
      [...scopeFilter.params, start, end, creditsPerEgp],
    );
  }

  private async getTopModels(
    scope: ProviderScope,
    start: Date,
    end: Date,
    creditsPerEgp: number,
  ): Promise<TopModelRow[]> {
    const scopeFilter = this.createScopeFilter(scope);
    const startParam = scopeFilter.params.length + 1;
    const endParam = startParam + 1;
    const creditsParam = endParam + 1;

    return this.queryRows<TopModelRow>(
      `
        SELECT
          model.id AS "modelId",
          model.name AS "modelName",
          model.type AS "type",
          model."taskType" AS "taskType",
          model.framework AS "framework",
          COUNT(log.id) AS "totalRequests",
          SUM(CASE WHEN log.status = 'SUCCESS' THEN 1 ELSE 0 END) AS "successfulRequests",
          SUM(CASE WHEN log.status = 'FAILED' THEN 1 ELSE 0 END) AS "failedRequests",
          COALESCE(SUM(log.credits_charged), 0) AS "grossCredits",
          COALESCE(${this.revenueExpression(`$${creditsParam}`)}, 0) AS "estimatedRevenueEgp",
          COALESCE(AVG(log.response_time_ms), 0) AS "averageLatencyMs"
        FROM model_logs log
        INNER JOIN models model ON model.id = log.model_id
        WHERE ${scopeFilter.whereSql}
          AND log.created_at BETWEEN $${startParam} AND $${endParam}
        GROUP BY model.id, model.name, model.type, model."taskType", model.framework
        ORDER BY "estimatedRevenueEgp" DESC, "totalRequests" DESC
        LIMIT 6
      `,
      [...scopeFilter.params, start, end, creditsPerEgp],
    );
  }

  private async getBreakdown(
    scope: ProviderScope,
    start: Date,
    end: Date,
    creditsPerEgp: number,
    columnExpression: string,
    alias: string,
  ): Promise<BreakdownRow[]> {
    const scopeFilter = this.createScopeFilter(scope);
    const startParam = scopeFilter.params.length + 1;
    const endParam = startParam + 1;
    const creditsParam = endParam + 1;
    const rows = await this.queryRows<BreakdownRow>(
      `
        SELECT
          COALESCE(${columnExpression}, 'UNKNOWN') AS "label",
          COUNT(log.id) AS "totalRequests",
          SUM(CASE WHEN log.status = 'SUCCESS' THEN 1 ELSE 0 END) AS "successfulRequests",
          SUM(CASE WHEN log.status = 'FAILED' THEN 1 ELSE 0 END) AS "failedRequests",
          COALESCE(SUM(log.credits_charged), 0) AS "grossCredits",
          COALESCE(${this.revenueExpression(`$${creditsParam}`)}, 0) AS "estimatedRevenueEgp"
        FROM model_logs log
        INNER JOIN models model ON model.id = log.model_id
        WHERE ${scopeFilter.whereSql}
          AND log.created_at BETWEEN $${startParam} AND $${endParam}
        GROUP BY COALESCE(${columnExpression}, 'UNKNOWN')
        ORDER BY "estimatedRevenueEgp" DESC, "totalRequests" DESC
        LIMIT 6
      `,
      [...scopeFilter.params, start, end, creditsPerEgp],
    );

    return rows
      .filter((row) => row.label !== null)
      .map((row) => ({
        ...row,
        label: row.label || alias.toUpperCase(),
      }));
  }

  private fillSeries(
    periodDays: number,
    start: Date,
    rows: SeriesRow[],
  ): ProviderInsightsResponse['series'] {
    const seriesMap = new Map(
      rows.map((row) => [
        this.dateKey(new Date(row.bucketDate)),
        {
          requests: this.toNumber(row.totalRequests),
          successes: this.toNumber(row.successfulRequests),
          failures: this.toNumber(row.failedRequests),
          grossCredits: this.toNumber(row.grossCredits),
          revenueEgp: this.toNumber(row.estimatedRevenueEgp),
        },
      ]),
    );

    return Array.from({ length: periodDays }, (_, index) => {
      const date = this.addDays(start, index);
      const key = this.dateKey(date);
      const point = seriesMap.get(key) ?? {
        requests: 0,
        successes: 0,
        failures: 0,
        grossCredits: 0,
        revenueEgp: 0,
      };

      return {
        date: key,
        ...point,
        successRate: this.toPercent(point.successes, point.requests),
      };
    });
  }

  private mapSummary(row: SummaryRow) {
    return {
      totalRequests: this.toNumber(row.totalRequests),
      successfulRequests: this.toNumber(row.successfulRequests),
      failedRequests: this.toNumber(row.failedRequests),
      grossCredits: this.toNumber(row.grossCredits),
      estimatedRevenueEgp: this.toNumber(row.estimatedRevenueEgp),
      averageLatencyMs: this.toNumber(row.averageLatencyMs),
      activeModels: this.toNumber(row.activeModels),
      activeTypes: this.toNumber(row.activeTypes),
      activeTaskTypes: this.toNumber(row.activeTaskTypes),
    };
  }

  private mapTypeBreakdown(
    row: BreakdownRow,
  ): ProviderInsightsResponse['typeBreakdown'][number] {
    const requests = this.toNumber(row.totalRequests);
    const successes = this.toNumber(row.successfulRequests);
    const failures = this.toNumber(row.failedRequests);

    return {
      type: row.label || 'UNKNOWN',
      requests,
      successes,
      failures,
      grossCredits: this.toNumber(row.grossCredits),
      revenueEgp: this.toNumber(row.estimatedRevenueEgp),
      successRate: this.toPercent(successes, requests),
    };
  }

  private mapTaskBreakdown(
    row: BreakdownRow,
  ): ProviderInsightsResponse['taskBreakdown'][number] {
    const requests = this.toNumber(row.totalRequests);
    const successes = this.toNumber(row.successfulRequests);
    const failures = this.toNumber(row.failedRequests);

    return {
      taskType: row.label || 'UNKNOWN',
      requests,
      successes,
      failures,
      grossCredits: this.toNumber(row.grossCredits),
      revenueEgp: this.toNumber(row.estimatedRevenueEgp),
      successRate: this.toPercent(successes, requests),
    };
  }

  private async resolveCreditsPerEgp(): Promise<number> {
    const egpConfig = await this.systemConfigRepository.findOne({
      where: { key: 'credits_per_egp' },
    });
    const usdFallback = !egpConfig
      ? await this.systemConfigRepository.findOne({
          where: { key: 'credits_per_usd' },
        })
      : null;

    const resolved = Number(egpConfig?.value ?? usdFallback?.value ?? 10);
    return Number.isFinite(resolved) && resolved > 0 ? resolved : 10;
  }

  private createScopeFilter(scope: ProviderScope): ScopeFilter {
    if (scope.workspaceType === OwnerType.ORG && scope.workspaceId) {
      return {
        whereSql: 'model."organizationId" = $1',
        params: [scope.workspaceId],
      };
    }

    return {
      whereSql: 'model."userId" = $1',
      params: [scope.userId],
    };
  }

  private revenueExpression(creditsPerEgpParam: string) {
    return `SUM((COALESCE(log.credits_charged, 0) / ${creditsPerEgpParam}) * (COALESCE(model.provider_share_percent, 80) / 100.0))`;
  }

  private async queryRows<T>(sql: string, params: unknown[]): Promise<T[]> {
    const rows: unknown = await this.modelLogRepository.manager.query(
      sql,
      params,
    );
    return Array.isArray(rows) ? (rows as T[]) : [];
  }

  private clampDays(days: number) {
    if (!Number.isFinite(days)) {
      return 30;
    }

    return Math.min(90, Math.max(7, Math.round(days)));
  }

  private addDays(date: Date, days: number) {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
  }

  private startOfDay(date: Date) {
    const next = new Date(date);
    next.setHours(0, 0, 0, 0);
    return next;
  }

  private computeDeltaPercent(current: number, previous: number) {
    if (previous === 0) {
      return current > 0 ? 100 : 0;
    }

    return ((current - previous) / previous) * 100;
  }

  private toPercent(value: number, total: number) {
    if (!total) {
      return 0;
    }

    return (value / total) * 100;
  }

  private toNumber(value: string | number | null | undefined) {
    const parsed = typeof value === 'number' ? value : Number(value ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private dateKey(date: Date) {
    return date.toISOString().slice(0, 10);
  }
}
