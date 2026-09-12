import { CanActivate, ExecutionContext, Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import type { TokenPayload } from '@project/shared-types';
import { jwtConfig } from '../config';

/**
 * Необязательная авторизация: маршрут остаётся публичным, но при валидном
 * Bearer-токене заполняет `request.user`. Нужен там, где ответ зависит от
 * того, кто спрашивает — например, автор видит свой черновик по прямой ссылке.
 */
@Injectable()
export class OptionalJwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    @Inject(jwtConfig.KEY)
    private readonly tokenConfig: ConfigType<typeof jwtConfig>,
  ) {}

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: TokenPayload }>();
    const [type, token] = (request.headers.authorization ?? '').split(' ');

    if (type !== 'Bearer' || !token) {
      return true;
    }

    try {
      request.user = await this.jwtService.verifyAsync<TokenPayload>(token, {
        secret: this.tokenConfig.accessTokenSecret,
      });
    } catch {
      // Недействительный токен не блокирует публичный маршрут.
    }

    return true;
  }
}
