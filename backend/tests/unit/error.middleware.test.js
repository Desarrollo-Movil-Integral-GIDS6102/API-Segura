'use strict';

const { errorHandler } = require('../../src/middleware/error.middleware');

describe('Unit: Error Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      log: { error: jest.fn() },
    };
    res = {
      headersSent: false,
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  test('does nothing if headers have already been sent', () => {
    res.headersSent = true;
    const error = new Error('Late error');

    errorHandler(error, req, res, next);

    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  test('handles 4xx client errors, preserving status, code, and message', () => {
    const error = new Error('Resource not found');
    error.status = 404;
    error.code = 'NOT_FOUND';

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: {
        code: 'NOT_FOUND',
        message: 'Resource not found',
      },
    });
  });

  test('falls back to code REQUEST_ERROR when 4xx error has no explicit code', () => {
    const error = new Error('Bad input without custom code');
    error.status = 422;

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith({
      error: {
        code: 'REQUEST_ERROR',
        message: 'Bad input without custom code',
      },
    });
  });

  test('masks 500 internal errors and never leaks server implementation details', () => {
    const error = new Error('Database connection failed at postgres://internal-host:5432');
    error.status = 500;
    error.code = 'PRISMA_FATAL';

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred.',
      },
    });
  });

  test('defaults non-integer status to 500 INTERNAL_ERROR', () => {
    const error = new Error('Unspecified error');
    error.status = 'invalid_status_type';

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred.',
      },
    });
  });
});
