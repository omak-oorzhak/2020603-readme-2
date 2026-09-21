import { PostStatus, PostType, TextPost } from '@project/shared-types';
import type { Post } from '@project/shared-types';
import { PostService } from './post.service';
import { PostRepository } from './post.repository';
import { NotifyClientService } from '../notify-client/notify-client.service';
import { SubscriptionService } from '../subscription/subscription.service';
import {
  PostAlreadyRepostedError,
  PostEditForbiddenError,
  PostNotFoundError,
  SelfRepostError,
} from './post.errors';

const AUTHOR_ID = '2f4b7d3a-3c1b-4c4d-8b6a-8ef7b92f1011';
const OTHER_USER_ID = '9c8e7b6a-5f4d-43c2-9a1b-0e9d8c7b6a52';
const POST_ID = 'a1d2c3b4-5e6f-47a8-9b0c-1d2e3f4a5b6c';

function buildPost(overrides: Partial<TextPost> = {}): Post {
  return Object.assign(new TextPost(), {
    id: POST_ID,
    status: PostStatus.Published,
    authorId: AUTHOR_ID,
    isRepost: false,
    tags: ['nestjs'],
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    publishedAt: new Date('2026-01-01T00:00:00.000Z'),
    likesCount: 0,
    commentsCount: 0,
    title: 'Мой первый пост о TypeScript разработке',
    announce: 'a'.repeat(60),
    text: 'b'.repeat(120),
    ...overrides,
  });
}

