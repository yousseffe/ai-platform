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
  app.enableCors({
    origin: 'http://localhost:3001',
    credentials: true,
  });

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
