'use strict';

const {
  registerSchema,
  loginSchema,
  refreshSchema,
} = require('../../src/schemas/auth.schema');
const {
  createTaskSchema,
  updateTaskSchema,
  listTasksSchema,
} = require('../../src/schemas/task.schema');

describe('Unit & BVA: Schemas and Input Validation', () => {
  describe('auth.schema', () => {
    describe('registerSchema', () => {
      test('trims and lowercases email, accepting valid password', () => {
        const input = {
          email: '  TEST.User@Example.COM  ',
          password: 'Password12345!',
        };
        const result = registerSchema.safeParse(input);
        expect(result.success).toBe(true);
        expect(result.data.email).toBe('test.user@example.com');
      });

      test('BVA: rejects 11-character password (just below minimum 12)', () => {
        const input = { email: 'user@example.com', password: 'P'.repeat(11) };
        const result = registerSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      test('BVA: accepts 12-character password (exact minimum)', () => {
        const input = { email: 'user@example.com', password: 'P'.repeat(12) };
        const result = registerSchema.safeParse(input);
        expect(result.success).toBe(true);
      });

      test('BVA: accepts 128-character password (exact maximum)', () => {
        const input = { email: 'user@example.com', password: 'P'.repeat(128) };
        const result = registerSchema.safeParse(input);
        expect(result.success).toBe(true);
      });

      test('BVA: rejects 129-character password (just above maximum 128)', () => {
        const input = { email: 'user@example.com', password: 'P'.repeat(129) };
        const result = registerSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      test('rejects malformed email formats', () => {
        const invalidEmails = ['plainaddress', '@missingusername.com', 'user@.com'];
        for (const email of invalidEmails) {
          const result = registerSchema.safeParse({ email, password: 'ValidPassword123!' });
          expect(result.success).toBe(false);
        }
      });
    });

    describe('loginSchema', () => {
      test('rejects empty password on login', () => {
        const result = loginSchema.safeParse({ email: 'user@example.com', password: '' });
        expect(result.success).toBe(false);
      });

      test('accepts valid login credentials', () => {
        const result = loginSchema.safeParse({
          email: 'user@example.com',
          password: 'SomePassword!',
        });
        expect(result.success).toBe(true);
      });
    });

    describe('refreshSchema', () => {
      test('BVA: rejects refresh token with 19 chars (below min 20)', () => {
        const result = refreshSchema.safeParse({ refreshToken: 'a'.repeat(19) });
        expect(result.success).toBe(false);
      });

      test('BVA: accepts refresh token with 20 chars (exact minimum)', () => {
        const result = refreshSchema.safeParse({ refreshToken: 'a'.repeat(20) });
        expect(result.success).toBe(true);
      });

      test('BVA: accepts refresh token with 200 chars (exact maximum)', () => {
        const result = refreshSchema.safeParse({ refreshToken: 'a'.repeat(200) });
        expect(result.success).toBe(true);
      });

      test('BVA: rejects refresh token with 201 chars (above maximum 200)', () => {
        const result = refreshSchema.safeParse({ refreshToken: 'a'.repeat(201) });
        expect(result.success).toBe(false);
      });
    });
  });

  describe('task.schema', () => {
    describe('createTaskSchema', () => {
      test('trims whitespace and accepts valid title and description', () => {
        const result = createTaskSchema.safeParse({
          title: '  Clean Kitchen  ',
          description: '  Do dishes and countertops  ',
        });
        expect(result.success).toBe(true);
        expect(result.data.title).toBe('Clean Kitchen');
        expect(result.data.description).toBe('Do dishes and countertops');
      });

      test('BVA: rejects empty string or whitespace-only title', () => {
        expect(createTaskSchema.safeParse({ title: '' }).success).toBe(false);
        expect(createTaskSchema.safeParse({ title: '     ' }).success).toBe(false);
      });

      test('BVA: accepts 1-character title (exact minimum)', () => {
        const result = createTaskSchema.safeParse({ title: 'A' });
        expect(result.success).toBe(true);
        expect(result.data.title).toBe('A');
      });

      test('BVA: accepts 120-character title (exact maximum)', () => {
        const result = createTaskSchema.safeParse({ title: 'T'.repeat(120) });
        expect(result.success).toBe(true);
      });

      test('BVA: rejects 121-character title (just above maximum 120)', () => {
        const result = createTaskSchema.safeParse({ title: 'T'.repeat(121) });
        expect(result.success).toBe(false);
      });

      test('BVA: accepts 2000-character description (exact maximum)', () => {
        const result = createTaskSchema.safeParse({
          title: 'Valid Title',
          description: 'D'.repeat(2000),
        });
        expect(result.success).toBe(true);
      });

      test('BVA: rejects 2001-character description (above maximum 2000)', () => {
        const result = createTaskSchema.safeParse({
          title: 'Valid Title',
          description: 'D'.repeat(2001),
        });
        expect(result.success).toBe(false);
      });
    });

    describe('updateTaskSchema', () => {
      test('rejects empty object update (at least one field required)', () => {
        const result = updateTaskSchema.safeParse({});
        expect(result.success).toBe(false);
      });

      test('accepts partial update of only completed boolean', () => {
        const result = updateTaskSchema.safeParse({ completed: true });
        expect(result.success).toBe(true);
        expect(result.data.completed).toBe(true);
      });

      test('accepts nullable description to clear existing description', () => {
        const result = updateTaskSchema.safeParse({ description: null });
        expect(result.success).toBe(true);
        expect(result.data.description).toBeNull();
      });

      test('rejects non-boolean value for completed', () => {
        const result = updateTaskSchema.safeParse({ completed: 'yes' });
        expect(result.success).toBe(false);
      });
    });

    describe('listTasksSchema', () => {
      test('applies sensible defaults when query params are omitted', () => {
        const result = listTasksSchema.safeParse({});
        expect(result.success).toBe(true);
        expect(result.data).toEqual({ page: 1, limit: 20 });
      });

      test('coerces string numbers to integers correctly', () => {
        const result = listTasksSchema.safeParse({ page: '3', limit: '50' });
        expect(result.success).toBe(true);
        expect(result.data).toEqual({ page: 3, limit: 50 });
      });

      test('BVA: rejects page < 1 (e.g. 0 or negative)', () => {
        expect(listTasksSchema.safeParse({ page: '0' }).success).toBe(false);
        expect(listTasksSchema.safeParse({ page: '-5' }).success).toBe(false);
      });

      test('BVA: rejects limit < 1 or limit > 100', () => {
        expect(listTasksSchema.safeParse({ limit: '0' }).success).toBe(false);
        expect(listTasksSchema.safeParse({ limit: '101' }).success).toBe(false);
      });

      test('BVA: accepts limit = 100 (exact upper limit)', () => {
        const result = listTasksSchema.safeParse({ limit: '100' });
        expect(result.success).toBe(true);
        expect(result.data.limit).toBe(100);
      });
    });
  });
});
