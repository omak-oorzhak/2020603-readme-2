import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  Equals,
  IsArray,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
} from 'class-validator';
import { PostType } from '@project/shared-types';
import {
  MAX_TAGS_COUNT,
  TAG_PATTERN,
  TAG_VALIDATION_MESSAGE,
} from '../post.constant';

export class CreatePhotoPostDto {
  @ApiProperty({ example: PostType.Photo, enum: PostType })
  @Equals(PostType.Photo)
  public readonly type = PostType.Photo;

  @ApiProperty({ example: 'https://example.com/photo.jpg', description: 'URL фотографии (jpg/png, до 1 МБ)' })
  @IsUrl({ require_tld: false })
  public photoUrl!: string;

  @ApiProperty({ example: ['photo', 'nature'], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(MAX_TAGS_COUNT)
  @Matches(TAG_PATTERN, { each: true, message: TAG_VALIDATION_MESSAGE })
  public tags?: string[];
}
