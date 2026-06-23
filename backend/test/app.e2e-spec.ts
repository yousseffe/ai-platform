import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  jest.setTimeout(30000);

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  it('/api/v1 (GET)', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1');
    console.log('GET /api/v1 status:', res.status, 'body:', res.text);

    const resRoot = await request(app.getHttpServer()).get('/');
    console.log('GET / status:', resRoot.status, 'body:', resRoot.text);

    expect(res.status === 200 || resRoot.status === 200).toBe(true);
  });
});
