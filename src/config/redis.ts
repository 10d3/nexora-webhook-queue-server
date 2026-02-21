import Redis from 'ioredis';
import { env } from './env';

// Create a singleton connection for Redis
export const redisConnection = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null, // Required by BullMQ
    enableReadyCheck: false
});

redisConnection.on('error', (err) => {
    console.error('[Redis Error]', err);
});
