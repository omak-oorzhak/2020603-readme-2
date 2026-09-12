import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { servicesConfig } from '../config';

export interface UserResponse {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  createdAt: string;
  postsCount: number;
  subscribersCount: number;
}

export interface LoginResponse {
  id: string;
  email: string;
  accessToken: string;
  refreshToken: string;
}

export interface UserInfo {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class UsersClient {
  constructor(
    private readonly httpService: HttpService,
    @Inject(servicesConfig.KEY)
    private readonly config: ConfigType<typeof servicesConfig>,
  ) {}

  public async register(data: {
    email: string;
    name: string;
    password: string;
    avatarUrl?: string;
  }): Promise<UserResponse> {
    const { data: body } = await firstValueFrom(
      this.httpService.post<UserResponse>(
        `${this.config.usersServiceUrl}/auth/register`,
        data,
      ),
    );
    return body;
  }

  public async login(data: {
    email: string;
    password: string;
  }): Promise<LoginResponse> {
    const { data: body } = await firstValueFrom(
      this.httpService.post<LoginResponse>(
        `${this.config.usersServiceUrl}/auth/login`,
        data,
      ),
    );
    return body;
  }

  public async refresh(data: { refreshToken: string }): Promise<LoginResponse> {
    const { data: body } = await firstValueFrom(
      this.httpService.post<LoginResponse>(
        `${this.config.usersServiceUrl}/auth/refresh`,
        data,
      ),
    );
    return body;
  }

  public async getUser(id: string): Promise<UserResponse> {
    const { data: body } = await firstValueFrom(
      this.httpService.get<UserResponse>(
        `${this.config.usersServiceUrl}/auth/${id}`,
      ),
    );
    return body;
  }

  public async changePassword(
    id: string,
    data: { currentPassword: string; newPassword: string },
  ): Promise<UserResponse> {
    const { data: body } = await firstValueFrom(
      this.httpService.patch<UserResponse>(
        `${this.config.usersServiceUrl}/auth/${id}/password`,
        data,
      ),
    );
    return body;
  }

  public async getUserInfoMap(
    ids: string[],
  ): Promise<Map<string, UserInfo | null>> {
    const uniqueIds = [...new Set(ids)];
    const entries = await Promise.all(
      uniqueIds.map(async (id) => {
        if (!UUID_RE.test(id)) {
          return [id, null] as const;
        }
        try {
          const user = await this.getUser(id);
          return [
            id,
            {
              id: user.id,
              name: user.name,
              email: user.email,
              avatarUrl: user.avatarUrl,
            },
          ] as const;
        } catch {
          return [id, null] as const;
        }
      }),
    );
    return new Map(entries);
  }
}
