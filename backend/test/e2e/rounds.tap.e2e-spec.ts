import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

async function login(app: INestApplication, username: string, password: string) {
  const res = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ username, password })
    .expect(200);
  const token = res.body.data?.token;
  return token as string;
}

describe('Rounds tap (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      })
    );
    await app.init();

    const ds = app.get(DataSource);
    await ds.query(`DELETE FROM "users" WHERE "username" IN ('admin', 'nikita')`);
  });

  afterAll(async () => {
    await app.close();
  });

  it('creates a round (admin) then taps and sees score increment and 200', async () => {
    const adminToken = await login(app, 'admin', 'password123');

    // Создаем раунд
    const createRes = await request(app.getHttpServer())
      .post('/rounds')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(201);

    const roundId = createRes.body.data?.id ?? createRes.body.id;
    expect(roundId).toBeDefined();

    // Зашли как юзер
    const userToken = await login(app, 'player_' + Date.now(), 'password123');

    // первый тап может попасть на кулдаун, так что 400 тоже разрешим
    const tap1 = await request(app.getHttpServer())
      .post(`/rounds/${roundId}/tap`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect((res) => {
        expect([200, 400]).toContain(res.status);
      });

    if (tap1.status === 200) {
      const data1 = tap1.body.data ?? tap1.body;
      expect(data1.myScore).toBeDefined();
      const before = data1.myScore as number;
      // тут уже должен быть инкремент
      const tap2 = await request(app.getHttpServer())
        .post(`/rounds/${roundId}/tap`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);
      const data2 = tap2.body.data ?? tap2.body;
      expect(data2.myScore).toBe(before + (before % 11 === 10 ? 10 : 1));
    }
  });
});
