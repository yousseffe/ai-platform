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

const PUBLIC_PREDICT_PATH = /^\/api\/v1\/models\/[^/]+\/(v[^/]+\/)?predict$/;

const dashboardOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:3001')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const nestContextFormat = winston.format((info) => {
  if (info.context) {
    info['logger'] = info.context;
  }
  return info;
})();

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: WinstonModule.createLogger({
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.timestamp(),
            nestContextFormat,
            winston.format.json(),
          ),
        }),

        new OpenTelemetryTransportV3(),
      ],
    }),
  });
  app.setGlobalPrefix('api/v1');

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

  app.use('/uploads', express.static(join(__dirname, '..', 'uploads')));

  app.use(
    bodyParser.json({
      limit: '50mb',
      verify: (
        req: express.Request & { rawBody?: Buffer },
        res: express.Response,
        buf: Buffer,
      ) => {
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
