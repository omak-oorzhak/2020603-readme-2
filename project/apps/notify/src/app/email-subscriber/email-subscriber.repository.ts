import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { UserRegisteredDto } from './dto/user-registered.dto';
import type { EmailSubscriberEntity } from './email-subscriber.entity';

@Injectable()
export class EmailSubscriberRepository {
  constructor(private readonly prisma: PrismaService) {}

  public async upsert(
    dto: UserRegisteredDto,
  ): Promise<EmailSubscriberEntity> {
    return this.prisma.emailSubscriber.upsert({
      where: { userId: dto.userId },
      update: { email: dto.email, name: dto.name },
      create: { userId: dto.userId, email: dto.email, name: dto.name },
    });
  }

  public async findAll(): Promise<EmailSubscriberEntity[]> {
    return this.prisma.emailSubscriber.findMany({
      orderBy: { createdAt: 'asc' },
    });
  }
}
