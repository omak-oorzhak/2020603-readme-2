import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';
import { AuthenticationModule } from './authentication/authentication.module';
import { PrismaModule } from './prisma/prisma.module';
import {
  appConfig,
  postgresConfig,
  rabbitmqConfig,
} from '@project/shared-config';
import { jwtConfig, validateEnv } from './config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: 'apps/users/.env',
      load: [appConfig, postgresConfig, jwtConfig, rabbitmqConfig],
      validate: validateEnv,
    }),
    PrismaModule,
    UserModule,
    AuthenticationModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
