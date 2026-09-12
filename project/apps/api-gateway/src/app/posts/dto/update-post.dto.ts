import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  MAX_TAGS_COUNT,
  TAG_PATTERN,
  TAG_VALIDATION_MESSAGE,
} from '../posts.constant';
import { PostStatus } from '@project/shared-types';

export class UpdatePostDto {
  @ApiProperty({ description: 'Заголовок (video, text) — 20–50 символов', required: false })
  @IsOptional()
  @IsString()
  @MinLength(20)
  @MaxLength(50)
  public title?: string;

  @ApiProperty({ description: 'Ссылка на YouTube (video)', required: false })
  @IsOptional()
  @IsString()
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
  @IsString()
  @IsUrl({ require_tld: false })
  public photoUrl?: string;

  @ApiProperty({ description: 'Ссылка (link)', required: false })
  @IsOptional()
  @IsString()
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
    example: '2026-09-13T10:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  public publishedAt?: string;

  @ApiProperty({
    enum: PostStatus,
    description: 'Статус публикации (§2.12): published | draft',
    required: false,
  })
  @IsOptional()
  @IsEnum(PostStatus)
  public status?: PostStatus;
}
