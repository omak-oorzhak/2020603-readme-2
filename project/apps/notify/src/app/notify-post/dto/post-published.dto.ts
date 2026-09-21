import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { PostType } from '@project/shared-types';
import type { PostPublishedEvent } from '@project/shared-types';

/**
 * Payload события `post.published` от сервиса blog. Пост попадает в очередь
 * ближайшей рассылки; повторное событие обновляет запись, не сбрасывая
 * отметку об уже выполненной рассылке.
 */
export class PostPublishedDto implements PostPublishedEvent {
  @IsUUID()
  public postId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  public title?: string;

  @IsEnum(PostType)
  public type!: PostType;

  // Opaque-ссылка на пользователя другого сервиса, без внешнего ключа.
  @IsString()
  public authorId!: string;

  @Type(() => Date)
  @IsDate()
  public publishedAt!: Date;
}
