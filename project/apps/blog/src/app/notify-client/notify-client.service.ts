import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { RabbitRouting } from '@project/shared-types';
import type {
  Post,
  PostPublishedEvent,
  PostUnpublishedEvent,
} from '@project/shared-types';
import { NOTIFY_CLIENT } from './notify-client.constant';

/**
 * События жизненного цикла постов для сервиса notify. `emit()` в Nest — hot
 * observable (сам вызывает `.connect()`), поэтому `subscribe`/`await` не
 * нужен; `amqp-connection-manager` буферизует и переподключается, так что
 * операции с постами не падают при недоступном брокере.
 */
@Injectable()
export class NotifyClientService {
  constructor(
    @Inject(NOTIFY_CLIENT) private readonly client: ClientProxy,
  ) {}

  /** Пост опубликован или изменился, оставаясь опубликованным. */
  public publishPostPublished(post: Post): void {
    this.client.emit(RabbitRouting.PostPublished, {
      postId: post.id,
      title: 'title' in post ? post.title : undefined,
      type: post.type,
      authorId: post.authorId,
      publishedAt: post.publishedAt,
    } satisfies PostPublishedEvent);
  }

  /** Пост перестал быть опубликованным: стал черновиком или удалён. */
  public publishPostUnpublished(postId: string): void {
    this.client.emit(RabbitRouting.PostUnpublished, {
      postId,
    } satisfies PostUnpublishedEvent);
  }
}
