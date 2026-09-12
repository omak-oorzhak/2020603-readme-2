import { Injectable } from '@nestjs/common';
import { fillRdo } from '@project/shared-helpers';
import { UsersClient } from '../clients/users.client';
import { FileStorageClient } from '../clients/file-storage.client';
import { RegisterUserDto } from './dto/register-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { ChangeUserPasswordDto } from './dto/change-user-password.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { UserRdo } from './rdo/user.rdo';
import { LoggedUserRdo } from './rdo/logged-user.rdo';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersClient: UsersClient,
    private readonly fileStorageClient: FileStorageClient,
  ) {}

  public async register(
    dto: RegisterUserDto,
    file?: Express.Multer.File,
  ): Promise<UserRdo> {
    let avatarUrl: string | undefined;

    if (file) {
      const stored = await this.fileStorageClient.uploadAvatar(file);
      avatarUrl = stored.url;
    }

    const user = await this.usersClient.register({
      email: dto.email,
      name: dto.name,
      password: dto.password,
      avatarUrl,
    });

    return fillRdo(UserRdo, user);
  }

  public async login(dto: LoginUserDto): Promise<LoggedUserRdo> {
    const result = await this.usersClient.login(dto);
    return fillRdo(LoggedUserRdo, result);
  }

  public async refresh(dto: RefreshTokenDto): Promise<LoggedUserRdo> {
    const result = await this.usersClient.refresh(dto);
    return fillRdo(LoggedUserRdo, result);
  }

  public async changePassword(
    userId: string,
    dto: ChangeUserPasswordDto,
  ): Promise<UserRdo> {
    const user = await this.usersClient.changePassword(userId, dto);
    return fillRdo(UserRdo, user);
  }
}
