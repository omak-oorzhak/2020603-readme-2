import { Injectable, Logger } from '@nestjs/common';
import { EmailSubscriberRepository } from './email-subscriber.repository';
import type { UserRegisteredDto } from './dto/user-registered.dto';
import type { EmailSubscriberEntity } from './email-subscriber.entity';

@Injectable()
export class EmailSubscriberService {
  private readonly logger = new Logger(EmailSubscriberService.name);

  constructor(private readonly repository: EmailSubscriberRepository) {}

  public async addSubscriber(
    dto: UserRegisteredDto,
  ): Promise<EmailSubscriberEntity> {
    const subscriber = await this.repository.upsert(dto);
    this.logger.log(`Subscriber stored: ${subscriber.email}`);
    return subscriber;
  }

  public async getAllSubscribers(): Promise<EmailSubscriberEntity[]> {
    return this.repository.findAll();
  }
}
