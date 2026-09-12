import { AuthenticationFailedError } from '@project/shared-errors';

export class UserIdNotProvidedError extends AuthenticationFailedError {
  constructor() {
    super('Не передан идентификатор пользователя (заголовок X-User-Id)');
  }
}
