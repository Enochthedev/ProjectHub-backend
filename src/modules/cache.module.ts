import { Module } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-redis-store';
import redisConfig from '../config/redis.config';

@Module({
  imports: [
    ConfigModule.forFeature(redisConfig),
    NestCacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const redisConfiguration = configService.get('redis');

        return {
          store: redisStore as any,
          host: redisConfiguration.host,
          port: redisConfiguration.port,
          password: redisConfiguration.password,
          db: redisConfiguration.db,
          ttl: 300, // Default TTL in seconds
          max: 1000, // Maximum number of items in cache
          retryDelayOnFailover: redisConfiguration.retryDelayOnFailover,
          enableReadyCheck: redisConfiguration.enableReadyCheck,
          maxRetriesPerRequest: redisConfiguration.maxRetriesPerRequest,
        };
      },
      inject: [ConfigService],
    }),
  ],
  exports: [NestCacheModule],
})
export class CacheModule {}
