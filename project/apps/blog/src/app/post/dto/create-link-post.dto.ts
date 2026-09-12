import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  Equals,
  IsArray,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
} from 'class-validator';
import { PostType } from '@project/shared-types';
import {
  MAX_TAGS_COUNT,
  TAG_PATTERN,
  TAG_VALIDATION_MESSAGE,
} from '../post.constant';

export class CreateLinkPostDto {
  @ApiProperty({ example: PostType.Link, enum: PostType })
  @Equals(PostType.Link)
  public readonly type = PostType.Link;

  @ApiProperty({ example: 'https://nestjs.com', description: 'Валидный URL' })
  @IsUrl()
  public link!: string;

  @ApiProperty({ example: 'Официальный сайт NestJS', description: 'До 300 символов', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  public description?: string;

  @ApiProperty({ example: ['nestjs', 'framework'], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(MAX_TAGS_COUNT)
  @Matches(TAG_PATTERN, { each: true, message: TAG_VALIDATION_MESSAGE })
  public tags?: string[];
}
