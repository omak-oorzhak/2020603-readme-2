import { PostType } from '../post/post-type.enum.js';

/**
 * Payload события `post.published`: данные опубликованного поста. Повторная
 * отправка для того же поста безопасна — notify делает upsert. `publishedAt`
 * сериализуется в JSON как ISO-строка, консьюмер приводит её обратно к `Date`.
 */
export interface PostPublishedEvent {
  postId: string;
  title?: string;
  type: PostType;
  authorId: string;
  publishedAt: Date;
}
