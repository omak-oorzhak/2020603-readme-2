import {
  AccessDeniedError,
  AuthenticationFailedError,
} from '@project/shared-errors';

export class TokenNotProvidedError extends AuthenticationFailedError {
  constructor() {
    super('Токен доступа не передан');
  }
}

export class InvalidTokenError extends AuthenticationFailedError {
  constructor() {
    super('Недействительный токен доступа');
  }
}

export class AlreadyAuthenticatedError extends AccessDeniedError {
  constructor() {
    super('Регистрация доступна только неавторизованным пользователям');
  }
}
