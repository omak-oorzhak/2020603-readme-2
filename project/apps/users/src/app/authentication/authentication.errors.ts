import { AuthenticationFailedError } from '@project/shared-errors';

export class InvalidPasswordError extends AuthenticationFailedError {
  constructor() {
    super('Неверный пароль');
  }
}

export class InvalidRefreshTokenError extends AuthenticationFailedError {
  constructor() {
    super('Недействительный refresh-токен');
  }
}
