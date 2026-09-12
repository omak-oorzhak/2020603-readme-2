import {
  EntityNotFoundError,
  BusinessRuleViolationError,
  AuthenticationFailedError,
} from '@project/shared-errors';

export class UserNotFoundError extends EntityNotFoundError {
  constructor() {
    super('Пользователь не найден');
  }
}

export class UserAlreadyExistsError extends BusinessRuleViolationError {
  constructor(email: string) {
    super(`Пользователь с email "${email}" уже зарегистрирован`);
  }
}

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
