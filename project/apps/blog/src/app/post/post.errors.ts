import {
  EntityNotFoundError,
  AccessDeniedError,
  BusinessRuleViolationError,
} from '@project/shared-errors';

export class PostNotFoundError extends EntityNotFoundError {
  constructor(postId: string) {
    super(`Публикация с id "${postId}" не найдена`);
  }
}

export class PostEditForbiddenError extends AccessDeniedError {
  constructor() {
    super('Редактировать можно только свои публикации');
  }
}

export class PostAlreadyRepostedError extends BusinessRuleViolationError {
  constructor(postId: string) {
    super(`Публикация "${postId}" уже была репостнута этим пользователем`);
  }
}

export class SelfRepostError extends BusinessRuleViolationError {
  constructor() {
    super('Нельзя репостить собственную публикацию');
  }
}