describe('PostService', () => {
  let service: PostService;
  let repository: jest.Mocked<
    Pick<
      PostRepository,
      | 'findById'
      | 'findRepost'
      | 'save'
      | 'update'
      | 'softDeleteById'
      | 'findPublishedByAuthors'
    >
  >;
  let notifyClient: jest.Mocked<
    Pick<NotifyClientService, 'publishPostPublished' | 'publishPostUnpublished'>
  >;
  let subscriptionService: jest.Mocked<
    Pick<SubscriptionService, 'findFollowingIds'>
  >;

  beforeEach(() => {
    repository = {
      findById: jest.fn(),
      findRepost: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      softDeleteById: jest.fn(),
      findPublishedByAuthors: jest.fn(),
    } as unknown as jest.Mocked<typeof repository>;
    notifyClient = {
      publishPostPublished: jest.fn(),
      publishPostUnpublished: jest.fn(),
    };
    subscriptionService = { findFollowingIds: jest.fn() };

    service = new PostService(
      repository as unknown as PostRepository,
      notifyClient as unknown as NotifyClientService,
      subscriptionService as unknown as SubscriptionService,
    );
  });

  describe('findFeed', () => {
    it('combines own posts with followed authors without duplicates', async () => {
      subscriptionService.findFollowingIds.mockResolvedValue([
        OTHER_USER_ID,
        AUTHOR_ID,
      ]);
      const page = {
        entities: [],
        totalPages: 0,
        totalItems: 0,
        currentPage: 1,
        itemsPerPage: 25,
      };
      repository.findPublishedByAuthors.mockResolvedValue(page);

      await expect(service.findFeed(AUTHOR_ID, {})).resolves.toBe(page);
      expect(subscriptionService.findFollowingIds).toHaveBeenCalledWith(
        AUTHOR_ID,
      );
      expect(repository.findPublishedByAuthors).toHaveBeenCalledWith(
        [AUTHOR_ID, OTHER_USER_ID],
        {},
      );
    });
  });

  describe('findPost', () => {
    it('returns a published post to anyone', async () => {
      const post = buildPost();
      repository.findById.mockResolvedValue(post);

      await expect(service.findPost(POST_ID)).resolves.toBe(post);
    });

    it('returns an own draft to its author', async () => {
      const draft = buildPost({ status: PostStatus.Draft });
      repository.findById.mockResolvedValue(draft);

      await expect(service.findPost(POST_ID, AUTHOR_ID)).resolves.toBe(draft);
    });

    it("hides someone else's draft behind 404", async () => {
      repository.findById.mockResolvedValue(
        buildPost({ status: PostStatus.Draft }),
      );

      await expect(
        service.findPost(POST_ID, OTHER_USER_ID),
      ).rejects.toBeInstanceOf(PostNotFoundError);
    });
  });

  describe('findPublishedPost', () => {
    it('rejects a draft even for its author', async () => {
      repository.findById.mockResolvedValue(
        buildPost({ status: PostStatus.Draft }),
      );

      await expect(
        service.findPublishedPost(POST_ID),
      ).rejects.toBeInstanceOf(PostNotFoundError);
    });

    it('rejects a missing post', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(
        service.findPublishedPost(POST_ID),
      ).rejects.toBeInstanceOf(PostNotFoundError);
    });
  });

  describe('updatePost', () => {
    it("rejects editing someone else's post", async () => {
      repository.findById.mockResolvedValue(buildPost());

      await expect(
        service.updatePost(POST_ID, { title: 'x'.repeat(25) }, OTHER_USER_ID),
      ).rejects.toBeInstanceOf(PostEditForbiddenError);
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('applies only the provided fields and normalizes tags', async () => {
      repository.findById.mockResolvedValue(buildPost());
      repository.update.mockImplementation(async (post) => post);

      const updated = await service.updatePost(
        POST_ID,
        {
          // undefined-поля скомпилированного DTO не должны затирать данные
          title: undefined,
          status: PostStatus.Draft,
          tags: ['NestJS', 'nestjs', 'Prisma'],
        },
        AUTHOR_ID,
      );

      expect(updated.title).toBe('Мой первый пост о TypeScript разработке');
      expect(updated.status).toBe(PostStatus.Draft);
      expect(updated.tags).toEqual(['nestjs', 'prisma']);
    });

    describe('newsletter sync', () => {
      beforeEach(() => {
        repository.update.mockImplementation(async (post) => post);
      });

      it('unpublishes a post that became a draft', async () => {
        repository.findById.mockResolvedValue(buildPost());

        await service.updatePost(POST_ID, { status: PostStatus.Draft }, AUTHOR_ID);

        expect(notifyClient.publishPostUnpublished).toHaveBeenCalledWith(POST_ID);
        expect(notifyClient.publishPostPublished).not.toHaveBeenCalled();
      });

      it('publishes a draft that returned to published', async () => {
        repository.findById.mockResolvedValue(
          buildPost({ status: PostStatus.Draft }),
        );

        const updated = await service.updatePost(
          POST_ID,
          { status: PostStatus.Published },
          AUTHOR_ID,
        );

        expect(notifyClient.publishPostPublished).toHaveBeenCalledWith(updated);
        expect(notifyClient.publishPostUnpublished).not.toHaveBeenCalled();
      });

      it('re-sends an edited published post so the digest gets the new title', async () => {
        repository.findById.mockResolvedValue(buildPost());

        const updated = await service.updatePost(
          POST_ID,
          { title: 'Новый заголовок поста о TypeScript' },
          AUTHOR_ID,
        );

        expect(notifyClient.publishPostPublished).toHaveBeenCalledWith(updated);
      });

      it('stays silent when a draft is edited', async () => {
        repository.findById.mockResolvedValue(
          buildPost({ status: PostStatus.Draft }),
        );

        await service.updatePost(
          POST_ID,
          { title: 'Правка черновика о TypeScript и NestJS' },
          AUTHOR_ID,
        );

        expect(notifyClient.publishPostPublished).not.toHaveBeenCalled();
        expect(notifyClient.publishPostUnpublished).not.toHaveBeenCalled();
      });
    });
  });

  describe('deletePost', () => {
    it("rejects deleting someone else's post", async () => {
      repository.findById.mockResolvedValue(buildPost());

      await expect(
        service.deletePost(POST_ID, OTHER_USER_ID),
      ).rejects.toBeInstanceOf(PostEditForbiddenError);
      expect(repository.softDeleteById).not.toHaveBeenCalled();
    });

    it('removes a published post from the newsletter queue', async () => {
      repository.findById.mockResolvedValue(buildPost());

      await service.deletePost(POST_ID, AUTHOR_ID);

      expect(repository.softDeleteById).toHaveBeenCalledWith(POST_ID);
      expect(notifyClient.publishPostUnpublished).toHaveBeenCalledWith(POST_ID);
    });

    it('does not notify when a draft is deleted', async () => {
      repository.findById.mockResolvedValue(
        buildPost({ status: PostStatus.Draft }),
      );

      await service.deletePost(POST_ID, AUTHOR_ID);

      expect(repository.softDeleteById).toHaveBeenCalledWith(POST_ID);
      expect(notifyClient.publishPostUnpublished).not.toHaveBeenCalled();
    });
  });

  describe('repost', () => {
    it('rejects reposting your own publication', async () => {
      repository.findById.mockResolvedValue(buildPost());

      await expect(service.repost(POST_ID, AUTHOR_ID)).rejects.toBeInstanceOf(
        SelfRepostError,
      );
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('rejects reposting a draft', async () => {
      repository.findById.mockResolvedValue(
        buildPost({ status: PostStatus.Draft }),
      );

      await expect(
        service.repost(POST_ID, OTHER_USER_ID),
      ).rejects.toBeInstanceOf(PostNotFoundError);
    });

    it('rejects a second repost of the same publication', async () => {
      repository.findById.mockResolvedValue(buildPost());
      repository.findRepost.mockResolvedValue(buildPost({ isRepost: true }));

      await expect(
        service.repost(POST_ID, OTHER_USER_ID),
      ).rejects.toBeInstanceOf(PostAlreadyRepostedError);
    });

    it('copies the post, keeps the original author and notifies', async () => {
      repository.findById.mockResolvedValue(buildPost());
      repository.findRepost.mockResolvedValue(null);
      repository.save.mockImplementation(async (post) => post);

      const reposted = await service.repost(POST_ID, OTHER_USER_ID);

      expect(reposted.authorId).toBe(OTHER_USER_ID);
      expect(reposted.originalAuthorId).toBe(AUTHOR_ID);
      expect(reposted.originalPostId).toBe(POST_ID);
      expect(reposted.isRepost).toBe(true);
      expect(reposted.type).toBe(PostType.Text);
      expect(notifyClient.publishPostPublished).toHaveBeenCalledWith(reposted);
    });
  });
});
