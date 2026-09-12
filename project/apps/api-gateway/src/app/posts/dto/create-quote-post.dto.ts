import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  MAX_TAGS_COUNT,
  TAG_PATTERN,
  TAG_VALIDATION_MESSAGE,
} from '../posts.constant';

export class CreateQuotePostDto {
  @ApiProperty({ example: 'Любая достаточно продвинутая технология неотличима от магии', description: '20–300 символов' })
  @IsString()
  @MinLength(20)
  @MaxLength(300)
  public quoteText!: string;

  @ApiProperty({ example: 'Артур Кларк', description: '3–50 символов' })
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  public quoteAuthor!: string;

  @ApiProperty({ example: ['science'], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(MAX_TAGS_COUNT)
  @Matches(TAG_PATTERN, { each: true, message: TAG_VALIDATION_MESSAGE })
  public tags?: string[];
}
