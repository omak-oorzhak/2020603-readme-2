import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import {
  MAX_TAGS_COUNT,
  TAG_PATTERN,
  TAG_VALIDATION_MESSAGE,
} from '../posts.constant';

export class CreatePhotoPostDto {
  @ApiProperty({ example: ['photo', 'nature'], required: false })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean);
    }
    return Array.isArray(value) ? value : [value];
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(MAX_TAGS_COUNT)
  @Matches(TAG_PATTERN, { each: true, message: TAG_VALIDATION_MESSAGE })
  public tags?: string[];
}
