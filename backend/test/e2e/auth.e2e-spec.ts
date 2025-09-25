import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { DataSource } from 'typeorm';

describe('AuthController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();

    const ds = app.get(DataSource);
    await ds.query(`DELETE FROM "users" WHERE "username" IN ('admin', 'nikita')`);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/auth/login (POST)', () => {
    it('should create new user and return token', () => {
      const username = 'testuser_' + Date.now();
      
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          username,
          password: 'password123',
        })
        .expect(200)
        .expect((res) => {
          const data = res.body.data ?? res.body;
          expect(data.user).toBeDefined();
          expect(data.user.username).toBe(username);
          expect(data.user.role).toBe('survivor');
          expect(data.token).toBeDefined();
        });
    });

    it('should login existing user with correct password', async () => {
      const username = 'existing_' + Date.now();
      const password = 'password123';

      // создаем юзера
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ username, password });

      // входим с теми же кредами
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({ username, password })
        .expect(200)
        .expect((res) => {
          const data = res.body.data ?? res.body;
          expect(data.user.username).toBe(username);
          expect(data.token).toBeDefined();
        });
    });

    it('should assign admin role for username "admin"', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          username: 'admin',
          password: 'password123',
        })
        .expect(200)
        .expect((res) => {
          const data = res.body.data ?? res.body;
          expect(data.user.role).toBe('admin');
        });
    });

    it('should assign nikita role for username "nikita"', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          username: 'nikita',
          password: 'password123',
        })
        .expect(200)
        .expect((res) => {
          const data = res.body.data ?? res.body;
          expect(data.user.role).toBe('nikita');
        });
    });

    it('should fail with wrong password', async () => {
      const username = 'wrongpass_' + Date.now();

      // регаем юзера
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ username, password: 'correct123' });

      // проверяем не тот пароль
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({ username, password: 'wrong123' })
        .expect(401);
    });

    it('should validate input data', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          username: '',
          password: '123', // слишком короткий
        })
        .expect(400);
    });
  });
});
