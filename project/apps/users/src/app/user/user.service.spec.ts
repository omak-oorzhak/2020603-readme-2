import { User } from '@project/shared-types';
import { UserService } from './user.service';
import { UserRepository } from './user.repository';
import { UserAlreadyExistsError, UserNotFoundError } from './user.errors';

const USER_ID = '2f4b7d3a-3c1b-4c4d-8b6a-8ef7b92f1011';

function buildUser(): User {
  return Object.assign(new User(), {
    id: USER_ID,
    email: 'ivan@example.com',
    name: 'Иван Иванов',
    passwordHash: 'hash',
  });
}

describe('UserService', () => {
  let service: UserService;
  let repository: jest.Mocked<
    Pick<UserRepository, 'findById' | 'findByEmail' | 'create' | 'updatePasswordHash'>
  >;

  beforeEach(() => {
    repository = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      create: jest.fn(),
      updatePasswordHash: jest.fn(),
    };
    service = new UserService(repository as unknown as UserRepository);
  });

  describe('getById', () => {
    it('returns an existing user', async () => {
      const user = buildUser();
      repository.findById.mockResolvedValue(user);

      await expect(service.getById(USER_ID)).resolves.toBe(user);
    });

    it('throws UserNotFoundError for an unknown id', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.getById(USER_ID)).rejects.toBeInstanceOf(
        UserNotFoundError,
      );
    });
  });

  describe('create', () => {
    const data = {
      email: 'ivan@example.com',
      name: 'Иван Иванов',
      passwordHash: 'hash',
    };

    it('creates a user with a free email', async () => {
      const user = buildUser();
      repository.findByEmail.mockResolvedValue(null);
      repository.create.mockResolvedValue(user);

      await expect(service.create(data)).resolves.toBe(user);
      expect(repository.create).toHaveBeenCalledWith(data);
    });

    it('rejects a taken email without touching storage', async () => {
      repository.findByEmail.mockResolvedValue(buildUser());

      await expect(service.create(data)).rejects.toBeInstanceOf(
        UserAlreadyExistsError,
      );
      expect(repository.create).not.toHaveBeenCalled();
    });
  });

  describe('updatePasswordHash', () => {
    it('throws UserNotFoundError when nothing was updated', async () => {
      repository.updatePasswordHash.mockResolvedValue(null);

      await expect(
        service.updatePasswordHash(USER_ID, 'new-hash'),
      ).rejects.toBeInstanceOf(UserNotFoundError);
    });
  });
});
