import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from './../src/app.module.js';
import { E2E_ADMIN } from './e2e-fixtures.js';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();
  });

  it('/api/v1 (GET) requires authentication', () => {
    return request(app.getHttpServer())
      .get('/api/v1')
      .expect(401);
  });

  it('/api/v1/locations/provinces (GET) exposes the public location catalog', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/locations/provinces')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveLength(34);
  });

  it('logs in with an HttpOnly cookie and resolves the current user', async () => {
    const agent = request.agent(app.getHttpServer());
    const loginResponse = await agent
      .post('/api/v1/auth/login')
      .send({
        username: E2E_ADMIN.username,
        password: E2E_ADMIN.password,
        rememberMe: false,
      })
      .expect(200);

    expect(loginResponse.headers['set-cookie']).toEqual(
      expect.arrayContaining([
        expect.stringContaining('access_token='),
        expect.stringContaining('refresh_token='),
      ]),
    );

    const currentUserResponse = await agent
      .get('/api/v1/auth/me')
      .expect(200);
    expect(currentUserResponse.body.data).toMatchObject({
      username: E2E_ADMIN.username,
      email: E2E_ADMIN.email,
      isActive: true,
    });
  });

  afterAll(async () => {
    await app?.close();
  });
});
