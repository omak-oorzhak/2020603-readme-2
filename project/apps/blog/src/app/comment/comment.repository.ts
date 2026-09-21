import { Injectable } from '@nestjs/common';
import { Comment } from '@project/shared-types';
import type { PaginationResult } from '@project/shared-types';
import { PrismaService } from '../prisma/prisma.service';
import { DEFAULT_LIMIT } from './comment.constant';
import type { CommentQuery } from './comment-query.type';

type CommentRecord = {
  id: string;
  postId: string;
  authorId: string;
  text: string;
  createdAt: Date;
};

// Мягкое удаление: удалённые комментарии остаются в таблице (на них в будущем
// могут ссылаться ответы), поэтому каждое чтение исключает их явно.
const NOT_DELETED = { deletedAt: null };

@Injectable()
export class CommentRepository {
  constructor(private readonly prisma: PrismaService) {}

  private toDomain(record: CommentRecord): Comment {
    const comment = new Comment();
    comment.id = record.id;
    comment.postId = record.postId;
    comment.authorId = record.authorId;
    comment.text = record.text;
    comment.createdAt = record.createdAt;
    return comment;
  }

  public async findByPostId(
    postId: string,
    query: CommentQuery = {},
  ): Promise<PaginationResult<Comment>> {
    const { limit = DEFAULT_LIMIT, page = 1 } = query;

    const where = { postId, ...NOT_DELETED };
    const [totalItems, records] = await this.prisma.$transaction([
      this.prisma.comment.count({ where }),
      this.prisma.comment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      entities: records.map((record) => this.toDomain(record)),
      totalPages: Math.ceil(totalItems / limit),
      totalItems,
      currentPage: page,
      itemsPerPage: limit,
    };
  }

  public async findById(id: string): Promise<Comment | null> {
    const record = await this.prisma.comment.findFirst({
      where: { id, ...NOT_DELETED },
    });
    return record ? this.toDomain(record) : null;
  }

  public async save(comment: Comment): Promise<Comment> {
    const record = await this.prisma.comment.create({
      data: {
        postId: comment.postId,
        authorId: comment.authorId,
        text: comment.text,
      },
    });
    return this.toDomain(record);
  }

  /** Мягкое удаление: комментарий помечается удалённым и пропадает из выборок. */
  public async softDeleteById(id: string): Promise<void> {
    await this.prisma.comment.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
