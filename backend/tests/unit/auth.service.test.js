'use strict';

jest.mock('bcrypt');
jest.mock('../../src/repositories/task.repository', () => ({
  prisma: {
    user: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback('mock_tx')),
  },
}));
jest.mock('../../src/repositories/refresh-token.repository');
jest.mock('../../src/utils/tokens');

const bcrypt = require('bcrypt');
const { prisma } = require('../../src/repositories/task.repository');
const tokenRepository = require('../../src/repositories/refresh-token.repository');
const { createAccessToken, createRefreshToken, hashToken } = require('../../src/utils/tokens');
const authService = require('../../src/services/auth.service');

describe('Unit: AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    createRefreshToken.mockReturnValue('mock-refresh-token');
    createAccessToken.mockReturnValue('mock-access-token');
    hashToken.mockReturnValue('mock-token-hash');
  });

  describe('register', () => {
    test('successfully registers user, hashes password and issues tokens', async () => {
      // Arrange
      const credentials = { email: 'new@example.com', password: 'StrongPassword123!' };
      bcrypt.hash.mockResolvedValue('hashed_password');
      prisma.user.create.mockResolvedValue({ id: 'user_1', email: credentials.email });
      tokenRepository.createToken.mockResolvedValue({});

      // Act
      const result = await authService.register(credentials);

      // Assert
      expect(bcrypt.hash).toHaveBeenCalledWith(credentials.password, 12);
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: { email: credentials.email, passwordHash: 'hashed_password' },
      });
      expect(result).toEqual({
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        expiresIn: 600,
      });
    });

    test('throws 409 conflict when prisma returns P2002 duplicate email', async () => {
      // Arrange
      const credentials = { email: 'existing@example.com', password: 'StrongPassword123!' };
      bcrypt.hash.mockResolvedValue('hashed_password');
      const prismaError = new Error('Unique constraint failed');
      prismaError.code = 'P2002';
      prisma.user.create.mockRejectedValue(prismaError);

      // Act & Assert
      await expect(authService.register(credentials)).rejects.toMatchObject({
        status: 409,
        code: 'CONFLICT',
        message: 'An account with this email already exists.',
      });
    });

    test('rethrows unexpected database errors', async () => {
      // Arrange
      bcrypt.hash.mockResolvedValue('hashed_password');
      prisma.user.create.mockRejectedValue(new Error('Connection lost'));

      // Act & Assert
      await expect(
        authService.register({ email: 'err@example.com', password: 'Password12345!' }),
      ).rejects.toThrow('Connection lost');
    });
  });

  describe('login', () => {
    test('successfully logs in when user exists and password matches', async () => {
      // Arrange
      const user = { id: 'user_1', email: 'test@example.com', passwordHash: 'stored_hash' };
      prisma.user.findUnique.mockResolvedValue(user);
      bcrypt.compare.mockResolvedValue(true);
      tokenRepository.createToken.mockResolvedValue({});

      // Act
      const result = await authService.login({ email: user.email, password: 'ValidPassword123!' });

      // Assert
      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { email: user.email } });
      expect(bcrypt.compare).toHaveBeenCalledWith('ValidPassword123!', 'stored_hash');
      expect(result).toEqual({
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        expiresIn: 600,
      });
    });

    test('rejects with 401 UNAUTHENTICATED when user does not exist (dummy hash comparison)', async () => {
      // Arrange
      prisma.user.findUnique.mockResolvedValue(null);
      bcrypt.compare.mockResolvedValue(false);

      // Act & Assert
      await expect(
        authService.login({ email: 'ghost@example.com', password: 'WrongPassword123!' }),
      ).rejects.toMatchObject({
        status: 401,
        code: 'UNAUTHENTICATED',
        message: 'Invalid email or password.',
      });
      // Verifies dummy password comparison executed to mitigate timing attacks
      expect(bcrypt.compare).toHaveBeenCalledWith(
        'WrongPassword123!',
        expect.stringContaining('$2b$12$'),
      );
    });

    test('rejects with 401 UNAUTHENTICATED when password is incorrect', async () => {
      // Arrange
      const user = { id: 'user_1', email: 'test@example.com', passwordHash: 'stored_hash' };
      prisma.user.findUnique.mockResolvedValue(user);
      bcrypt.compare.mockResolvedValue(false);

      // Act & Assert
      await expect(
        authService.login({ email: user.email, password: 'WrongPassword123!' }),
      ).rejects.toMatchObject({
        status: 401,
        code: 'UNAUTHENTICATED',
      });
    });
  });

  describe('refresh', () => {
    test('rotates token, revokes previous and returns new token pair', async () => {
      // Arrange
      const validRecord = {
        id: 'token_1',
        userId: 'user_1',
        familyId: 'family_1',
        expiresAt: new Date(Date.now() + 100000),
        revokedAt: null,
      };
      tokenRepository.findByHash.mockResolvedValue(validRecord);
      tokenRepository.revokeToken.mockResolvedValue({});
      tokenRepository.createToken.mockResolvedValue({});

      // Act
      const result = await authService.refresh('mock-refresh-token');

      // Assert
      expect(tokenRepository.findByHash).toHaveBeenCalledWith('mock-token-hash', 'mock_tx');
      expect(tokenRepository.revokeToken).toHaveBeenCalledWith('token_1', 'mock_tx');
      expect(result).toEqual({
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        expiresIn: 600,
      });
    });

    test('rejects and revokes entire family when revoked token is reused', async () => {
      // Arrange
      const revokedRecord = {
        id: 'token_revoked',
        userId: 'user_1',
        familyId: 'compromised_family',
        expiresAt: new Date(Date.now() + 100000),
        revokedAt: new Date(Date.now() - 1000),
      };
      tokenRepository.findByHash.mockResolvedValue(revokedRecord);

      // Act & Assert
      await expect(authService.refresh('reused-token')).rejects.toMatchObject({
        status: 401,
        code: 'UNAUTHENTICATED',
      });
      expect(tokenRepository.revokeFamily).toHaveBeenCalledWith('compromised_family', 'mock_tx');
    });

    test('rejects when token record is not found or expired', async () => {
      // Arrange: expired token
      const expiredRecord = {
        id: 'token_old',
        expiresAt: new Date(Date.now() - 5000),
      };
      tokenRepository.findByHash.mockResolvedValue(expiredRecord);

      // Act & Assert
      await expect(authService.refresh('expired-token')).rejects.toMatchObject({
        status: 401,
        code: 'UNAUTHENTICATED',
      });
    });
  });

  describe('logout and logoutAll', () => {
    test('logout revokes family if token found', async () => {
      tokenRepository.findByHash.mockResolvedValue({ familyId: 'family_99' });

      await authService.logout('sample_token');

      expect(tokenRepository.revokeFamily).toHaveBeenCalledWith('family_99');
    });

    test('logout does nothing if token not found', async () => {
      tokenRepository.findByHash.mockResolvedValue(null);

      await authService.logout('unknown_token');

      expect(tokenRepository.revokeFamily).not.toHaveBeenCalled();
    });

    test('logoutAll revokes all user tokens', async () => {
      tokenRepository.revokeAllForUser.mockResolvedValue({ count: 3 });

      await authService.logoutAll('user_123');

      expect(tokenRepository.revokeAllForUser).toHaveBeenCalledWith('user_123');
    });
  });
});
