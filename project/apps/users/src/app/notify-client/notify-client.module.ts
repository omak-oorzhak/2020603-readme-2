import { Module } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { rabbitmqConfig } from '@project/shared-config';
import { getRabbitmqConnectionString } from '@project/shared-helpers';
import { NOTIFY_CLIENT } from './notify-client.constant';
import { NotifyClientService } from './notify-client.service';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: NOTIFY_CLIENT,
        inject: [rabbitmqConfig.KEY],
        useFactory: (config: ConfigType<typeof rabbitmqConfig>) => ({
          transport: Transport.RMQ,
          options: {
            urls: [getRabbitmqConnectionString(config)],
            queue: config.queue,
            queueOptions: { durable: true },
          },
        }),
      },
    ]),
  ],
  providers: [NotifyClientService],
  exports: [NotifyClientService],
})
export class NotifyClientModule {}
