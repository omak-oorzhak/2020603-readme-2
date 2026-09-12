import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import { USER_ID_HEADER } from '@project/shared-types';
import type { RequestWithUserId } from './user-id.guard';

/**
 * Идентификатор текущего пользователя из заголовка `X-User-Id`.
 * На публичных маршрутах (без `@RequireUserId()`) может быть `undefined`.
 */
export const CurrentUserId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest<RequestWithUserId>();
    const header = request.headers[USER_ID_HEADER];
    return request.userId ?? (typeof header === 'string' ? header : undefined);
  },
);
