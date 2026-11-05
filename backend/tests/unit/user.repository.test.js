'use strict';

const userRepository = require('../../src/repositories/user.repository');

describe('Unit: UserRepository', () => {
  let mockDb;

  beforeEach(() => {
    mockDb = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
    };
  });

  test('findByEmail queries user by email using provided db client', async () => {
    const user = { id: 'u1', email: 'test@example.com' };
    mockDb.user.findUnique.mockResolvedValue(user);

    const result = await userRepository.findByEmail('test@example.com', mockDb);

    expect(mockDb.user.findUnique).toHaveBeenCalledWith({ where: { email: 'test@example.com' } });
    expect(result).toEqual(user);
  });

  test('findById queries user by id using provided db client', async () => {
    const user = { id: 'u1', email: 'test@example.com' };
    mockDb.user.findUnique.mockResolvedValue(user);

    const result = await userRepository.findById('u1', mockDb);

    expect(mockDb.user.findUnique).toHaveBeenCalledWith({ where: { id: 'u1' } });
    expect(result).toEqual(user);
  });

  test('create inserts user data using provided db client', async () => {
    const data = { email: 'new@example.com', passwordHash: 'hash123' };
    mockDb.user.create.mockResolvedValue({ id: 'u2', ...data });

    const result = await userRepository.create(data, mockDb);

    expect(mockDb.user.create).toHaveBeenCalledWith({ data });
    expect(result).toEqual({ id: 'u2', ...data });
  });
});
