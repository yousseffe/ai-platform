import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { BatchLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

const otelEndpoint =
  process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318';

// Create a Prometheus exporter to expose self metrics
const prometheusExporter = new PrometheusExporter(
  {
    port: 9464,
  },
  () => {
    console.log('Prometheus metrics exporter started on port 9464');
  },
);

const sdk = new NodeSDK({
  resource: resourceFromAttributes({
    [SemanticResourceAttributes.SERVICE_NAME]: 'ai-platform-backend',
  }),
  traceExporter: new OTLPTraceExporter({
    url: `${otelEndpoint}/v1/traces`,
  }),
  // Batched export instead of per-record synchronous export: avoids blocking
  // the event loop on every log line, which is especially noticeable during
  // build jobs that emit 100+ log lines in quick succession. Trade-off: up to
  // ~5s of buffered logs may be lost on an ungraceful shutdown.
  logRecordProcessor: new BatchLogRecordProcessor(
    new OTLPLogExporter({
      url: `${otelEndpoint}/v1/logs`,
    }),
  ),
  metricReader: prometheusExporter,
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-fs': {
        enabled: false,
      },
    }),
  ],
});

// Start the SDK and then boot the application
sdk.start();
console.log('OpenTelemetry SDK initialized');

// Gracefully shut down the SDK on process exit
process.on('SIGTERM', () => {
  sdk
    .shutdown()
    .then(() => console.log('OTel SDK shut down successfully'))
    .catch((err) => console.log('Error shutting down OTel SDK', err))
    .finally(() => process.exit(0));
});

// Now import the main entry point to start the NestJS application
import './main';
