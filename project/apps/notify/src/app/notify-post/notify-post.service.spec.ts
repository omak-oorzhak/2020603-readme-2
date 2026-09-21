import { PostType } from '@project/shared-types';
import { NotifyPostService } from './notify-post.service';
import { NotifyPostRepository } from './notify-post.repository';
import type { NotifyPostEntity } from './notify-post.entity';

const POST_ID = 'a1d2c3b4-5e6f-47a8-9b0c-1d2e3f4a5b6c';

describe('NotifyPostService', () => {
  let service: NotifyPostService;
  let repository: jest.Mocked<
    Pick<NotifyPostRepository, 'upsert' | 'deletePending'>
  >;

  beforeEach(() => {
    repository = {
      upsert: jest.fn(),
      deletePending: jest.fn(),
    };
    service = new NotifyPostService(
      repository as unknown as NotifyPostRepository,
    );
  });

  it('queues a published post for the next newsletter', async () => {
    const dto = {
      postId: POST_ID,
      title: 'Мой первый пост о TypeScript разработке',
      type: PostType.Text,
      authorId: '2f4b7d3a-3c1b-4c4d-8b6a-8ef7b92f1011',
      publishedAt: new Date('2026-09-01T00:00:00.000Z'),
    };
    const entity = { ...dto, id: 'row-id' } as unknown as NotifyPostEntity;
    repository.upsert.mockResolvedValue(entity);

    await expect(service.addPost(dto)).resolves.toBe(entity);
    expect(repository.upsert).toHaveBeenCalledWith(dto);
  });

  it('removes an unpublished post from the pending queue only', async () => {
    repository.deletePending.mockResolvedValue(1);

    await expect(service.removePendingPost(POST_ID)).resolves.toBeUndefined();
    expect(repository.deletePending).toHaveBeenCalledWith(POST_ID);
  });

  it('is a no-op when the post is not pending', async () => {
    repository.deletePending.mockResolvedValue(0);

    await expect(service.removePendingPost(POST_ID)).resolves.toBeUndefined();
  });
});
