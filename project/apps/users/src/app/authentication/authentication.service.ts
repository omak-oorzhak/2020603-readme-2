import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { User, type TokenPayload } from '@project/shared-types';
import { UserService } from '../user/user.service';
import { UserNotFoundError } from '../user/user.errors';
import { jwtConfig } from '../config';
import { PasswordHasher } from './password.hasher';
import { NotifyClientService } from '../notify-client/notify-client.service';
import type { CreateUserDto } from './dto/create-user.dto';
import type { LoginUserDto } from './dto/login-user.dto';
import type { ChangeUserPasswordDto } from './dto/change-user-password.dto';
import {
  InvalidPasswordError,
  InvalidRefreshTokenError,
} from './authentication.errors';

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

@Injectable()
export class AuthenticationService {
  constructor(
    private readonly userService: UserService,
    private readonly passwordHasher: PasswordHasher,
    private readonly jwtService: JwtService,
    @Inject(jwtConfig.KEY)
    private readonly tokenConfig: ConfigType<typeof jwtConfig>,
    private readonly notifyClient: NotifyClientService,
  ) {}

  public async register(dto: CreateUserDto): Promise<User> {
    const passwordHash = await this.passwordHasher.hash(dto.password);

    // Уникальность email проверяет UserService.create.
    const user = await this.userService.create({
      email: dto.email,
      name: dto.name,
      avatarUrl: dto.avatarUrl,
      passwordHash,
    });

    // §7.2: новый пользователь сразу становится получателем рассылки.
    this.notifyClient.publishUserRegistered(user);

    return user;
  }

  public async verifyUser(dto: LoginUserDto): Promise<User> {
    const user = await this.userService.findByEmail(dto.email);
    if (!user) {
      throw new UserNotFoundError();
    }

    const isPasswordValid = await this.passwordHasher.compare(
      dto.password,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      throw new InvalidPasswordError();
    }

    return user;
  }

  public async createTokens(user: User): Promise<AuthTokens> {
    const payload: TokenPayload = {
      sub: user.id,
      email: user.email,
      name: user.name,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.tokenConfig.accessTokenSecret,
        expiresIn: this.tokenConfig.accessTokenExpiresIn,
      }),
      this.jwtService.signAsync(payload, {
        secret: this.tokenConfig.refreshTokenSecret,
        expiresIn: this.tokenConfig.refreshTokenExpiresIn,
      }),
    ]);

    return { accessToken, refreshToken };
  }

  /** Обменивает refresh-токен на новую пару токенов. */
  public async verifyRefreshToken(refreshToken: string): Promise<User> {
    let payload: TokenPayload;

    try {
      payload = await this.jwtService.verifyAsync<TokenPayload>(refreshToken, {
        secret: this.tokenConfig.refreshTokenSecret,
      });
    } catch {
      throw new InvalidRefreshTokenError();
    }

    return this.userService.getById(payload.sub);
  }

  public async changePassword(
    id: string,
    dto: ChangeUserPasswordDto,
  ): Promise<User> {
    const user = await this.userService.getById(id);

    const isPasswordValid = await this.passwordHasher.compare(
      dto.currentPassword,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      throw new InvalidPasswordError();
    }

    const passwordHash = await this.passwordHasher.hash(dto.newPassword);
    return this.userService.updatePasswordHash(id, passwordHash);
  }
}
