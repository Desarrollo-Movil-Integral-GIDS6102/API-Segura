'use strict';

const jwt = require('jsonwebtoken');
const { createAccessToken, createRefreshToken, hashToken } = require('../src/utils/tokens');
const { env } = require('../src/config');

describe('token utilities', () => {
  test('createAccessToken produces valid signed JWT', () => {
    const userId = 'user_test_123';
    const token = createAccessToken(userId);
    expect(typeof token).toBe('string');

    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET, {
      algorithms: ['HS256'],
      issuer: 'task-manager-api',
      audience: 'task-manager-client',
    });

    expect(decoded.sub).toBe(userId);
    expect(decoded.type).toBe('access');
  });

  test('createRefreshToken produces cryptographically random opaque tokens', () => {
    const token1 = createRefreshToken();
    const token2 = createRefreshToken();

    expect(typeof token1).toBe('string');
    expect(token1.length).toBeGreaterThanOrEqual(40);
    expect(token1).not.toBe(token2);
  });

  test('hashToken produces SHA-256 hex digest deterministically', () => {
    const raw = 'sample-refresh-token';
    const hash1 = hashToken(raw);
    const hash2 = hashToken(raw);

    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);
  });
});
