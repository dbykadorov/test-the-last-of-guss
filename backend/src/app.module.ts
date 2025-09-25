import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import databaseConfig from '@infrastructure/config/database.config';
import appConfig from '@infrastructure/config/app.config';
import jwtConfig from '@infrastructure/config/jwt.config';
import { AuthModule } from '@application/auth/auth.module';
import { RoundsModule } from '@application/rounds/rounds.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, appConfig, jwtConfig],
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const dbConfig = configService.get('database');
        if (!dbConfig) {
          throw new Error('Database configuration not found');
        }
        return dbConfig;
      },
    }),
    AuthModule,
    RoundsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
