import { Queue } from 'bullmq';
import { redisConnection } from '../config/redis';

// Cron-pattern repeatable jobs (payment reminders, reports, etc.) — separate
// from nexora-webhooks (which carries offline-sync replay actions) so the
// two concerns don't share a dashboard view or retry policy.
export const scheduledTasksQueue = new Queue('nexora-scheduled-tasks', {
    connection: redisConnection as any
});
