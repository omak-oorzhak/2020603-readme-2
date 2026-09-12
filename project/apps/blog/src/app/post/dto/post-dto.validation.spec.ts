import {
  BadRequestException,
  ValidationPipe,
  type ArgumentMetadata,
} from '@nestjs/common';
import { PostStatus } from '@project/shared-types';
import { CreateTextPostDto } from './create-text-post.dto';
import { UpdatePostDto } from './update-post.dto';
import { TAG_VALIDATION_MESSAGE } from '../post.constant';

type ValidationResponse = {
  message: string[];
};

const VALID_TEXT_POST = {
  type: 'text',
  title: 'Мой первый пост о TypeScript разработке',
  announce: 'Краткий анонс публикации, который заинтересует читателя и расскажет о сути.',
  text: 'Полный текст публикации о том, как мы подключили PostgreSQL и Prisma ORM к сервису Blog, и что из этого вышло.',
};

describe('Blog post DTO validation', () => {
  const validationPipe = new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
    stopAtFirstError: false,
    transformOptions: {
      enableImplicitConversion: true,
    },
    validationError: {
      target: false,
      value: false,
    },
  });

  async function transformBody<T extends object>(
    metatype: new () => T,
    value: Record<string, unknown>,
  ): Promise<unknown> {
    return validationPipe.transform(value, {
      metatype,
      type: 'body' as ArgumentMetadata['type'],
    });
  }

  async function getValidationMessages(
    promise: Promise<unknown>,
  ): Promise<string[]> {
    try {
      await promise;
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      const response = (error as BadRequestException).getResponse();
      return (response as ValidationResponse).message;
    }

    throw new Error('Validation should fail');
  }

  describe('tags', () => {
    it('accepts valid tags in any case', async () => {
      await expect(
        transformBody(CreateTextPostDto, {
          ...VALID_TEXT_POST,
          tags: ['NestJS', 'prisma', 'тег'],
        }),
      ).resolves.toBeInstanceOf(CreateTextPostDto);
    });

    it('rejects a tag with a space, a leading digit, or a bad length', async () => {
      const messages = await getValidationMessages(
        transformBody(CreateTextPostDto, {
          ...VALID_TEXT_POST,
          tags: ['two words', '1abc', 'ab', 'abcdefghijk'],
        }),
      );

      expect(messages).toContain(TAG_VALIDATION_MESSAGE);
    });

    it('rejects more than 8 tags', async () => {
      const messages = await getValidationMessages(
        transformBody(CreateTextPostDto, {
          ...VALID_TEXT_POST,
          tags: [
            'one',
            'two',
            'three',
            'four',
            'five',
            'six',
            'seven',
            'eight',
            'nine',
          ],
        }),
      );

      expect(messages).toContain(
        'tags must contain no more than 8 elements',
      );
    });
  });

  describe('UpdatePostDto', () => {
    it('accepts a partial update with publishedAt and status', async () => {
      const dto = (await transformBody(UpdatePostDto, {
        publishedAt: '2026-09-13T10:00:00.000Z',
        status: PostStatus.Draft,
      })) as UpdatePostDto;

      expect(dto).toBeInstanceOf(UpdatePostDto);
      expect(dto.publishedAt).toBeInstanceOf(Date);
      expect(dto.status).toBe(PostStatus.Draft);
    });

    it('rejects an unknown status and a short title', async () => {
      const messages = await getValidationMessages(
        transformBody(UpdatePostDto, {
          title: 'Слишком коротко',
          status: 'archived',
        }),
      );

      expect(messages).toEqual(
        expect.arrayContaining([
          'title must be longer than or equal to 20 characters',
          'status must be one of the following values: published, draft',
        ]),
      );
    });

    it('rejects an unknown property', async () => {
      const messages = await getValidationMessages(
        transformBody(UpdatePostDto, { authorId: 'someone-else' }),
      );

      expect(messages).toContain('property authorId should not exist');
    });
  });
});
