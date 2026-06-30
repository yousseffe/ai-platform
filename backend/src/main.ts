import * as dotenv from 'dotenv';
dotenv.config();

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import * as express from 'express';
import { join } from 'path';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import { OpenTelemetryTransportV3 } from '@opentelemetry/winston-transport';

import * as bodyParser from 'body-parser';
import * as cors from 'cors';

/**
 * Matches the public, API-key-authenticated prediction endpoints
 * (`/api/v1/models/:id/predict` and `/api/v1/models/:id/v:n/predict`).
 * These are called from arbitrary user origins, so they get open CORS.
 */
const PUBLIC_PREDICT_PATH = /^\/api\/v1\/models\/[^/]+\/(v[^/]+\/)?predict$/;

/**
 * Trusted first-party origins (dashboard) allowed to send credentialed
 * (cookie/JWT) requests. Configurable via the comma-separated `CORS_ORIGINS`
 * env var; defaults to the local frontend.
 */
const dashboardOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:3001')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

// Custom Winston format: promotes the nest-winston `context` meta field to a
// top-level JSON key so Loki can extract it via `| json | context = "..."`.
const nestContextFormat = winston.format((info) => {
  // nest-winston stores the class context in info.context
  if (info.context) {
    info['logger'] = info.context as string;
  }
  return info;
})();

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: WinstonModule.createLogger({
      transports: [
        // Console transport – human-readable JSON in the terminal
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.timestamp(),
            nestContextFormat,
            winston.format.json(),
          ),
        }),
        // OpenTelemetry transport – injects trace_id + span_id from the active
        // OTel span into every log record so Loki queries can correlate logs to traces.
        new OpenTelemetryTransportV3(),
      ],
    }),
  });
  app.setGlobalPrefix('api/v1');
  // Per-request CORS: the public prediction API is Bearer-key authenticated and
  // consumed from any user origin, so it reflects the caller's origin without
  // credentials. Every other route stays locked to the trusted, credentialed
  // dashboard allowlist.
  app.use(
    cors((req: express.Request, callback) => {
      if (PUBLIC_PREDICT_PATH.test(req.path)) {
        callback(null, {
          origin: true,
          credentials: false,
          methods: ['POST', 'OPTIONS'],
          allowedHeaders: ['Content-Type', 'Authorization'],
        });
        return;
      }
      callback(null, { origin: dashboardOrigins, credentials: true });
    }),
  );

  // Serve uploads statically
  app.use('/uploads', express.static(join(__dirname, '..', 'uploads')));

  app.use(
    bodyParser.json({
      limit: '50mb',
      verify: (req: any, res, buf) => {
        req.rawBody = buf;
      },
    }),
  );
  app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap().catch((err) => {
  console.error('Error starting server:', err);
});
