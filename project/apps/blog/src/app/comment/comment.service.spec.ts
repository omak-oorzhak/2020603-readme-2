import { Comment } from '@project/shared-types';
import { CommentService } from './comment.service';
import { CommentRepository } from './comment.repository';
import { PostService } from '../post/post.service';
import {
  CommentDeleteForbiddenError,
  CommentNotFoundError,
} from './comment.errors';
import { PostNotFoundError } from '../post/post.errors';

const AUTHOR_ID = '2f4b7d3a-3c1b-4c4d-8b6a-8ef7b92f1011';
const OTHER_USER_ID = '9c8e7b6a-5f4d-43c2-9a1b-0e9d8c7b6a52';
const POST_ID = 'a1d2c3b4-5e6f-47a8-9b0c-1d2e3f4a5b6c';
const COMMENT_ID = '3a5c7e9d-2b1a-4f3e-8c7d-6b5a4c3d2e1f';

describe('CommentService', () => {
  let service: CommentService;
  let repository: jest.Mocked<
    Pick<CommentRepository, 'findById' | 'findByPostId' | 'save' | 'deleteById'>
  >;
  let postService: jest.Mocked<Pick<PostService, 'findPublishedPost'>>;

  beforeEach(() => {
    repository = {
      findById: jest.fn(),
      findByPostId: jest.fn(),
      save: jest.fn(),
      deleteById: jest.fn(),
    } as unknown as jest.Mocked<typeof repository>;
    postService = { findPublishedPost: jest.fn() } as unknown as jest.Mocked<
      typeof postService
    >;

    service = new CommentService(
      repository as unknown as CommentRepository,
      postService as unknown as PostService,
    );
  });

  it('creates a comment for a published post', async () => {
    postService.findPublishedPost.mockResolvedValue(
      {} as Awaited<ReturnType<PostService['findPublishedPost']>>,
    );
    repository.save.mockImplementation(async (comment) => comment);

    const comment = await service.createComment(
      POST_ID,
      { text: 'Отличная статья!' },
      AUTHOR_ID,
    );

    expect(postService.findPublishedPost).toHaveBeenCalledWith(POST_ID);
    expect(comment.authorId).toBe(AUTHOR_ID);
    expect(comment.postId).toBe(POST_ID);
  });

  it('rejects a comment for a missing post with 404, not a FK error', async () => {
    postService.findPublishedPost.mockRejectedValue(
      new PostNotFoundError(POST_ID),
    );

    await expect(
      service.createComment(POST_ID, { text: 'Отличная статья!' }, AUTHOR_ID),
    ).rejects.toBeInstanceOf(PostNotFoundError);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it("rejects deleting someone else's comment", async () => {
    repository.findById.mockResolvedValue(
      Object.assign(new Comment(), {
        id: COMMENT_ID,
        postId: POST_ID,
        authorId: AUTHOR_ID,
        text: 'Отличная статья!',
        createdAt: new Date(),
      }),
    );

    await expect(
      service.deleteComment(COMMENT_ID, OTHER_USER_ID),
    ).rejects.toBeInstanceOf(CommentDeleteForbiddenError);
    expect(repository.deleteById).not.toHaveBeenCalled();
  });

  it('reports a missing comment as not found', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(
      service.deleteComment(COMMENT_ID, AUTHOR_ID),
    ).rejects.toBeInstanceOf(CommentNotFoundError);
  });

  it('deletes an own comment', async () => {
    repository.findById.mockResolvedValue(
      Object.assign(new Comment(), {
        id: COMMENT_ID,
        postId: POST_ID,
        authorId: AUTHOR_ID,
        text: 'Отличная статья!',
        createdAt: new Date(),
      }),
    );

    await expect(
      service.deleteComment(COMMENT_ID, AUTHOR_ID),
    ).resolves.toBeUndefined();
    expect(repository.deleteById).toHaveBeenCalledWith(COMMENT_ID);
  });
});
