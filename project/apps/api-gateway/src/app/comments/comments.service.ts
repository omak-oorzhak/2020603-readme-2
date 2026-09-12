import { Injectable } from '@nestjs/common';
import type { PaginationResult } from '@project/shared-types';
import {
  fillRdo,
  fillRdoPagination,
} from '@project/shared-helpers';
import { BlogClient, type BlogComment } from '../clients/blog.client';
import { UsersClient, type UserInfo } from '../clients/users.client';
import { GetCommentQueryDto } from './dto/get-comment-query.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CommentWithAuthorRdo } from './rdo/comment-with-author.rdo';

type EnrichedComment = BlogComment & { author: UserInfo | null };

@Injectable()
export class CommentsService {
  constructor(
    private readonly blogClient: BlogClient,
    private readonly usersClient: UsersClient,
  ) {}

  public async getComments(
    postId: string,
    query: GetCommentQueryDto,
  ): Promise<PaginationResult<CommentWithAuthorRdo>> {
    const comments = await this.blogClient.getComments(postId, query);
    if (comments.entities.length === 0) {
      return fillRdoPagination(CommentWithAuthorRdo, comments);
    }
    const authorIds = comments.entities.map((c) => c.authorId);
    const authorMap = await this.usersClient.getUserInfoMap(authorIds);
    const enriched: PaginationResult<EnrichedComment> = {
      ...comments,
      entities: comments.entities.map((c) => ({
        ...c,
        author: authorMap.get(c.authorId) ?? null,
      })),
    };
    return fillRdoPagination(CommentWithAuthorRdo, enriched);
  }

  public async createComment(
    userId: string,
    postId: string,
    dto: CreateCommentDto,
  ): Promise<CommentWithAuthorRdo> {
    const comment = await this.blogClient.createComment(userId, postId, dto);
    const authorMap = await this.usersClient.getUserInfoMap([comment.authorId]);
    return fillRdo(CommentWithAuthorRdo, {
      ...comment,
      author: authorMap.get(comment.authorId) ?? null,
    } satisfies EnrichedComment);
  }

  public async deleteComment(
    userId: string,
    postId: string,
    commentId: string,
  ): Promise<void> {
    await this.blogClient.deleteComment(userId, postId, commentId);
  }
}
