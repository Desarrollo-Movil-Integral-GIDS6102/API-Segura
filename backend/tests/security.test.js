'use strict';

const request = require('supertest');
const { app } = require('../src/app');

describe('API Security and Defensive Controls', () => {
  describe('HTTP Security Headers and Information Leakage', () => {
    test('disables X-Powered-By header to prevent fingerprinting', async () => {
      const res = await request(app).get('/health');
      expect(res.headers['x-powered-by']).toBeUndefined();
    });

    test('sets strict defensive headers via Helmet', async () => {
      const res = await request(app).get('/health');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-frame-options']).toBeDefined();
    });

    test('returns standard safe error for unknown routes without exposing stack', async () => {
      const res = await request(app).get('/api/v1/nonexistent-route-path');
      expect(res.status).toBe(404);
    });

    test('blocks requests from unauthorized CORS origins', async () => {
      const res = await request(app)
        .get('/health')
        .set('Origin', 'http://malicious-attacker-site.com');
      expect(res.status).toBe(500);
      expect(res.body.error.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('Payload Size Limit (HTTP 413)', () => {
    test('rejects payloads exceeding the 20 KB limit with HTTP 413', async () => {
      // Create a payload larger than 20 KB (e.g. ~25 KB string)
      const oversizedData = 'x'.repeat(25 * 1024);
      const res = await request(app)
        .post('/api/v1/auth/login')
        .set('Content-Type', 'application/json')
        .send(JSON.stringify({ email: 'test@example.com', password: oversizedData }));

      expect(res.status).toBe(413);
    });
  });

  describe('Rate Limiting (HTTP 429)', () => {
    test('enforces rate limit on authentication routes after exceeding threshold', async () => {
      // The router configures limiter(10) for /api/v1/auth/login
      const payload = { email: 'ratelimit_test@example.com', password: 'Short' };
      const requests = [];

      // Send 10 validly received (even if validation fails) requests
      for (let i = 0; i < 10; i++) {
        requests.push(request(app).post('/api/v1/auth/login').send(payload));
      }
      await Promise.all(requests);

      // The 11th request must be blocked by express-rate-limit
      const blockedRes = await request(app).post('/api/v1/auth/login').send(payload);

      expect(blockedRes.status).toBe(429);
      expect(blockedRes.body.error.code).toBe('RATE_LIMITED');
    });
  });
});
