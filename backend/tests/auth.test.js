'use strict';

const request = require('supertest');
const { app } = require('../src/app');
const { prisma } = require('../src/repositories/task.repository');

describe('authentication and session lifecycle', () => {
  const timestamp = Date.now();
  const testEmail = `auth_test_${timestamp}@example.test`;
  const validPassword = 'SecurePassword123!#';

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: { contains: 'test_' } },
    }).catch(() => {});
    await prisma.$disconnect();
  });

  describe('registration', () => {
    test('successfully registers a user with valid credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ email: testEmail, password: validPassword });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
      expect(res.body).toHaveProperty('expiresIn', 600);
    });

    test('rejects duplicate email with 409 conflict', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ email: testEmail, password: validPassword });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
    });

    test('rejects short passwords (< 12 chars) with 400 validation error', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ email: `short_${Date.now()}@example.test`, password: 'short' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('rejects invalid email formats', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ email: 'not-an-email', password: validPassword });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('login', () => {
    test('successfully logs in with valid credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: testEmail, password: validPassword });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
    });

    test('rejects invalid password with generic 401 UNAUTHENTICATED', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: testEmail, password: 'WrongPassword999!' });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
      expect(res.body.error.message).toBe('Invalid email or password.');
    });

    test('rejects unknown user with generic 401 UNAUTHENTICATED', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'nonexistent@example.test', password: validPassword });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
      expect(res.body.error.message).toBe('Invalid email or password.');
    });
  });

  describe('refresh token rotation, reuse detection, and logout', () => {
    test('rotates refresh token and returns a replacement pair', async () => {
      const email = `rot_${Date.now()}@example.test`;
      const regRes = await request(app)
        .post('/api/v1/auth/register')
        .send({ email, password: validPassword });

      const oldRefresh = regRes.body.refreshToken;

      const refreshRes = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: oldRefresh });

      expect(refreshRes.status).toBe(200);
      expect(refreshRes.body).toHaveProperty('accessToken');
      expect(refreshRes.body).toHaveProperty('refreshToken');
      expect(refreshRes.body.refreshToken).not.toBe(oldRefresh);
    });

    test('reuse of rotated token revokes the entire family', async () => {
      const email = `reuse_${Date.now()}@example.test`;
      const regRes = await request(app)
        .post('/api/v1/auth/register')
        .send({ email, password: validPassword });

      const oldRefresh = regRes.body.refreshToken;

      const rotatedRes = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: oldRefresh });
      expect(rotatedRes.status).toBe(200);
      const newRefresh = rotatedRes.body.refreshToken;

      // Present the old token again (reuse attempt)
      const reuseRes = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: oldRefresh });
      expect(reuseRes.status).toBe(401);

      // Presenting the newer token in that family now also fails because family was revoked
      const newerRes = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: newRefresh });
      expect(newerRes.status).toBe(401);
    });

    test('logout revokes the refresh token family', async () => {
      const email = `logout_${Date.now()}@example.test`;
      const regRes = await request(app)
        .post('/api/v1/auth/register')
        .send({ email, password: validPassword });

      const logoutRes = await request(app)
        .post('/api/v1/auth/logout')
        .send({ refreshToken: regRes.body.refreshToken });
      expect(logoutRes.status).toBe(204);

      // Attempt to refresh after logout must fail
      const refreshAfterLogout = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: regRes.body.refreshToken });
      expect(refreshAfterLogout.status).toBe(401);
    });

    test('logout-all revokes all sessions for the user', async () => {
      const email = `logoutall_${Date.now()}@example.test`;
      const regRes = await request(app)
        .post('/api/v1/auth/register')
        .send({ email, password: validPassword });

      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email, password: validPassword });

      const refreshSession1 = regRes.body.refreshToken;
      const refreshSession2 = loginRes.body.refreshToken;
      const accessToken = loginRes.body.accessToken;

      const logoutAllRes = await request(app)
        .post('/api/v1/auth/logout-all')
        .set('Authorization', `Bearer ${accessToken}`);
      expect(logoutAllRes.status).toBe(204);

      // Both refresh tokens must now be rejected
      const res1 = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: refreshSession1 });
      expect(res1.status).toBe(401);

      const res2 = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: refreshSession2 });
      expect(res2.status).toBe(401);
    });
  });
});
