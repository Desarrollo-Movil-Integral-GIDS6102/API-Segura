'use strict';

const jwt = require('jsonwebtoken');
const { requireAuth } = require('../../src/middleware/auth.middleware');
const { env } = require('../../src/config');

describe('Unit: Auth Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      get: jest.fn(),
      headers: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  test('returns 401 when Authorization header is missing', () => {
    req.get.mockReturnValue(undefined);

    requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: 'UNAUTHENTICATED', message: 'Sign in to continue.' },
    });
    expect(next).not.toHaveBeenCalled();
  });

  test('returns 401 when Authorization header format is malformed', () => {
    req.get.mockReturnValue('Basic some_credentials_here');

    requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: 'UNAUTHENTICATED', message: 'Sign in to continue.' },
    });
    expect(next).not.toHaveBeenCalled();
  });

  test('returns 401 when token has invalid signature or is expired', () => {
    req.get.mockReturnValue('Bearer invalid.jwt.token');

    requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: 'UNAUTHENTICATED', message: 'Sign in again to continue.' },
    });
    expect(next).not.toHaveBeenCalled();
  });

  test('returns 401 when token payload is not access type or lacks sub', () => {
    const badToken = jwt.sign(
      { type: 'refresh', foo: 'bar' }, // Missing sub, wrong type
      env.JWT_ACCESS_SECRET,
      { issuer: 'task-manager-api', audience: 'task-manager-client' },
    );
    req.get.mockReturnValue(`Bearer ${badToken}`);

    requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: 'UNAUTHENTICATED', message: 'Sign in again to continue.' },
    });
    expect(next).not.toHaveBeenCalled();
  });

  test('sets req.user and calls next() on valid access token', () => {
    const validToken = jwt.sign(
      { sub: 'user_xyz_789', type: 'access' },
      env.JWT_ACCESS_SECRET,
      {
        algorithm: 'HS256',
        issuer: 'task-manager-api',
        audience: 'task-manager-client',
        expiresIn: '10m',
      },
    );
    req.get.mockReturnValue(`Bearer ${validToken}`);

    requireAuth(req, res, next);

    expect(req.user).toEqual({ id: 'user_xyz_789' });
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });
});
