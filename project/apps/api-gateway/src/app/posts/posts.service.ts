import { Injectable } from '@nestjs/common';
import { PostType } from '@project/shared-types';
import type { PaginationResult } from '@project/shared-types';
import {
  fillRdo,
  fillRdoList,
  fillRdoPagination,
} from '@project/shared-helpers';
import { BlogClient, type BlogPost } from '../clients/blog.client';
import { UsersClient, type UserInfo } from '../clients/users.client';
import { FileStorageClient } from '../clients/file-storage.client';
import { GetPostQueryDto } from './dto/get-post-query.dto';
import { CreateVideoPostDto } from './dto/create-video-post.dto';
import { CreateTextPostDto } from './dto/create-text-post.dto';
import { CreateQuotePostDto } from './dto/create-quote-post.dto';
import { CreateLinkPostDto } from './dto/create-link-post.dto';
import { CreatePhotoPostDto } from './dto/create-photo-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { PostWithAuthorRdo } from './rdo/post-with-author.rdo';

type EnrichedPost = BlogPost & { author: UserInfo | null };

@Injectable()
export class PostsService {
  constructor(
    private readonly blogClient: BlogClient,
    private readonly usersClient: UsersClient,
    private readonly fileStorageClient: FileStorageClient,
  ) {}

  public async findAll(
    query: GetPostQueryDto,
  ): Promise<PaginationResult<PostWithAuthorRdo>> {
    const posts = await this.blogClient.getPosts(query);
    return this.enrichPagination(posts);
  }

  public async findFeed(
    userId: string,
    query: GetPostQueryDto,
  ): Promise<PaginationResult<PostWithAuthorRdo>> {
    const posts = await this.blogClient.getFeed(userId, query);
    return this.enrichPagination(posts);
  }

  public async findDrafts(
    userId: string,
    query: GetPostQueryDto,
  ): Promise<PaginationResult<PostWithAuthorRdo>> {
    const posts = await this.blogClient.getDrafts(userId, query);
    return this.enrichPagination(posts);
  }

  public async search(title: string): Promise<PostWithAuthorRdo[]> {
    const posts = await this.blogClient.searchPosts(title);
    return this.enrichList(posts);
  }

  public async findOne(
    id: string,
    userId?: string,
  ): Promise<PostWithAuthorRdo> {
    const post = await this.blogClient.getPost(id, userId);
    return this.enrichPost(post);
  }

  public async createVideo(
    userId: string,
    dto: CreateVideoPostDto,
  ): Promise<PostWithAuthorRdo> {
    const post = await this.blogClient.createPost(userId, PostType.Video, {
      ...dto,
      type: PostType.Video,
    });
    return this.enrichPost(post);
  }

  public async createText(
    userId: string,
    dto: CreateTextPostDto,
  ): Promise<PostWithAuthorRdo> {
    const post = await this.blogClient.createPost(userId, PostType.Text, {
      ...dto,
      type: PostType.Text,
    });
    return this.enrichPost(post);
  }

  public async createQuote(
    userId: string,
    dto: CreateQuotePostDto,
  ): Promise<PostWithAuthorRdo> {
    const post = await this.blogClient.createPost(userId, PostType.Quote, {
      ...dto,
      type: PostType.Quote,
    });
    return this.enrichPost(post);
  }

  public async createLink(
    userId: string,
    dto: CreateLinkPostDto,
  ): Promise<PostWithAuthorRdo> {
    const post = await this.blogClient.createPost(userId, PostType.Link, {
      ...dto,
      type: PostType.Link,
    });
    return this.enrichPost(post);
  }

  public async createPhoto(
    userId: string,
    dto: CreatePhotoPostDto,
    file: Express.Multer.File,
  ): Promise<PostWithAuthorRdo> {
    const stored = await this.fileStorageClient.uploadPhoto(file);
    const post = await this.blogClient.createPhotoPost(userId, {
      type: PostType.Photo,
      photoUrl: stored.url,
      tags: dto.tags,
    });
    return this.enrichPost(post);
  }

  public async update(
    userId: string,
    id: string,
    dto: UpdatePostDto,
  ): Promise<PostWithAuthorRdo> {
    const post = await this.blogClient.updatePost(userId, id, { ...dto });
    return this.enrichPost(post);
  }

  public async delete(userId: string, id: string): Promise<void> {
    await this.blogClient.deletePost(userId, id);
  }

  public async repost(
    userId: string,
    id: string,
  ): Promise<PostWithAuthorRdo> {
    const post = await this.blogClient.repost(userId, id);
    return this.enrichPost(post);
  }

  private async enrichPost(post: BlogPost): Promise<PostWithAuthorRdo> {
    const authorMap = await this.usersClient.getUserInfoMap([post.authorId]);
    return fillRdo(PostWithAuthorRdo, {
      ...post,
      author: authorMap.get(post.authorId) ?? null,
    } satisfies EnrichedPost);
  }

  private async enrichList(
    posts: BlogPost[],
  ): Promise<PostWithAuthorRdo[]> {
    if (posts.length === 0) {
      return [];
    }
    const authorIds = posts.map((post) => post.authorId);
    const authorMap = await this.usersClient.getUserInfoMap(authorIds);
    const enriched: EnrichedPost[] = posts.map((post) => ({
      ...post,
      author: authorMap.get(post.authorId) ?? null,
    }));
    return fillRdoList(PostWithAuthorRdo, enriched);
  }

  private async enrichPagination(
    posts: PaginationResult<BlogPost>,
  ): Promise<PaginationResult<PostWithAuthorRdo>> {
    if (posts.entities.length === 0) {
      return fillRdoPagination(PostWithAuthorRdo, posts);
    }
    const authorIds = posts.entities.map((post) => post.authorId);
    const authorMap = await this.usersClient.getUserInfoMap(authorIds);
    const enriched: PaginationResult<EnrichedPost> = {
      ...posts,
      entities: posts.entities.map((post) => ({
        ...post,
        author: authorMap.get(post.authorId) ?? null,
      })),
    };
    return fillRdoPagination(PostWithAuthorRdo, enriched);
  }
}
