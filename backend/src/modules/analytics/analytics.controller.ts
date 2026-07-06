import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
  Req,
  ForbiddenException,
  NotFoundException,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, MoreThanOrEqual } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ApiKeyOrJwtGuard } from '../../shared/guards/api-key-or-jwt.guard';
import { AdminGuard } from '../../shared/guards/admin.guard';
import { DeploymentStatus } from '../deployments';
import { Deployment } from '../deployments/entities/deployment.entity';
import { Model } from '../models/entities/model.entity';
import { ModelLog } from '../models/entities/model-log.entity';
import { Alert } from './entities/alert.entity';
import * as Docker from 'dockerode';
import { getDockerOptions } from '../../shared/docker/docker.util';

interface LogEntry {
  timestamp: string;
  line: string;
  stream?: string;
}

interface SpanEntry {
  traceId: string;
  spanId?: string;
  service: string;
  name: string;
  timestampNs: number;
  durationMs: number;
  offsetMs: number;
  status: string;
  attributes: Record<string, unknown>;
}

interface PrometheusResponse {
  status: string;
  data: {
    resultType: string;
    result: Array<{
      metric: Record<string, string>;
      value: [number, string];
    }>;
  };
}

interface LokiResponse {
  status: string;
  data: {
    resultType: string;
    result: Array<{
      stream: {
        container_id?: string;
        job?: string;
        [key: string]: string | undefined;
      };
      values: Array<[string, string]>;
    }>;
  };
}

@Controller('analytics')
export class AnalyticsController {
  private readonly logger = new Logger(AnalyticsController.name);
  private readonly prometheusUrl =
    process.env.PROMETHEUS_URL || 'http://localhost:9090';
  private readonly lokiUrl = process.env.LOKI_URL || 'http://localhost:3100';
  private readonly docker: Docker;

  constructor(
    private readonly httpService: HttpService,
    private readonly dataSource: DataSource,
    @InjectRepository(Deployment)
    private readonly deploymentsRepository: Repository<Deployment>,
    @InjectRepository(Alert)
    private readonly alertsRepository: Repository<Alert>,
    @InjectRepository(Model)
    private readonly modelsRepository: Repository<Model>,
  ) {
    this.docker = new Docker(getDockerOptions());
  }

  @Get('models/:id/metrics')
  @UseGuards(ApiKeyOrJwtGuard)
  async getModelMetrics(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: { user: { id: string; isAdmin?: boolean } },
  ) {
    const userId = req.user.id;
    const model = await this.modelsRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!model) {
      throw new NotFoundException('Model not found');
    }

    if (model.user?.id !== userId && !req.user.isAdmin) {
      throw new ForbiddenException('You do not own this model');
    }

    const deployment = await this.deploymentsRepository.findOne({
      where: {
        modelVersion: { model: { id } },
        status: DeploymentStatus.RUNNING,
      },
    });

    if (!deployment || !deployment.containerId) {
      return {
        cpuPercent: 0,
        ramMb: 0,
        latencyP50: 0,
        latencyP95: 0,
        requestRate: 0,
        errorRate: 0,
      };
    }

    let cpuPercent = 0;
    let ramMb = 0;

    const containerId = deployment.containerId;
    const shortContainerId = containerId.substring(0, 12);

    try {
      const cpuQuery = `sum(rate(container_cpu_usage_seconds_total{id=~".*${shortContainerId}.*"}[1m])) * 100`;
      const cpuRes = await this.queryPrometheus(cpuQuery);
      cpuPercent = parseFloat(cpuRes?.data?.result?.[0]?.value?.[1] || '0');

      const ramQuery = `container_memory_working_set_bytes{id=~".*${shortContainerId}.*"}`;
      const ramRes = await this.queryPrometheus(ramQuery);
      const ramBytes = parseFloat(ramRes?.data?.result?.[0]?.value?.[1] || '0');
      ramMb = parseFloat((ramBytes / 1024 / 1024).toFixed(2));
    } catch (err: unknown) {
      this.logger.warn(
        `cAdvisor Prometheus query failed: ${(err as Error).message}`,
      );
    }

