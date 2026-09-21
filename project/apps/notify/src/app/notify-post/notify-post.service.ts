import { Injectable, Logger } from '@nestjs/common';
import { NotifyPostRepository } from './notify-post.repository';
import type { PostPublishedDto } from './dto/post-published.dto';
import type { NotifyPostEntity } from './notify-post.entity';

@Injectable()
export class NotifyPostService {
  private readonly logger = new Logger(NotifyPostService.name);

  constructor(private readonly repository: NotifyPostRepository) {}

  public async addPost(
    dto: PostPublishedDto,
  ): Promise<NotifyPostEntity> {
    const post = await this.repository.upsert(dto);
    this.logger.log(`Post queued for newsletter: ${post.postId}`);
    return post;
  }

  /**
   * Убирает пост из очереди рассылки. Уже разосланные записи не трогаем:
   * письмо отправлено, а запись остаётся историей и защитой от повтора.
   */
  public async removePendingPost(postId: string): Promise<void> {
    const removed = await this.repository.deletePending(postId);
    if (removed > 0) {
      this.logger.log(`Post removed from newsletter queue: ${postId}`);
    }
  }

  public async getPendingPosts(): Promise<NotifyPostEntity[]> {
    return this.repository.findPending();
  }

  public async markNotified(ids: string[]): Promise<void> {
    await this.repository.markNotified(ids);
  }
}
