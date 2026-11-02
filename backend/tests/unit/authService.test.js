'use strict';

const bcrypt = require('bcryptjs');
const authService = require('../../src/services/authService');
const userModel = require('../../src/models/userModel');
const emailService = require('../../src/services/emailService');
const { UnauthorizedError, ConflictError, ValidationError } = require('../../src/utils/errors');

jest.mock('../../src/models/userModel');
jest.mock('../../src/services/emailService');

describe('AuthService - Direct Login & Signup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('signup hashes password and creates user', async () => {
    userModel.usernameExists.mockResolvedValue(false);
    userModel.emailExists.mockResolvedValue(false);
    userModel.create.mockResolvedValue({
      UserId: 10,
      Username: 'newoperator',
      Email: 'op@example.com',
      Role: 'Operator',
      IsActive: 1,
    });

    const user = await authService.signup({
      username: 'newoperator',
      password: 'StrongPassword123',
      email: 'op@example.com',
      role: 'Operator',
    });

    expect(userModel.usernameExists).toHaveBeenCalledWith('newoperator');
    expect(userModel.create).toHaveBeenCalled();
    expect(user.Username).toBe('newoperator');
    expect(user.Password).toBeUndefined();
  });

  test('signup throws ConflictError if username is taken', async () => {
    userModel.usernameExists.mockResolvedValue(true);

    await expect(
      authService.signup({
        username: 'existinguser',
        password: 'Password123',
      })
    ).rejects.toThrow(ConflictError);
  });

  test('login succeeds with correct password and updates last login', async () => {
    const rawPassword = 'ValidPassword123';
    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    userModel.findByUsername.mockResolvedValue({
      UserId: 1,
      Username: 'john_doe',
      Password: hashedPassword,
      Role: 'Operator',
      IsActive: 1,
    });
    userModel.updateLastLogin.mockResolvedValue();

    const result = await authService.login('john_doe', rawPassword);

    expect(result.user).toBeDefined();
    expect(result.user.Username).toBe('john_doe');
    expect(result.user.Password).toBeUndefined();
    expect(userModel.updateLastLogin).toHaveBeenCalledWith(1);
  });

  test('login throws UnauthorizedError for non-existent user', async () => {
    userModel.findByUsername.mockResolvedValue(null);

    await expect(
      authService.login('nonexistent', 'anyPassword')
    ).rejects.toThrow(UnauthorizedError);
  });

  test('login throws UnauthorizedError for wrong password', async () => {
    const hashedPassword = await bcrypt.hash('CorrectPassword123', 10);
    userModel.findByUsername.mockResolvedValue({
      UserId: 2,
      Username: 'jane_doe',
      Password: hashedPassword,
      IsActive: 1,
    });

    await expect(
      authService.login('jane_doe', 'WrongPassword123')
    ).rejects.toThrow(UnauthorizedError);
  });

  test('login throws UnauthorizedError for deactivated account', async () => {
    const hashedPassword = await bcrypt.hash('Secret123', 10);
    userModel.findByUsername.mockResolvedValue({
      UserId: 3,
      Username: 'inactive_user',
      Password: hashedPassword,
      IsActive: 0,
    });

    await expect(
      authService.login('inactive_user', 'Secret123')
    ).rejects.toThrow(UnauthorizedError);
  });

  test('sendTestEmail delivers to the current user profile email', async () => {
    userModel.findById.mockResolvedValue({
      UserId: 5,
      Username: 'operator',
      Email: 'operator@example.com',
    });
    emailService.sendTestEmail.mockResolvedValue({ messageId: 'message-1' });

    await expect(authService.sendTestEmail(5)).resolves.toEqual({
      recipient: 'operator@example.com',
    });
    expect(emailService.sendTestEmail).toHaveBeenCalledWith({
      recipient: 'operator@example.com',
      username: 'operator',
    });
  });

  test('sendTestEmail rejects users without a profile email address', async () => {
    userModel.findById.mockResolvedValue({
      UserId: 5,
      Username: 'operator',
      Email: null,
    });

    await expect(authService.sendTestEmail(5)).rejects.toThrow(ValidationError);
    expect(emailService.sendTestEmail).not.toHaveBeenCalled();
  });
});
