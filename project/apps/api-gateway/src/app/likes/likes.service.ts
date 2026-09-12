import { Injectable } from '@nestjs/common';
import { fillRdo } from '@project/shared-helpers';
import { BlogClient } from '../clients/blog.client';
import { LikeRdo } from './rdo/like.rdo';

@Injectable()
export class LikesService {
  constructor(private readonly blogClient: BlogClient) {}

  public async addLike(userId: string, postId: string) {
    const like = await this.blogClient.addLike(userId, postId);
    return fillRdo(LikeRdo, like);
  }

  public async removeLike(userId: string, postId: string): Promise<void> {
    await this.blogClient.removeLike(userId, postId);
  }
}