    if (cpuPercent === 0 && ramMb === 0 && containerId) {
      try {
        const container = this.docker.getContainer(containerId);
        const stats = await container.stats({ stream: false });
        const cpuDelta =
          stats.cpu_stats.cpu_usage.total_usage -
          stats.precpu_stats.cpu_usage.total_usage;
        const systemDelta =
          stats.cpu_stats.system_cpu_usage -
          stats.precpu_stats.system_cpu_usage;
        const numCpus = stats.cpu_stats.online_cpus || 1;

        if (systemDelta > 0 && cpuDelta > 0) {
          cpuPercent = parseFloat(
            ((cpuDelta / systemDelta) * numCpus * 100).toFixed(1),
          );
        }
        const usageBytes = stats.memory_stats.usage || 0;
        ramMb = parseFloat((usageBytes / (1024 * 1024)).toFixed(2));
        this.logger.log(
          `Dockerode stats fallback used for container ${shortContainerId}: CPU=${cpuPercent}%, RAM=${ramMb}MB`,
        );
      } catch (err: unknown) {
        this.logger.warn(
          `Dockerode stats fallback failed: ${(err as Error).message}`,
        );
      }
    }

    let latencyP50 = 0;
    let latencyP95 = 0;
    let requestRate = 0;
    let errorRate = 0;

    try {
      const latencyP50Query = `histogram_quantile(0.50, sum(rate(http_server_duration_milliseconds_bucket{service_name=~".*${model.name.toLowerCase()}.*"}[5m])) by (le))`;
      const latencyP95Query = `histogram_quantile(0.95, sum(rate(http_server_duration_milliseconds_bucket{service_name=~".*${model.name.toLowerCase()}.*"}[5m])) by (le))`;
      const reqRateQuery = `sum(rate(http_server_duration_milliseconds_count{service_name=~".*${model.name.toLowerCase()}.*"}[5m]))`;
      const errorRateQuery = `sum(rate(http_server_duration_milliseconds_count{service_name=~".*${model.name.toLowerCase()}.*",status=~"5.."}[5m]))`;

      const [p50Res, p95Res, rateRes, errRes] = await Promise.all([
        this.queryPrometheus(latencyP50Query),
        this.queryPrometheus(latencyP95Query),
        this.queryPrometheus(reqRateQuery),
        this.queryPrometheus(errorRateQuery),
      ]);

      latencyP50 = parseFloat(p50Res?.data?.result?.[0]?.value?.[1] || '0');
      latencyP95 = parseFloat(p95Res?.data?.result?.[0]?.value?.[1] || '0');
      requestRate = parseFloat(rateRes?.data?.result?.[0]?.value?.[1] || '0');
      errorRate = parseFloat(errRes?.data?.result?.[0]?.value?.[1] || '0');
    } catch (err: unknown) {
      this.logger.warn(
        `OTel Prometheus query failed: ${(err as Error).message}`,
      );
    }

    if (requestRate === 0) {
      try {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const recentLogs = await this.dataSource.getRepository(ModelLog).find({
          where: {
            model: { id },
            createdAt: MoreThanOrEqual(fiveMinutesAgo),
          },
        });

        if (recentLogs.length > 0) {
          requestRate = parseFloat((recentLogs.length / (5 * 60)).toFixed(3)); // req/sec
          const failedLogsCount = recentLogs.filter(
            (l) => l.statusCode >= 400,
          ).length;
          errorRate = parseFloat((failedLogsCount / (5 * 60)).toFixed(3));

          const latencies = recentLogs
            .map((l) => l.responseTimeMs || 0)
            .sort((a, b) => a - b);
          latencyP50 = latencies[Math.floor(latencies.length * 0.5)];
          latencyP95 = latencies[Math.floor(latencies.length * 0.95)];
          this.logger.log(
            `PostgreSQL logs fallback used for model ${id}: Requests=${recentLogs.length}, P50=${latencyP50}ms`,
          );
        }
      } catch (err: unknown) {
        this.logger.warn(
          `PostgreSQL logs fallback failed: ${(err as Error).message}`,
        );
      }
    }

