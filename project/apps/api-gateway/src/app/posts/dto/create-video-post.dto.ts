import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
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

export class CreateVideoPostDto {
  @ApiProperty({ example: 'Как выучить TypeScript за 20 минут', description: '20–50 символов' })
  @IsString()
  @MinLength(20)
  @MaxLength(50)
  public title!: string;

  @ApiProperty({ example: 'https://www.youtube.com/watch?v=abc123', description: 'Ссылка на YouTube' })
  @IsUrl()
  @Matches(/^https?:\/\/(www\.)?youtube\.com\/watch\?v=[\w-]+$/, {
    message: 'videoUrl must be a valid YouTube URL',
  })
  public videoUrl!: string;

  @ApiProperty({ example: ['typescript', 'tutorial'], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(MAX_TAGS_COUNT)
  @Matches(TAG_PATTERN, { each: true, message: TAG_VALIDATION_MESSAGE })
  public tags?: string[];
}
