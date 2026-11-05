'use strict';

const { z } = require('zod');
const { validate } = require('../../src/middleware/validate.middleware');

describe('Unit: Validate Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      body: {},
      query: {},
      params: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  const sampleSchema = z.object({
    title: z.string().min(3),
    count: z.coerce.number().int().min(1),
  });

  test('passes validation and assigns sanitized data when input matches schema', () => {
    req.body = { title: 'Valid Title', count: '5', extra: 'ignored' };
    const middleware = validate(sampleSchema, 'body');

    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
    expect(req.body).toEqual({ title: 'Valid Title', count: 5 });
  });

  test('validates query params properly', () => {
    req.query = { title: 'Query Title', count: '10' };
    const middleware = validate(sampleSchema, 'query');

    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.query.count).toBe(10);
  });

  test('returns 400 VALIDATION_ERROR with structured issue details on failure', () => {
    req.body = { title: 'ab', count: -1 }; // title too short, count negative
    const middleware = validate(sampleSchema, 'body');

    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Check the submitted values.',
        details: expect.arrayContaining([
          expect.objectContaining({ field: 'title' }),
          expect.objectContaining({ field: 'count' }),
        ]),
      },
    });
  });
});
