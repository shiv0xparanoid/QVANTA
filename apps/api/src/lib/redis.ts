import Redis from 'ioredis';
import { logger } from './logger';

let redisInstance: Redis | null = null;

export function getRedis(): Redis {
  if (!redisInstance) {
    const url = process.env.REDIS_URL;
    if (!url) {
      throw new Error('REDIS_URL is not defined');
    }
    redisInstance = new Redis(url, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
    });
    redisInstance.on('error', (err) => {
      logger.error(`Redis connection error: ${err.message}`);
    });
    redisInstance.on('connect', () => {
      logger.info('Redis connected');
    });
  }
  return redisInstance;
}

export const redis = getRedis();
