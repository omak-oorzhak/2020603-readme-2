/**
 * Ручная публикация событий в очередь notify для проверки консьюмера без
 * сервисов `users`/`blog`. Конверт `{ pattern, data }` — формат, который ожидает
 * транспорт RabbitMQ из @nestjs/microservices для событий (ClientProxy.emit).
 *
 * Запуск (из каталога project/):  tsx apps/notify/tools/rabbit-publish.ts
 */
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { config as loadEnv } from 'dotenv';
import { connect } from 'amqplib';

loadEnv({ path: path.join(import.meta.dirname, '..', '.env') });

const {
  RABBITMQ_USER,
  RABBITMQ_PASSWORD,
  RABBITMQ_HOST,
  RABBITMQ_PORT,
  RABBITMQ_QUEUE,
} = process.env;

const url = `amqp://${RABBITMQ_USER}:${RABBITMQ_PASSWORD}@${RABBITMQ_HOST}:${RABBITMQ_PORT}`;
const queue = RABBITMQ_QUEUE ?? 'readme.notify.income';

function event(pattern: string, data: unknown): Buffer {
  return Buffer.from(JSON.stringify({ pattern, data }));
}

async function main(): Promise<void> {
  const connection = await connect(url);
  const channel = await connection.createChannel();
  await channel.assertQueue(queue, { durable: true });

  const subscriber = {
    userId: randomUUID(),
    email: `demo-${Date.now()}@example.com`,
    name: 'Демо Подписчик',
  };
  channel.sendToQueue(queue, event('user.registered', subscriber));

  const post = {
    postId: randomUUID(),
    title: 'Тестовая публикация для рассылки',
    type: 'text',
    authorId: randomUUID(),
    publishedAt: new Date().toISOString(),
  };
  channel.sendToQueue(queue, event('post.published', post));

  console.log('Published events to queue:', queue);
  console.log('  user.registered:', subscriber.email);
  console.log('  post.published:', post.postId);

  await channel.close();
  await connection.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
