import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { RabbitRouting } from '@project/shared-types';
import type { SubscriberNotification, User } from '@project/shared-types';
import { NOTIFY_CLIENT } from './notify-client.constant';

@Injectable()
export class NotifyClientService {
  constructor(@Inject(NOTIFY_CLIENT) private readonly client: ClientProxy) {}

  /**
   * Публикует событие о новом подписчике рассылки (§7.2: уведомления получают
   * все зарегистрированные пользователи). `emit()` в Nest — hot observable,
   * дополнительный `subscribe`/`await` не нужен; `amqp-connection-manager`
   * буферизует сообщения, поэтому регистрация не падает при недоступном брокере.
   */
  public publishNewSubscriber(user: User): void {
    this.client.emit(RabbitRouting.AddSubscriber, {
      userId: user.id,
      email: user.email,
      name: user.name,
    } satisfies SubscriberNotification);
  }
}
