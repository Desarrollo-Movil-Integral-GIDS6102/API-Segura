'use strict';

jest.mock('../../src/repositories/task.repository');

const repository = require('../../src/repositories/task.repository');
const { TaskService } = require('../../src/services/task.service');

describe('Unit: TaskService', () => {
  let taskService;

  beforeEach(() => {
    jest.clearAllMocks();
    taskService = new TaskService();
  });

  describe('list', () => {
    test('computes pagination offset and returns tasks', async () => {
      // Arrange
      const userId = 'user_123';
      const pagination = { page: 2, limit: 10 };
      const mockTasks = [{ id: 'task_1', title: 'Task 1' }];
      repository.listByOwner.mockResolvedValue(mockTasks);

      // Act
      const result = await taskService.list(userId, pagination);

      // Assert: offset should be (page - 1) * limit = (2 - 1) * 10 = 10
      expect(repository.listByOwner).toHaveBeenCalledWith(userId, 10, 10);
      expect(result).toEqual({ items: mockTasks, page: 2, limit: 10 });
    });
  });

  describe('create', () => {
    test('delegates creation to repository with owner id and payload', async () => {
      // Arrange
      const userId = 'user_123';
      const payload = { title: 'New Task', description: 'Some description' };
      const createdItem = { id: 'task_created', ...payload, ownerId: userId, completed: false };
      repository.create.mockResolvedValue(createdItem);

      // Act
      const result = await taskService.create(userId, payload);

      // Assert
      expect(repository.create).toHaveBeenCalledWith(userId, payload);
      expect(result).toEqual(createdItem);
    });
  });

  describe('update', () => {
    test('returns updated task when found and owned', async () => {
      // Arrange
      const userId = 'user_123';
      const taskId = 'task_456';
      const updateData = { completed: true };
      const updatedItem = { id: taskId, title: 'Existing', completed: true };
      repository.updateOwned.mockResolvedValue(updatedItem);

      // Act
      const result = await taskService.update(userId, taskId, updateData);

      // Assert
      expect(repository.updateOwned).toHaveBeenCalledWith(userId, taskId, updateData);
      expect(result).toEqual(updatedItem);
    });

    test('throws 404 NOT_FOUND when task is not owned or does not exist', async () => {
      // Arrange
      repository.updateOwned.mockResolvedValue(null);

      // Act & Assert
      await expect(
        taskService.update('user_123', 'nonexistent_or_other_user_task', { title: 'Change' }),
      ).rejects.toMatchObject({
        status: 404,
        code: 'NOT_FOUND',
        message: 'Task not found.',
      });
    });
  });

  describe('delete', () => {
    test('resolves cleanly when task is successfully deleted', async () => {
      // Arrange
      repository.deleteOwned.mockResolvedValue(true);

      // Act & Assert
      await expect(taskService.delete('user_123', 'task_to_delete')).resolves.toBeUndefined();
      expect(repository.deleteOwned).toHaveBeenCalledWith('user_123', 'task_to_delete');
    });

    test('throws 404 NOT_FOUND when task to delete is not found', async () => {
      // Arrange
      repository.deleteOwned.mockResolvedValue(false);

      // Act & Assert
      await expect(
        taskService.delete('user_123', 'nonexistent_task'),
      ).rejects.toMatchObject({
        status: 404,
        code: 'NOT_FOUND',
        message: 'Task not found.',
      });
    });
  });
});
