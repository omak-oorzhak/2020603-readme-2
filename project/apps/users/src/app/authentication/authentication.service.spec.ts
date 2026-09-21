
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { User } from '@project/shared-types';
import { AuthenticationService } from './authentication.service';
import { PasswordHasher } from './password.hasher';
import { UserService } from '../user/user.service';
import { UserAlreadyExistsError } from '../user/user.errors';
import { NotifyClientService } from '../notify-client/notify-client.service';
import { jwtConfig } from '../config';
import { InvalidRefreshTokenError } from './authentication.errors';

describe('AuthenticationService', () => {
  let service: AuthenticationService;
  let jwtService: Pick<JwtService, 'signAsync' | 'verifyAsync'>;
  let userServiceMock: jest.Mocked<
    Pick<UserService, 'getById' | 'findByEmail' | 'create' | 'updatePasswordHash'>
  >;
  let notifyClientMock: Pick<NotifyClientService, 'publishUserRegistered'>;

  beforeEach(async () => {
    userServiceMock = {
      getById: jest.fn(),
      findByEmail: jest.fn(),
      create: jest.fn(),
      updatePasswordHash: jest.fn(),
    };
    notifyClientMock = { publishUserRegistered: jest.fn() };
    jwtService = {
      signAsync: jest
        .fn()
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token'),
      verifyAsync: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthenticationService,
        PasswordHasher,
        { provide: UserService, useValue: userServiceMock },
        { provide: NotifyClientService, useValue: notifyClientMock },
        { provide: JwtService, useValue: jwtService },
        {
          provide: jwtConfig.KEY,
          useValue: {
            accessTokenSecret: 'access-token-secret-for-tests',
            accessTokenExpiresIn: '15m',
            refreshTokenSecret: 'refresh-token-secret-for-tests',
            refreshTokenExpiresIn: '7d',
          },
        },
      ],
    }).compile();

    service = module.get<AuthenticationService>(AuthenticationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create access and refresh tokens', async () => {
    const user = Object.assign(new User(), {
      id: 'user-id',
      email: 'user@example.com',
      name: 'Иван Иванов',
    });

    await expect(service.createTokens(user)).resolves.toEqual({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });

    expect(jwtService.signAsync).toHaveBeenNthCalledWith(
      1,
      { sub: user.id, email: user.email, name: user.name },
      {
        secret: 'access-token-secret-for-tests',
        expiresIn: '15m',
      },
    );
    expect(jwtService.signAsync).toHaveBeenNthCalledWith(
      2,
      { sub: user.id, email: user.email, name: user.name },
      {
        secret: 'refresh-token-secret-for-tests',
        expiresIn: '7d',
      },
    );
  });

  it('should publish user.registered event after registration', async () => {
    const created = Object.assign(new User(), {
      id: '2f4b7d3a-3c1b-4c4d-8b6a-8ef7b92f1011',
      email: 'new@example.com',
      name: 'Новый Пользователь',
    });
    userServiceMock.create.mockResolvedValue(created);

    await expect(
      service.register({
        email: 'new@example.com',
        name: 'Новый Пользователь',
        password: 'secret123',
      }),
    ).resolves.toBe(created);

    expect(userServiceMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'new@example.com',
        passwordHash: expect.not.stringContaining('secret123'),
      }),
    );
    expect(notifyClientMock.publishUserRegistered).toHaveBeenCalledWith(created);
  });

  it('should not publish an event when the email is taken', async () => {
    userServiceMock.create.mockRejectedValue(
      new UserAlreadyExistsError('taken@example.com'),
    );

    await expect(
      service.register({
        email: 'taken@example.com',
        name: 'Дубль Пользователь',
        password: 'secret123',
      }),
    ).rejects.toBeInstanceOf(UserAlreadyExistsError);

    expect(notifyClientMock.publishUserRegistered).not.toHaveBeenCalled();
  });

  describe('verifyRefreshToken', () => {
    it('returns the user behind a valid refresh token', async () => {
      const user = Object.assign(new User(), {
        id: '2f4b7d3a-3c1b-4c4d-8b6a-8ef7b92f1011',
        email: 'user@example.com',
        name: 'Иван Иванов',
      });
      (jwtService.verifyAsync as jest.Mock).mockResolvedValue({
        sub: user.id,
        email: user.email,
        name: user.name,
      });
      userServiceMock.getById.mockResolvedValue(user);

      await expect(service.verifyRefreshToken('refresh.token')).resolves.toBe(
        user,
      );
      expect(jwtService.verifyAsync).toHaveBeenCalledWith('refresh.token', {
        secret: 'refresh-token-secret-for-tests',
      });
    });

    it('rejects an expired or forged refresh token', async () => {
      (jwtService.verifyAsync as jest.Mock).mockRejectedValue(
        new Error('jwt expired'),
      );

      await expect(
        service.verifyRefreshToken('stale.token'),
      ).rejects.toBeInstanceOf(InvalidRefreshTokenError);
      expect(userServiceMock.getById).not.toHaveBeenCalled();
    });
  });
});
