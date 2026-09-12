import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { USER_ID_HEADER } from '@project/shared-types';
import type { PaginationResult, PostType } from '@project/shared-types';
import { servicesConfig } from '../config';

export interface BlogPost {
  id: string;
  type: PostType;
  status: string;
  authorId: string;
  isRepost: boolean;
  originalAuthorId?: string;
  originalPostId?: string;
  tags: string[];
  createdAt: string;
  publishedAt: string;
  likesCount: number;
  commentsCount: number;
  title?: string;
  videoUrl?: string;
  announce?: string;
  text?: string;
  quoteText?: string;
  quoteAuthor?: string;
  photoUrl?: string;
  link?: string;
  description?: string;
}

export interface BlogComment {
  id: string;
  postId: string;
  authorId: string;
  text: string;
  createdAt: string;
}

export interface BlogLike {
  id: string;
  postId: string;
  userId: string;
  createdAt: string;
}

export interface BlogSubscription {
  id: string;
  followerId: string;
  followingId: string;
  createdAt: string;
}

export interface FollowersCount {
  count: number;
}

export type PostQueryParams = {
  limit?: number;
  page?: number;
  sortBy?: string;
  type?: PostType;
  tag?: string;
  authorId?: string;
};

@Injectable()
export class BlogClient {
  constructor(
    private readonly httpService: HttpService,
    @Inject(servicesConfig.KEY)
    private readonly config: ConfigType<typeof servicesConfig>,
  ) {}

  /**
   * Blog не проверяет JWT: личность пользователя ему сообщает gateway
   * заголовком `X-User-Id` после верификации токена.
   */
  private withUser(userId: string, params?: PostQueryParams) {
    return { headers: { [USER_ID_HEADER]: userId }, ...(params ? { params } : {}) };
  }

  // --- Posts ---

  public async getPosts(
    params: PostQueryParams,
  ): Promise<PaginationResult<BlogPost>> {
    const { data } = await firstValueFrom(
      this.httpService.get<PaginationResult<BlogPost>>(
        `${this.config.blogServiceUrl}/posts`,
        { params },
      ),
    );
    return data;
  }

  public async getFeed(
    userId: string,
    params: PostQueryParams,
  ): Promise<PaginationResult<BlogPost>> {
    const { data } = await firstValueFrom(
      this.httpService.get<PaginationResult<BlogPost>>(
        `${this.config.blogServiceUrl}/posts/feed`,
        this.withUser(userId, params),
      ),
    );
    return data;
  }

  public async getDrafts(
    userId: string,
    params: PostQueryParams,
  ): Promise<PaginationResult<BlogPost>> {
    const { data } = await firstValueFrom(
      this.httpService.get<PaginationResult<BlogPost>>(
        `${this.config.blogServiceUrl}/posts/drafts`,
        this.withUser(userId, params),
      ),
    );
    return data;
  }

  public async searchPosts(title: string): Promise<BlogPost[]> {
    const { data } = await firstValueFrom(
      this.httpService.get<BlogPost[]>(
        `${this.config.blogServiceUrl}/posts/search`,
        { params: { title } },
      ),
    );
    return data;
  }

  public async getPost(id: string, userId?: string): Promise<BlogPost> {
    const { data } = await firstValueFrom(
      this.httpService.get<BlogPost>(
        `${this.config.blogServiceUrl}/posts/${id}`,
        userId ? this.withUser(userId) : undefined,
      ),
    );
    return data;
  }

  public async createPost(
    userId: string,
    type: PostType,
    body: Record<string, unknown>,
  ): Promise<BlogPost> {
    const { data } = await firstValueFrom(
      this.httpService.post<BlogPost>(
        `${this.config.blogServiceUrl}/posts/${type.toLowerCase()}`,
        body,
        this.withUser(userId),
      ),
    );
    return data;
  }

