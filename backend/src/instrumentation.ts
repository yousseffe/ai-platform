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

sdk.start();
console.log('OpenTelemetry SDK initialized');

process.on('SIGTERM', () => {
  sdk
    .shutdown()
    .then(() => console.log('OTel SDK shut down successfully'))
    .catch((err) => console.log('Error shutting down OTel SDK', err))
    .finally(() => process.exit(0));
});

import './main';
