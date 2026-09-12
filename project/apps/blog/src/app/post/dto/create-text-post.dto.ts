import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  Equals,
  IsArray,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PostType } from '@project/shared-types';
import {
  MAX_TAGS_COUNT,
  TAG_PATTERN,
  TAG_VALIDATION_MESSAGE,
} from '../post.constant';

export class CreateTextPostDto {
  @ApiProperty({ example: PostType.Text, enum: PostType })
  @Equals(PostType.Text)
  public readonly type = PostType.Text;

  @ApiProperty({ example: 'Мой первый пост о TypeScript разработке', description: '20–50 символов' })
  @IsString()
  @MinLength(20)
  @MaxLength(50)
  public title!: string;

  @ApiProperty({ example: 'Краткий анонс публикации, который заинтересует читателя', description: '50–255 символов' })
  @IsString()
  @MinLength(50)
  @MaxLength(255)
  public announce!: string;

  @ApiProperty({ example: 'Полный текст публикации...', description: '100–1024 символа' })
  @IsString()
  @MinLength(100)
  @MaxLength(1024)
  public text!: string;

  @ApiProperty({ example: ['typescript'], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(MAX_TAGS_COUNT)
  @Matches(TAG_PATTERN, { each: true, message: TAG_VALIDATION_MESSAGE })
  public tags?: string[];
}
