import { applyDecorators, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { USER_ID_HEADER } from '@project/shared-types';
import { UserIdGuard } from './user-id.guard';

/**
 * Маршрут требует идентификатор пользователя: guard + документация заголовка.
 */
export function RequireUserId() {
  return applyDecorators(
    UseGuards(UserIdGuard),
    ApiHeader({
      name: USER_ID_HEADER,
      description: 'Идентификатор текущего пользователя (проставляет API Gateway)',
      required: true,
    }),
    ApiUnauthorizedResponse({ description: 'Не передан идентификатор пользователя' }),
  );
}
