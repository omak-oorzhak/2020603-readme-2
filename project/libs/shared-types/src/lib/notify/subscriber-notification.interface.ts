/**
 * Payload события `add.subscriber`: данные нового пользователя, которые сервис
 * users публикует в очередь notify при регистрации. Консьюмер складывает их в
 * таблицу `email_subscribers` — получателей рассылки (§7.2).
 */
export interface SubscriberNotification {
  userId: string;
  email: string;
  name: string;
}
