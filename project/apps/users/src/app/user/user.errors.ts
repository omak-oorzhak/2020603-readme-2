import {
  BusinessRuleViolationError,
  EntityNotFoundError,
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
