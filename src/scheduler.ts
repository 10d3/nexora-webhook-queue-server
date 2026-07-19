import { scheduledTasksQueue } from './queue/scheduled-tasks';

export interface ScheduledJobDef {
    name: string;
    targetPath: string;
    /** Cron pattern for the repeatable registration (UTC) */
    cronPattern: string;
    /** Human-readable cadence, for logs only */
    describe: string;
}

/**
 * Single source of truth for every scheduled task: registerScheduledJobs()
 * uses this to set up the repeatable (cron) registration, and the manual
 * trigger endpoint (api/admin-trigger.ts) uses the SAME list to look up a
 * job's targetPath by name — so the two can never drift out of sync.
 * Adding a new scheduled task (daily/weekly reports, etc.) is one entry here.
 */
export const SCHEDULED_JOBS: ScheduledJobDef[] = [
    {
        name: 'daily-report',
        targetPath: '/api/cron/reports/daily',
        cronPattern: '0 6 * * *', // daily at 06:00 UTC — waiting when owners wake up
        describe: 'daily 06:00 UTC',
    },
    {
        name: 'weekly-report',
        targetPath: '/api/cron/reports/weekly',
        cronPattern: '30 6 * * 1', // Monday 06:30 UTC — staggered after the daily job
        describe: 'weekly, Monday 06:30 UTC',
    },
    {
        name: 'payment-reminders',
        targetPath: '/api/cron/payment-reminders',
        cronPattern: '0 8 * * *', // daily at 08:00 UTC
        describe: 'daily 08:00 UTC',
    },
];

/**
 * Registers repeatable (cron-pattern) jobs. BullMQ dedupes repeat
 * registration by job name + repeat options, so calling this on every server
 * boot is safe — it will not create duplicate schedules.
 *
 * Each job's data carries its OWN targetPath (mirrors how nexora-webhooks
 * jobs carry their own targetUrl) — the worker builds the full URL from
 * env.APP_BASE_URL + targetPath, so adding a new scheduled task later is
 * just one more entry in SCHEDULED_JOBS above, no worker changes needed.
 */
export async function registerScheduledJobs() {
    for (const job of SCHEDULED_JOBS) {
        await scheduledTasksQueue.add(
            job.name,
            { targetPath: job.targetPath },
            {
                repeat: { pattern: job.cronPattern },
                jobId: `${job.name}-repeat`,
            }
        );
        console.log(`[Scheduler] Registered repeatable job: ${job.name} (${job.describe})`);
    }
}
