import { Injectable } from '@nestjs/common';
import type { User } from '@project/shared-types';
import { UserRepository, type CreateUserData } from './user.repository';
import { UserAlreadyExistsError, UserNotFoundError } from './user.errors';

/**
 * Публичный API модуля пользователей. Другие модули работают с пользователями
 * только через этот сервис: репозиторий — внутреннее дело модуля.
 */
@Injectable()
export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  /** Пользователь по идентификатору; отсутствие — ошибка домена. */
  public async getById(id: string): Promise<User> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new UserNotFoundError();
    }
    return user;
  }

  public async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findByEmail(email);
  }

  /** §1.2: email уникален — второй пользователь с тем же адресом невозможен. */
  public async create(data: CreateUserData): Promise<User> {
    const existing = await this.userRepository.findByEmail(data.email);
    if (existing) {
      throw new UserAlreadyExistsError(data.email);
    }
    return this.userRepository.create(data);
  }

  public async updatePasswordHash(
    id: string,
    passwordHash: string,
  ): Promise<User> {
    const updated = await this.userRepository.updatePasswordHash(
      id,
      passwordHash,
    );
    if (!updated) {
      throw new UserNotFoundError();
    }
    return updated;
  }
}
