import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { RabbitRouting } from '@project/shared-types';
import type { User, UserRegisteredEvent } from '@project/shared-types';
import { NOTIFY_CLIENT } from './notify-client.constant';

@Injectable()
export class NotifyClientService {
  constructor(@Inject(NOTIFY_CLIENT) private readonly client: ClientProxy) {}

  /**
   * Сообщает о регистрации нового пользователя. Notify заносит его в
   * получатели рассылки (§7.2: уведомления получают все зарегистрированные).
   * `emit()` в Nest — hot observable, дополнительный `subscribe`/`await` не
   * нужен; `amqp-connection-manager` буферизует сообщения, поэтому регистрация
   * не падает при недоступном брокере.
   */
  public publishUserRegistered(user: User): void {
    this.client.emit(RabbitRouting.UserRegistered, {
      userId: user.id,
      email: user.email,
      name: user.name,
    } satisfies UserRegisteredEvent);
  }
}
