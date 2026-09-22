import { Injectable } from '@nestjs/common';
import {
  LinkPost,
  PhotoPost,
  PostStatus,
  PostType,
  QuotePost,
  TextPost,
  VideoPost,
} from '@project/shared-types';
import type { PaginationResult, Post } from '@project/shared-types';
import { PrismaService } from '../prisma/prisma.service';
import { DEFAULT_LIMIT, SEARCH_LIMIT } from './post.constant';
import type { PostQuery } from './post-query.type';

// Запись таблицы posts вместе со связями, нужными для маппинга в домен.
type PostWithRelations = {
  id: string;
  type: string;
  status: string;
  authorId: string;
  isRepost: boolean;
  originalAuthorId: string | null;
  originalPostId: string | null;
  title: string | null;
  videoUrl: string | null;
  announce: string | null;
  text: string | null;
  quoteText: string | null;
  quoteAuthor: string | null;
  photoUrl: string | null;
  link: string | null;
  linkDescription: string | null;
  createdAt: Date;
  publishedAt: Date;
  tags: { title: string }[];
  _count: { likes: number; comments: number };
};

type PostWhere = Record<string, unknown>;
type PostOrderBy = Record<string, unknown>;

// Мягкое удаление: удалённые посты и комментарии остаются в таблицах
// с флагом isDeleted, поэтому каждое чтение явно исключает помеченные строки.
const NOT_DELETED = { isDeleted: false };

const POST_INCLUDE = {
  tags: { select: { title: true } },
  // commentsCount считает только живые комментарии.
  _count: { select: { likes: true, comments: { where: NOT_DELETED } } },
} as const;

@Injectable()
export class PostRepository {
  constructor(private readonly prisma: PrismaService) {}

  private toDomain(record: PostWithRelations): Post {
    const base = {
      id: record.id,
      status: record.status as PostStatus,
      authorId: record.authorId,
      originalAuthorId: record.originalAuthorId ?? undefined,
      isRepost: record.isRepost,
      originalPostId: record.originalPostId ?? undefined,
      tags: record.tags.map((tag) => tag.title),
      createdAt: record.createdAt,
      publishedAt: record.publishedAt,
      likesCount: record._count.likes,
      commentsCount: record._count.comments,
    };

    switch (record.type as PostType) {
      case PostType.Video:
        return Object.assign(new VideoPost(), base, {
          title: record.title ?? '',
          videoUrl: record.videoUrl ?? '',
        });
      case PostType.Text:
        return Object.assign(new TextPost(), base, {
          title: record.title ?? '',
          announce: record.announce ?? '',
          text: record.text ?? '',
        });
      case PostType.Quote:
        return Object.assign(new QuotePost(), base, {
          quoteText: record.quoteText ?? '',
          quoteAuthor: record.quoteAuthor ?? '',
        });
      case PostType.Photo:
        return Object.assign(new PhotoPost(), base, {
          photoUrl: record.photoUrl ?? '',
        });
      case PostType.Link:
        return Object.assign(new LinkPost(), base, {
          link: record.link ?? '',
          description: record.linkDescription ?? undefined,
        });
    }
  }

  // Раскладывает доменный пост по колонкам таблицы (без id/служебных связей).
  private toTypeColumns(post: Post) {
    switch (post.type) {
      case PostType.Video:
        return { title: post.title, videoUrl: post.videoUrl };
      case PostType.Text:
        return { title: post.title, announce: post.announce, text: post.text };
      case PostType.Quote:
        return { quoteText: post.quoteText, quoteAuthor: post.quoteAuthor };
      case PostType.Photo:
        return { photoUrl: post.photoUrl };
      case PostType.Link:
        return { link: post.link, linkDescription: post.description };
    }
  }

  private tagsConnectOrCreate(tags: string[]) {
    return tags.map((title) => ({
      where: { title },
      create: { title },
    }));
  }