  public async createPhotoPost(
    userId: string,
    body: {
      type: PostType;
      photoUrl: string;
      tags?: string[];
    },
  ): Promise<BlogPost> {
    const { data } = await firstValueFrom(
      this.httpService.post<BlogPost>(
        `${this.config.blogServiceUrl}/posts/photo`,
        body,
        this.withUser(userId),
      ),
    );
    return data;
  }

  public async updatePost(
    userId: string,
    id: string,
    body: Record<string, unknown>,
  ): Promise<BlogPost> {
    const { data } = await firstValueFrom(
      this.httpService.patch<BlogPost>(
        `${this.config.blogServiceUrl}/posts/${id}`,
        body,
        this.withUser(userId),
      ),
    );
    return data;
  }

  public async deletePost(userId: string, id: string): Promise<void> {
    await firstValueFrom(
      this.httpService.delete(
        `${this.config.blogServiceUrl}/posts/${id}`,
        this.withUser(userId),
      ),
    );
  }

  public async repost(userId: string, id: string): Promise<BlogPost> {
    const { data } = await firstValueFrom(
      this.httpService.post<BlogPost>(
        `${this.config.blogServiceUrl}/posts/${id}/repost`,
        undefined,
        this.withUser(userId),
      ),
    );
    return data;
  }

  // --- Comments ---

  public async getComments(
    postId: string,
    params: { limit?: number; page?: number },
  ): Promise<PaginationResult<BlogComment>> {
    const { data } = await firstValueFrom(
      this.httpService.get<PaginationResult<BlogComment>>(
        `${this.config.blogServiceUrl}/posts/${postId}/comments`,
        { params },
      ),
    );
    return data;
  }

  public async createComment(
    userId: string,
    postId: string,
    body: { text: string },
  ): Promise<BlogComment> {
    const { data } = await firstValueFrom(
      this.httpService.post<BlogComment>(
        `${this.config.blogServiceUrl}/posts/${postId}/comments`,
        body,
        this.withUser(userId),
      ),
    );
    return data;
  }

  public async deleteComment(
    userId: string,
    postId: string,
    commentId: string,
  ): Promise<void> {
    await firstValueFrom(
      this.httpService.delete(
        `${this.config.blogServiceUrl}/posts/${postId}/comments/${commentId}`,
        this.withUser(userId),
      ),
    );
  }

  // --- Likes ---

  public async addLike(userId: string, postId: string): Promise<BlogLike> {
    const { data } = await firstValueFrom(
      this.httpService.post<BlogLike>(
        `${this.config.blogServiceUrl}/posts/${postId}/likes`,
        undefined,
        this.withUser(userId),
      ),
    );
    return data;
  }

  public async removeLike(userId: string, postId: string): Promise<void> {
    await firstValueFrom(
      this.httpService.delete(
        `${this.config.blogServiceUrl}/posts/${postId}/likes`,
        this.withUser(userId),
      ),
    );
  }

  // --- Subscriptions ---

  public async getSubscriptions(userId: string): Promise<BlogSubscription[]> {
    const { data } = await firstValueFrom(
      this.httpService.get<BlogSubscription[]>(
        `${this.config.blogServiceUrl}/subscriptions`,
        this.withUser(userId),
      ),
    );
    return data;
  }

  public async subscribe(
    userId: string,
    followingId: string,
  ): Promise<BlogSubscription> {
    const { data } = await firstValueFrom(
      this.httpService.post<BlogSubscription>(
        `${this.config.blogServiceUrl}/subscriptions/${followingId}`,
        undefined,
        this.withUser(userId),
      ),
    );
    return data;
  }

  public async unsubscribe(
    userId: string,
    followingId: string,
  ): Promise<void> {
    await firstValueFrom(
      this.httpService.delete(
        `${this.config.blogServiceUrl}/subscriptions/${followingId}`,
        this.withUser(userId),
      ),
    );
  }

  public async getFollowersCount(userId: string): Promise<FollowersCount> {
    const { data } = await firstValueFrom(
      this.httpService.get<FollowersCount>(
        `${this.config.blogServiceUrl}/subscriptions/followers/${userId}/count`,
      ),
    );
    return data;
  }
}
