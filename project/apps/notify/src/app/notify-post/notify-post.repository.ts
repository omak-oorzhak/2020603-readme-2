import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { PostPublishedDto } from './dto/post-published.dto';
import type { NotifyPostEntity } from './notify-post.entity';

@Injectable()
export class NotifyPostRepository {
  constructor(private readonly prisma: PrismaService) {}

  public async upsert(
    dto: PostPublishedDto,
  ): Promise<NotifyPostEntity> {
    const data = {
      postId: dto.postId,
      title: dto.title ?? null,
      type: dto.type,
      authorId: dto.authorId,
      // Событие приходит JSON-ом (publishedAt — ISO-строка); приводим к Date.
      publishedAt: new Date(dto.publishedAt),
    };

    return this.prisma.notifyPost.upsert({
      where: { postId: dto.postId },
      update: data,
      create: data,
    });
  }

  /** Удаляет ожидающую рассылки запись; возвращает число удалённых строк. */
  public async deletePending(postId: string): Promise<number> {
    const result = await this.prisma.notifyPost.deleteMany({
      where: { postId, notifiedAt: null },
    });
    return result.count;
  }

  /** Публикации, по которым рассылка ещё не выполнялась (§7.3). */
  public async findPending(): Promise<NotifyPostEntity[]> {
    return this.prisma.notifyPost.findMany({
      where: { notifiedAt: null },
      orderBy: { publishedAt: 'asc' },
    });
  }

  public async markNotified(ids: string[]): Promise<void> {
    if (ids.length === 0) {
      return;
    }

    await this.prisma.notifyPost.updateMany({
      where: { id: { in: ids } },
      data: { notifiedAt: new Date() },
    });
  }
}
