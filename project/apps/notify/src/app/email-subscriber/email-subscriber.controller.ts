import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { RabbitRouting } from '@project/shared-types';
import { EmailSubscriberService } from './email-subscriber.service';
import { UserRegisteredDto } from './dto/user-registered.dto';

@Controller()
export class EmailSubscriberController {
  constructor(
    private readonly emailSubscriberService: EmailSubscriberService,
  ) {}

  /** Новый пользователь users становится подписчиком рассылки. */
  @EventPattern(RabbitRouting.UserRegistered)
  public async handleUserRegistered(
    @Payload() dto: UserRegisteredDto,
  ): Promise<void> {
    await this.emailSubscriberService.addSubscriber(dto);
  }
}
