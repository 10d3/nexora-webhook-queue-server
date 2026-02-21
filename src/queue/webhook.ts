import { Queue } from 'bullmq';
import { redisConnection } from '../config/redis';

// Define the queue with our singleton connection
export const webhookQueue = new Queue('nexora-webhooks', {
    connection: redisConnection as any
});
