import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDate,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PostStatus } from '@project/shared-types';
import {
  MAX_TAGS_COUNT,
  TAG_PATTERN,
  TAG_VALIDATION_MESSAGE,
} from '../post.constant';

/**
 * Частичное обновление публикации (§1.3, §2.11, §2.12): все поля опциональны,
 * ограничения совпадают с create-DTO соответствующего типа. Поля чужого типа
 * репозиторий не сохраняет — он пишет только колонки типа самой публикации.
 */
export class UpdatePostDto {
  @ApiProperty({ description: 'Заголовок (video, text) — 20–50 символов', required: false })
  @IsOptional()
  @IsString()
  @MinLength(20)
  @MaxLength(50)
  public title?: string;

  @ApiProperty({ description: 'Ссылка на YouTube (video)', required: false })
  @IsOptional()
  @IsUrl()
  @Matches(/^https?:\/\/(www\.)?youtube\.com\/watch\?v=[\w-]+$/, {
    message: 'videoUrl must be a valid YouTube URL',
  })
  public videoUrl?: string;

  @ApiProperty({ description: 'Анонс (text) — 50–255 символов', required: false })
  @IsOptional()
  @IsString()
  @MinLength(50)
  @MaxLength(255)
  public announce?: string;

  @ApiProperty({ description: 'Текст публикации (text) — 100–1024 символа', required: false })
  @IsOptional()
  @IsString()
  @MinLength(100)
  @MaxLength(1024)
  public text?: string;

  @ApiProperty({ description: 'Текст цитаты (quote) — 20–300 символов', required: false })
  @IsOptional()
  @IsString()
  @MinLength(20)
  @MaxLength(300)
  public quoteText?: string;

  @ApiProperty({ description: 'Автор цитаты (quote) — 3–50 символов', required: false })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  public quoteAuthor?: string;

  @ApiProperty({ description: 'URL фотографии (photo)', required: false })
  @IsOptional()
  @IsUrl({ require_tld: false })
  public photoUrl?: string;

  @ApiProperty({ description: 'Ссылка (link)', required: false })
  @IsOptional()
  @IsUrl({ require_tld: false })
  public link?: string;

  @ApiProperty({ description: 'Описание ссылки (link) — до 300 символов', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  public description?: string;

  @ApiProperty({ description: 'Теги публикации (до 8)', required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(MAX_TAGS_COUNT)
  @Matches(TAG_PATTERN, { each: true, message: TAG_VALIDATION_MESSAGE })
  public tags?: string[];

  @ApiProperty({
    description: 'Дата публикации (§2.11) — влияет на сортировку',
    required: false,
    format: 'date-time',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  public publishedAt?: Date;

  @ApiProperty({
    enum: PostStatus,
    description: 'Статус публикации (§2.12): published | draft',
    required: false,
  })
  @IsOptional()
  @IsEnum(PostStatus)
  public status?: PostStatus;
}