  private getOrderBy(sortBy: PostQuery['sortBy']): PostOrderBy {
    if (sortBy === 'likes') {
      return { likes: { _count: 'desc' } };
    }

    return { publishedAt: 'desc' };
  }

  private buildWhere(
    query: PostQuery,
    options: {
      status: PostStatus;
      authorId?: string;
      authorIds?: string[];
    },
  ): PostWhere {
    const where: PostWhere = { status: options.status, ...NOT_DELETED };

    if (query.type) {
      where.type = query.type;
    }

    if (query.tag) {
      where.tags = { some: { title: query.tag.toLowerCase() } };
    }

    if (options.authorIds) {
      const authorIds = query.authorId
        ? options.authorIds.filter((authorId) => authorId === query.authorId)
        : options.authorIds;
      where.authorId = { in: authorIds };
    } else if (options.authorId) {
      where.authorId = options.authorId;
    } else if (query.authorId) {
      where.authorId = query.authorId;
    }

    return where;
  }

  private async findPage(
    where: PostWhere,
    query: PostQuery,
  ): Promise<PaginationResult<Post>> {
    if (query.sortBy === 'comments') {
      return this.findPageByCommentsCount(where, query);
    }

    const limit = query.limit ?? DEFAULT_LIMIT;
    const page = query.page ?? 1;

    const [totalItems, records] = await this.prisma.$transaction([
      this.prisma.post.count({ where }),
      this.prisma.post.findMany({
        where,
        include: POST_INCLUDE,
        orderBy: this.getOrderBy(query.sortBy),
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      entities: records.map((record) =>
        this.toDomain(record as PostWithRelations),
      ),
      totalPages: Math.ceil(totalItems / limit),
      totalItems,
      currentPage: page,
      itemsPerPage: limit,
    };
  }

  /**
   * Сортировка «Обсуждаемые» (§3.6) с учётом мягкого удаления. Prisma не умеет
   * сортировать по отфильтрованному счётчику связи: `orderBy` по `_count` не
   * принимает `where`, и удалённые комментарии продолжали бы поднимать пост.
   * Поэтому страница собирается в две фазы:
   *   1) посты хотя бы с одним живым комментарием — группировкой комментариев
   *      по убыванию их числа;
   *   2) хвост из постов без живых комментариев — по дате публикации.
   * Фильтры (статус, тип, тег, автор) переиспользуются из `buildWhere`.
   */
  private async findPageByCommentsCount(
    where: PostWhere,
    query: PostQuery,
  ): Promise<PaginationResult<Post>> {
    const limit = query.limit ?? DEFAULT_LIMIT;
    const page = query.page ?? 1;
    const offset = (page - 1) * limit;

    const [totalItems, commentedCount] = await this.prisma.$transaction([
      this.prisma.post.count({ where }),
      this.prisma.post.count({
        where: { ...where, comments: { some: NOT_DELETED } },
      }),
    ]);

    const ids: string[] = [];

    if (offset < commentedCount) {
      const groups = await this.prisma.comment.groupBy({
        by: ['postId'],
        where: { ...NOT_DELETED, post: { is: where } },
        orderBy: [{ _count: { postId: 'desc' } }, { postId: 'asc' }],
        skip: offset,
        take: limit,
      });
      ids.push(...groups.map((group) => group.postId));
    }

    const remaining = limit - ids.length;
    if (remaining > 0) {
      const tail = await this.prisma.post.findMany({
        where: { ...where, comments: { none: NOT_DELETED } },
        orderBy: { publishedAt: 'desc' },
        skip: Math.max(0, offset - commentedCount),
        take: remaining,
        select: { id: true },
      });
      ids.push(...tail.map((post) => post.id));
    }

    const records = ids.length
      ? await this.prisma.post.findMany({
          where: { id: { in: ids } },
          include: POST_INCLUDE,
        })
      : [];
    const recordsById = new Map(records.map((record) => [record.id, record]));
    const entities = ids.flatMap((id) => {
      const record = recordsById.get(id);
      return record ? [this.toDomain(record as PostWithRelations)] : [];
    });

    return {
      entities,
      totalPages: Math.ceil(totalItems / limit),
      totalItems,
      currentPage: page,
      itemsPerPage: limit,
    };
  }

  public async findById(id: string): Promise<Post | null> {
    const record = await this.prisma.post.findFirst({
      where: { id, ...NOT_DELETED },
      include: POST_INCLUDE,
    });
    return record ? this.toDomain(record as PostWithRelations) : null;
  }

  public async findAll(query: PostQuery): Promise<PaginationResult<Post>> {
    return this.findPage(
      this.buildWhere(query, { status: PostStatus.Published }),
      query,
    );
  }

  /** Опубликованные посты перечисленных авторов — основа ленты (§4). */
  public async findPublishedByAuthors(
    authorIds: string[],
    query: PostQuery,
  ): Promise<PaginationResult<Post>> {
    return this.findPage(
      this.buildWhere(query, { status: PostStatus.Published, authorIds }),
      query,
    );
  }

  public async findDrafts(
    authorId: string,
    query: PostQuery,
  ): Promise<PaginationResult<Post>> {
    return this.findPage(
      this.buildWhere(query, { status: PostStatus.Draft, authorId }),
      query,
    );
  }

  /**
   * Поиск по заголовку (§8.2): достаточно совпадения отдельных слов запроса,
   * поэтому слова объединяются через OR. Заголовки есть только у video/text.
   */
  public async findByTitle(title: string): Promise<Post[]> {
    const words = title.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      return [];
    }

    const records = await this.prisma.post.findMany({
      where: {
        status: PostStatus.Published,
        ...NOT_DELETED,
        OR: words.map((word) => ({
          title: { contains: word, mode: 'insensitive' },
        })),
      },
      include: POST_INCLUDE,
      orderBy: { publishedAt: 'desc' },
      take: SEARCH_LIMIT,
    });
    return records.map((record) => this.toDomain(record as PostWithRelations));
  }

  public async findRepost(
    originalPostId: string,
    authorId: string,
  ): Promise<Post | null> {
    const record = await this.prisma.post.findFirst({
      where: { isRepost: true, originalPostId, authorId, ...NOT_DELETED },
      include: POST_INCLUDE,
    });
    return record ? this.toDomain(record as PostWithRelations) : null;
  }

  public async save(post: Post): Promise<Post> {
    const record = await this.prisma.post.create({
      data: {
        type: post.type,
        status: post.status,
        authorId: post.authorId,
        isRepost: post.isRepost,
        originalAuthorId: post.originalAuthorId,
        originalPostId: post.originalPostId,
        publishedAt: post.publishedAt,
        ...this.toTypeColumns(post),
        tags: { connectOrCreate: this.tagsConnectOrCreate(post.tags) },
      },
      include: POST_INCLUDE,
    });
    return this.toDomain(record as PostWithRelations);
  }

  public async update(post: Post): Promise<Post> {
    const record = await this.prisma.post.update({
      where: { id: post.id },
      data: {
        status: post.status,
        publishedAt: post.publishedAt,
        ...this.toTypeColumns(post),
        tags: { set: [], connectOrCreate: this.tagsConnectOrCreate(post.tags) },
      },
      include: POST_INCLUDE,
    });
    return this.toDomain(record as PostWithRelations);
  }

  /**
   * Мягкое удаление: пост получает флаг isDeleted и дату удаления deletedAt
   * и пропадает из всех выборок. Его комментарии отдельно не помечаются —
   * они недоступны вместе с постом (§2.3), потому что любые обращения к ним
   * идут через проверку поста.
   */
  public async softDeleteById(id: string): Promise<void> {
    await this.prisma.post.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() },
    });
  }
}