    return {
      cpuPercent,
      ramMb,
      latencyP50,
      latencyP95,
      requestRate,
      errorRate,
    };
  }
  @Get('models/:id/logs')
  @UseGuards(ApiKeyOrJwtGuard)
  async getModelLogs(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('limit') limit = '100',
    @Req() req: { user: { id: string; isAdmin?: boolean } },
  ) {
    const userId = req.user.id;
    const model = await this.modelsRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!model) {
      throw new NotFoundException('Model not found');
    }

    if (model.user.id !== userId && !req.user.isAdmin) {
      throw new ForbiddenException('You do not own this model');
    }

    const deployment = await this.deploymentsRepository.findOne({
      where: { modelVersion: { model: { id } } },
    });

    if (!deployment || !deployment.containerId) {
      return { logs: [] };
    }

    const shortId = deployment.containerId.substring(0, 12);
    try {
      // Query Loki for logs from this container ID
      const query = `{container_id=~".*${shortId}.*"}`;
      const url = `${this.lokiUrl}/loki/api/v1/query_range?query=${encodeURIComponent(query)}&limit=${limit}`;
      const response = await firstValueFrom(this.httpService.get(url));

      const logs: LogEntry[] = [];
      const data = response.data as unknown as LokiResponse;
      const streams = data?.data?.result || [];
      for (const stream of streams) {
        for (const val of stream.values || []) {
          logs.push({
            timestamp: new Date(parseInt(val[0]) / 1000000).toISOString(),
            line: val[1],
          });
        }
      }

      logs.sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      );
      return { logs };
    } catch (err: unknown) {
      this.logger.error(`Error querying Loki logs: ${(err as Error).message}`);
      return { logs: [], error: (err as Error).message };
    }
  }

  @Get('models/:id/request-history')
  @UseGuards(ApiKeyOrJwtGuard)
  async getModelRequestHistory(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('limit') limit = '50',
    @Req() req: { user: { id: string; isAdmin?: boolean } },
  ) {
    const userId = req.user.id;
    const model = await this.modelsRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!model) {
      throw new NotFoundException('Model not found');
    }

    if (model.user.id !== userId && !req.user.isAdmin) {
      throw new ForbiddenException('You do not own this model');
    }

    const logs = await this.dataSource.getRepository(ModelLog).find({
      where: { model: { id } },
      relations: ['user'],
      order: { createdAt: 'DESC' },
      take: Math.min(parseInt(limit, 10) || 50, 100),
    });

    return logs.map((l) => ({
      id: l.id,
      status: l.status,
      statusCode: l.statusCode,
      responseTimeMs: l.responseTimeMs,
      creditsCharged: Number(l.creditsCharged) || 0,
      requestSizeBytes: l.requestSizeBytes,
      responseSizeBytes: l.responseSizeBytes,
      ipAddress: l.ipAddress,
      createdAt: l.createdAt,
      caller: l.user
        ? l.user.email
        : l.apiKeyPrefix
          ? `Key: ${l.apiKeyPrefix}...`
          : 'Anonymous',
    }));
  }

  @Get('admin/metrics')
  @UseGuards(ApiKeyOrJwtGuard, AdminGuard)
  async getAdminMetrics() {
    try {
      const hostCpuQuery = `100 - (avg(rate(node_cpu_seconds_total{mode="idle"}[2m])) * 100)`;

      const hostRamQuery = `(node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes * 100`;

      const hostDiskQuery = `(node_filesystem_size_bytes{mountpoint="/"} - node_filesystem_free_bytes{mountpoint="/"}) / node_filesystem_size_bytes{mountpoint="/"} * 100`;

      const containerCountQuery = `count(container_last_seen{name=~".+"})`;

      const [cpuRes, ramRes, diskRes, containerRes] = await Promise.all([
        this.queryPrometheus(hostCpuQuery),
        this.queryPrometheus(hostRamQuery),
        this.queryPrometheus(hostDiskQuery),
        this.queryPrometheus(containerCountQuery),
      ]);

      const cpuUsage = parseFloat(cpuRes?.data?.result?.[0]?.value?.[1] || '0');
      const ramUsage = parseFloat(ramRes?.data?.result?.[0]?.value?.[1] || '0');
      const diskUsage = parseFloat(
        diskRes?.data?.result?.[0]?.value?.[1] || '0',
      );
      const activeContainers = parseInt(
        containerRes?.data?.result?.[0]?.value?.[1] || '0',
        10,
      );

      const totalDeployments = await this.deploymentsRepository.count();
      const runningDeployments = await this.deploymentsRepository.count({
        where: { status: DeploymentStatus.RUNNING },
      });

      return {
        hostCpu: parseFloat(cpuUsage.toFixed(2)),
        hostRam: parseFloat(ramUsage.toFixed(2)),
        hostDisk: parseFloat(diskUsage.toFixed(2)),
        activeContainers,
        totalDeployments,
        runningDeployments,
      };
    } catch (err: unknown) {
      this.logger.error(
        `Error querying Admin metrics: ${(err as Error).message}`,
      );
      return {
        hostCpu: 0,
        hostRam: 0,
        hostDisk: 0,
        activeContainers: 0,
        totalDeployments: 0,
        runningDeployments: 0,
        error: (err as Error).message,
      };
    }
  }

  @Get('admin/logs')
  @UseGuards(ApiKeyOrJwtGuard, AdminGuard)
  async getAdminLogs(
    @Query('service') service?: string,
    @Query('level') level?: string,
    @Query('limit') limit = '100',
  ) {
    try {
      const logqls: string[] = [];
      if (service) {
        if (service === 'fastapi') {
          logqls.push(
            `{container_name=~".+", container_name!~".*(postgres|redis|minio|gateway|loki|promtail|grafana|prometheus|alertmanager|cadvisor|node-exporter|otel-collector).*"}`,
          );
        } else {
          let searchPattern = service;
          if (service === 'nestjs') {
            searchPattern = 'backend';
          } else if (service === 'nginx') {
            searchPattern = 'gateway';
          }
          logqls.push(`{container_name=~".*${searchPattern}.*"}`);
          logqls.push(`{service_name=~".*${searchPattern}.*"}`);
        }
      } else {
        logqls.push(
          `{container_name=~".+", container_name!~".*(loki|promtail|grafana|prometheus|alertmanager|cadvisor|node-exporter|otel-collector).*"}`,
        );
        logqls.push(`{service_name=~".+"}`);
      }

      const logs: LogEntry[] = [];

      for (let logql of logqls) {
        if (level) {
          let severityPattern = level;
          if (level === 'warn') {
            severityPattern = 'warn.*';
          }
          logql += ` | json | severity =~ "(?i)${severityPattern}"`;
        }

        const url = `${this.lokiUrl}/loki/api/v1/query_range?query=${encodeURIComponent(logql)}&limit=${limit}`;
        try {
          const response = await firstValueFrom(this.httpService.get(url));
          const data = response.data as unknown as LokiResponse;
          const streams = data?.data?.result || [];
          for (const stream of streams) {
            for (const val of stream.values || []) {
              logs.push({
                timestamp: new Date(parseInt(val[0]) / 1000000).toISOString(),
                line: val[1],
                stream:
                  stream.stream.container_id || stream.stream.job || 'unknown',
              });
            }
          }
        } catch (queryErr: unknown) {
          this.logger.warn(
            `Failed to query Loki with LogQL "${logql}": ${(queryErr as Error).message}`,
          );
        }
      }

      logs.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      );
      const finalLogs = logs.slice(0, parseInt(limit, 10));
      return { logs: finalLogs };
    } catch (err: unknown) {
      this.logger.error(
        `Error querying Admin Loki logs: ${(err as Error).message}`,
      );
      return { logs: [], error: (err as Error).message };
    }
  }

  @Get('admin/traces/:traceId')
  @UseGuards(ApiKeyOrJwtGuard, AdminGuard)
  async getAdminTrace(@Param('traceId') traceId: string) {
    try {
      const spans: SpanEntry[] = [];

      // The OTel Winston transport injects `trace_id` (W3C field name).
      // The OTel Collector may use `traceid`. Try both JSON strategies plus
      // a raw line-contains fallback so we catch all log formats.
      const nowNs = BigInt(Date.now()) * 1_000_000n;
      const oneDayNs = 24n * 60n * 60n * 1_000_000_000n;
      const startNs = nowNs - oneDayNs;

      const strategies: Array<{ label: string; logql: string }> = [
        {
          label: 'trace_id (OTel Winston)',
          logql: `{container_name=~".+"} | json | trace_id = "${traceId}"`,
        },
        {
          label: 'trace_id (service_name label)',
          logql: `{service_name=~".+"} | json | trace_id = "${traceId}"`,
        },
        {
          label: 'traceid (OTel Collector)',
          logql: `{container_name=~".+"} | json | traceid = "${traceId}"`,
        },
        {
          label: 'line filter fallback',
          logql: `{container_name=~".+"} |= "${traceId}"`,
        },
      ];

      for (const strategy of strategies) {
        const url =
          `${this.lokiUrl}/loki/api/v1/query_range` +
          `?query=${encodeURIComponent(strategy.logql)}` +
          `&limit=200` +
          `&start=${startNs.toString()}` +
          `&end=${nowNs.toString()}` +
          `&direction=forward`;

        try {
          const response = await firstValueFrom(this.httpService.get(url));
          const data = response.data as unknown as LokiResponse;
          const streams = data?.data?.result || [];

          for (const stream of streams) {
            const service: string =
              stream.stream?.container_id || stream.stream?.job || 'unknown';

            for (const val of stream.values || []) {
              const timestampNs = parseInt(val[0]);
              const line = val[1];

              let span: SpanEntry;
              try {
                const parsed = JSON.parse(line);

                // Extract trace/span IDs — OTel Winston uses W3C snake_case
                const logTraceId =
                  parsed.trace_id ||
                  parsed.traceid ||
                  parsed['trace-id'] ||
                  parsed.attributes?.trace_id ||
                  parsed.attributes?.traceid;

                if (logTraceId && logTraceId !== traceId) continue;

                const spanId =
                  parsed.span_id ||
                  parsed.spanid ||
                  parsed['span-id'] ||
                  parsed.attributes?.span_id ||
                  parsed.attributes?.spanId;

                const durationMs = Number(
                  parsed.duration ||
                    parsed.durationMs ||
                    parsed.attributes?.duration_ms ||
                    parsed['duration_ms'] ||
                    0,
                );

                const rawMessage =
                  parsed.body ||
                  parsed.message ||
                  parsed.msg ||
                  parsed.Message ||
                  line;
                const context =
                  parsed.logger ||
                  parsed.context ||
                  parsed.attributes?.context ||
                  parsed.attributes?.logger ||
                  parsed.name;

                const severity = (
                  parsed.severity ||
                  parsed.level ||
                  parsed.Level ||
                  'info'
                )
                  .toString()
                  .toLowerCase()
                  .replace('warning', 'warn');

                span = {
                  traceId,
                  spanId,
                  service,
                  name: context ? `[${context}] ${rawMessage}` : rawMessage,
                  timestampNs,
                  durationMs,
                  offsetMs: 0,
                  status: severity === 'error' ? 'error' : 'success',
                  attributes: parsed.attributes || {},
                };
              } catch {
                if (!line.includes(traceId)) continue;
                span = {
                  traceId,
                  service,
                  name: line.length > 150 ? line.substring(0, 150) + '…' : line,
                  timestampNs,
                  durationMs: 0,
                  offsetMs: 0,
                  status: line.toLowerCase().includes('error')
                    ? 'error'
                    : 'success',
                  attributes: {},
                };
              }

              const isDupe = spans.some(
                (s) =>
                  s.timestampNs === span.timestampNs &&
                  s.service === span.service,
              );
              if (!isDupe) spans.push(span);
            }
          }

          if (spans.length > 0) break;
        } catch (lokiErr: unknown) {
          this.logger.warn(
            `Loki trace strategy "${strategy.label}" failed: ${(lokiErr as Error).message}`,
          );
        }
      }

      spans.sort((a, b) => a.timestampNs - b.timestampNs);

      if (spans.length > 0) {
        const firstTs = spans[0].timestampNs;
        const lastTs = spans[spans.length - 1].timestampNs;
        const totalNs = lastTs - firstTs || 1_000_000;

        for (const span of spans) {
          span.offsetMs = Math.round((span.timestampNs - firstTs) / 1_000_000);
          if (span.durationMs === 0) {
            // Give zero-duration spans a minimum visible slice
            span.durationMs = Math.max(
              1,
              Math.round(totalNs / spans.length / 1_000_000),
            );
          }
        }
      }

      this.logger.log(
        `Trace ${traceId}: resolved ${spans.length} span(s) from Loki`,
      );
      return { traceId, spans };
    } catch (err: unknown) {
      this.logger.error(
        `Error querying trace ${traceId}: ${(err as Error).message}`,
      );
      return { traceId, spans: [], error: (err as Error).message };
    }
  }

  @Get('admin/alerts')
  @UseGuards(ApiKeyOrJwtGuard, AdminGuard)
  async getAdminAlerts() {
    return this.alertsRepository.find({
      order: { receivedAt: 'DESC' },
    });
  }

  @Post('alerts/webhook')
  @HttpCode(HttpStatus.OK)
  async handleAlertmanagerWebhook(
    @Body()
    payload: {
      alerts?: Array<{
        labels?: Record<string, string>;
        annotations?: Record<string, string>;
        status?: string;
        startsAt?: string;
        endsAt?: string;
      }>;
    },
  ) {
    this.logger.log(
      `Received alerts webhook from Alertmanager: ${JSON.stringify(payload)}`,
    );

    const alertsList = payload.alerts || [];
    for (const alertData of alertsList) {
      try {
        const labels = alertData.labels || {};
        const annotations = alertData.annotations || {};
        const alertName = labels.alertname || 'UnknownAlert';
        const severity = labels.severity || 'warning';
        const status = alertData.status || 'firing';
        const summary =
          annotations.summary ||
          annotations.description ||
          'No description provided';
        const startsAt = alertData.startsAt
          ? new Date(alertData.startsAt)
          : new Date();
        const endsAt = alertData.endsAt ? new Date(alertData.endsAt) : null;

        // Check if alert already exists (update status)
        let alert = await this.alertsRepository.findOne({
          where: {
            alertName,
            startsAt,
          },
        });

        if (!alert) {
          alert = new Alert();
          alert.alertName = alertName;
          alert.startsAt = startsAt;
        }

        alert.severity = severity;
        alert.status = status;
        alert.summary = summary;
        alert.labels = labels;
        alert.endsAt = endsAt;

        await this.alertsRepository.save(alert);
        this.logger.log(
          `Successfully saved/updated alert: ${alertName} (${status})`,
        );
      } catch (err: unknown) {
        this.logger.error(
          `Failed to save alert item: ${(err as Error).message}`,
        );
      }
    }

    return { status: 'success' };
  }

  private async queryPrometheus(query: string): Promise<PrometheusResponse> {
    const url = `${this.prometheusUrl}/api/v1/query?query=${encodeURIComponent(query)}`;
    const response = await firstValueFrom(this.httpService.get(url));
    return response.data;
  }
}
