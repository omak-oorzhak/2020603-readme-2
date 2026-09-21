import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { RabbitRouting } from '@project/shared-types';
import { NotifyPostService } from './notify-post.service';
import { PostPublishedDto } from './dto/post-published.dto';
import { PostUnpublishedDto } from './dto/post-unpublished.dto';

@Controller()
export class NotifyPostController {
  constructor(private readonly notifyPostService: NotifyPostService) {}

  /** Опубликованный пост ставится в очередь ближайшей рассылки. */
  @EventPattern(RabbitRouting.PostPublished)
  public async handlePostPublished(
    @Payload() dto: PostPublishedDto,
  ): Promise<void> {
    await this.notifyPostService.addPost(dto);
  }

  /** Черновик или удалённый пост снимается с рассылки, если она ещё не прошла. */
  @EventPattern(RabbitRouting.PostUnpublished)
  public async handlePostUnpublished(
    @Payload() dto: PostUnpublishedDto,
  ): Promise<void> {
    await this.notifyPostService.removePendingPost(dto.postId);
  }
}
