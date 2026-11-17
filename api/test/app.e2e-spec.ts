import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('Finova API (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /api/v1/auth/login debe rechazar payload vacío con 400', () => {
    return request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({})
      .expect(400);
  });

  it('GET /api/v1/users/me debe rechazar petición sin token con 401', () => {
    return request(app.getHttpServer()).get('/api/v1/users/me').expect(401);
  });

  it('Flujo completo: registro, gasto 77000, resumen, presupuesto, visibilidad de categoría, CSV y baja de cuenta', async () => {
    const email1 = `e2e_${Date.now()}@finova.test`;
    const email2 = `e2e_other_${Date.now()}@finova.test`;
    const password = 'Password123!';

    // 1. Registro y login de usuario 1
    const reg1 = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ name: 'Usuario E2E', email: email1, password })
      .expect(201);
    const token1 = reg1.body.accessToken;
    expect(token1).toBeTruthy();

    const reg2 = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ name: 'Usuario Dos', email: email2, password })
      .expect(201);
    const token2 = reg2.body.accessToken;

    // 2. Obtener categorías base y crear gasto de 77000.00
    const catsRes = await request(app.getHttpServer())
      .get('/api/v1/categories')
      .set('Authorization', `Bearer ${token1}`)
      .expect(200);
    const expenseCat = catsRes.body.find((c: any) => c.type === 'EXPENSE');
    expect(expenseCat).toBeDefined();

    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    await request(app.getHttpServer())
      .post('/api/v1/transactions')
      .set('Authorization', `Bearer ${token1}`)
      .send({
        amount: '77000.00',
        type: 'EXPENSE',
        categoryId: expenseCat.id,
        description: 'Jean E2E',
        date: now.toISOString(),
      })
      .expect(201);

    const summaryRes = await request(app.getHttpServer())
      .get(`/api/v1/transactions/summary?month=${month}&year=${year}`)
      .set('Authorization', `Bearer ${token1}`)
      .expect(200);
    expect(summaryRes.body.totalExpense).toBe(77000);

    // 3. Crear límite de presupuesto y verificar spent / remaining
    await request(app.getHttpServer())
      .post('/api/v1/budgets')
      .set('Authorization', `Bearer ${token1}`)
      .send({
        categoryId: expenseCat.id,
        amount: '100000.00',
        month,
        year,
      })
      .expect(201);

    const budgetsRes = await request(app.getHttpServer())
      .get(`/api/v1/budgets?month=${month}&year=${year}`)
      .set('Authorization', `Bearer ${token1}`)
      .expect(200);
    expect(budgetsRes.body).toHaveLength(1);
    expect(budgetsRes.body[0].spent).toBe(77000);
    expect(budgetsRes.body[0].remaining).toBe(23000);

    // 4. Ocultar categoría base para usuario 1 sin afectar a usuario 2
    await request(app.getHttpServer())
      .patch(`/api/v1/categories/${expenseCat.id}/visibility`)
      .set('Authorization', `Bearer ${token1}`)
      .send({ hidden: true })
      .expect(200);

    const catsAfter1 = await request(app.getHttpServer())
      .get('/api/v1/categories')
      .set('Authorization', `Bearer ${token1}`)
      .expect(200);
    expect(
      catsAfter1.body.find((c: any) => c.id === expenseCat.id)?.isHidden,
    ).toBe(true);

    const catsAfter2 = await request(app.getHttpServer())
      .get('/api/v1/categories')
      .set('Authorization', `Bearer ${token2}`)
      .expect(200);
    expect(
      catsAfter2.body.find((c: any) => c.id === expenseCat.id)?.isHidden,
    ).toBe(false);

    // 5. Exportar CSV por rango de fechas
    const todayStr = `${year}-${String(month).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const csvRes = await request(app.getHttpServer())
      .get(`/api/v1/transactions/export-csv?from=${todayStr}&to=${todayStr}&type=EXPENSE`)
      .set('Authorization', `Bearer ${token1}`)
      .expect(200);
    expect(csvRes.body.count).toBe(1);
    expect(csvRes.body.csv).toContain('Jean E2E');

    // 6. Eliminar cuenta: 400 sin confirmación, 401 contraseña errónea, 200 ok, login falla
    await request(app.getHttpServer())
      .delete('/api/v1/users/me')
      .set('Authorization', `Bearer ${token1}`)
      .send({})
      .expect(400);

    await request(app.getHttpServer())
      .delete('/api/v1/users/me')
      .set('Authorization', `Bearer ${token1}`)
      .send({ confirmation: 'ELIMINAR', password: 'WrongPassword!' })
      .expect(401);

    await request(app.getHttpServer())
      .delete('/api/v1/users/me')
      .set('Authorization', `Bearer ${token1}`)
      .send({ confirmation: 'ELIMINAR', password })
      .expect(200);

    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: email1, password })
      .expect(401);
  });
});
