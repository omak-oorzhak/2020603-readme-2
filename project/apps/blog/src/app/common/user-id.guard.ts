import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { USER_ID_HEADER } from '@project/shared-types';
import { UserIdNotProvidedError } from './user-id.errors';

export type RequestWithUserId = Request & { userId?: string };

/**
 * Blog — внутренний сервис: JWT он не проверяет, а доверяет заголовку
 * `X-User-Id`, который проставляет API Gateway после верификации токена.
 * Guard лишь требует наличие идентификатора и кладёт его в запрос.
 */
@Injectable()
export class UserIdGuard implements CanActivate {
  public canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithUserId>();
    const userId = request.headers[USER_ID_HEADER];

    if (typeof userId !== 'string' || userId.trim().length === 0) {
      throw new UserIdNotProvidedError();
    }

    request.userId = userId;
    return true;
  }
}
