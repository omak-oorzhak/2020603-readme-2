import { Module } from '@nestjs/common';
import { UserRepository } from './user.repository';

/**
 * Модуль данных пользователя: HTTP-маршруты живут в AuthenticationModule,
 * наружу отдаём только репозиторий.
 */
@Module({
  providers: [UserRepository],
  exports: [UserRepository],
})
export class UserModule {}
