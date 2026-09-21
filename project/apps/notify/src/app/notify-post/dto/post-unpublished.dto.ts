import { IsUUID } from 'class-validator';
import type { PostUnpublishedEvent } from '@project/shared-types';

/**
 * Payload события `post.unpublished` от сервиса blog: пост переведён в
 * черновик или удалён и не должен попасть в рассылку.
 */
export class PostUnpublishedDto implements PostUnpublishedEvent {
  @IsUUID()
  public postId!: string;
}
