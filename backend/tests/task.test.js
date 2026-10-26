'use strict';

const request = require('supertest');
const { app } = require('../src/app');
const { prisma } = require('../src/repositories/task.repository');

describe('tasks CRUD and cross-user isolation', () => {
  let userA, tokenA;
  let userB, tokenB;

  beforeAll(async () => {
    const emailA = `usera_${Date.now()}@example.test`;
    const emailB = `userb_${Date.now()}@example.test`;
    const pass = 'SecurePass123!@';

    const resA = await request(app).post('/api/v1/auth/register').send({ email: emailA, password: pass });
    tokenA = resA.body.accessToken;

    const resB = await request(app).post('/api/v1/auth/register').send({ email: emailB, password: pass });
    tokenB = resB.body.accessToken;
  });

  afterAll(async () => {
    await prisma.task.deleteMany({}).catch(() => {});
    await prisma.user.deleteMany({
      where: { email: { contains: 'user' } },
    }).catch(() => {});
    await prisma.$disconnect();
  });

  describe('unauthenticated access', () => {
    test('rejects GET /api/v1/tasks without token', async () => {
      const res = await request(app).get('/api/v1/tasks');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    });

    test('rejects POST /api/v1/tasks with invalid bearer token', async () => {
      const res = await request(app)
        .post('/api/v1/tasks')
        .set('Authorization', 'Bearer invalid-token')
        .send({ title: 'Hack attempt' });
      expect(res.status).toBe(401);
    });
  });

  describe('task operations for authenticated user A', () => {
    let createdTaskId;

    test('creates a task successfully', async () => {
      const res = await request(app)
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ title: 'Task 1 by User A', description: 'Detailed description' });

      expect(res.status).toBe(201);
      expect(res.body.item).toHaveProperty('id');
      expect(res.body.item.title).toBe('Task 1 by User A');
      expect(res.body.item.description).toBe('Detailed description');
      expect(res.body.item.completed).toBe(false);

      createdTaskId = res.body.item.id;
    });

    test('rejects creation with empty title', async () => {
      const res = await request(app)
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ title: '   ', description: 'Invalid' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('lists tasks owned by User A with pagination', async () => {
      const res = await request(app)
        .get('/api/v1/tasks?page=1&limit=10')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('items');
      expect(Array.isArray(res.body.items)).toBe(true);
      expect(res.body.items.some((t) => t.id === createdTaskId)).toBe(true);
      expect(res.body.page).toBe(1);
      expect(res.body.limit).toBe(10);
    });

    test('updates task completion and title', async () => {
      const res = await request(app)
        .patch(`/api/v1/tasks/${createdTaskId}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ title: 'Updated Task 1', completed: true });

      expect(res.status).toBe(200);
      expect(res.body.item.title).toBe('Updated Task 1');
      expect(res.body.item.completed).toBe(true);
    });

    test('cross-user isolation: User B cannot access, update, or delete User A task', async () => {
      // User B lists their tasks - should NOT contain User A's task
      const listB = await request(app)
        .get('/api/v1/tasks')
        .set('Authorization', `Bearer ${tokenB}`);
      expect(listB.status).toBe(200);
      expect(listB.body.items.some((t) => t.id === createdTaskId)).toBe(false);

      // User B tries to update User A's task - must return 404 NOT_FOUND
      const updateAttempt = await request(app)
        .patch(`/api/v1/tasks/${createdTaskId}`)
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ completed: false });
      expect(updateAttempt.status).toBe(404);
      expect(updateAttempt.body.error.code).toBe('NOT_FOUND');

      // User B tries to delete User A's task - must return 404 NOT_FOUND
      const deleteAttempt = await request(app)
        .delete(`/api/v1/tasks/${createdTaskId}`)
        .set('Authorization', `Bearer ${tokenB}`);
      expect(deleteAttempt.status).toBe(404);
      expect(deleteAttempt.body.error.code).toBe('NOT_FOUND');
    });

    test('User A deletes own task successfully', async () => {
      const res = await request(app)
        .delete(`/api/v1/tasks/${createdTaskId}`)
        .set('Authorization', `Bearer ${tokenA}`);
      expect(res.status).toBe(204);

      // Deleting again or updating returns 404
      const updateAfterDelete = await request(app)
        .patch(`/api/v1/tasks/${createdTaskId}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ completed: true });
      expect(updateAfterDelete.status).toBe(404);
    });
  });
});
