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
        // 10:00 UTC ≈ 05:00 Haiti time — well after any overnight session
        // (open past midnight) has closed, so "yesterday" is fully settled
        // before the report generates.
        cronPattern: '0 10 * * *',
        describe: 'daily 10:00 UTC',
    },
    {
        name: 'weekly-report',
        targetPath: '/api/cron/reports/weekly',
        cronPattern: '30 10 * * 1', // Monday 10:30 UTC — staggered after the daily job
        describe: 'weekly, Monday 10:30 UTC',
    },
    {
        name: 'payment-reminders',
        targetPath: '/api/cron/payment-reminders',
        cronPattern: '0 8 * * *', // daily at 08:00 UTC
        describe: 'daily 08:00 UTC',
    },
    {
        name: 'closing-report',
        targetPath: '/api/cron/reports/closing',
        // Per-tenant closing times vary (businessHours + timezone are set
        // per tenant), unlike the other jobs above which fire once globally
        // — this one needs a frequent cadence so the target route's own
        // tolerance window (30 min, see runClosingReportSweep) reliably
        // catches each tenant's actual local closing time.
        cronPattern: '*/15 * * * *', // every 15 minutes
        describe: 'every 15 minutes',
    },
];

/**
 * Registers repeatable (cron-pattern) jobs — idempotent AND self-correcting:
 * BullMQ keys a repeatable registration off name + repeat options together,
 * so merely calling .add() again with a CHANGED cronPattern does NOT replace
 * the old schedule — it leaves it running alongside the new one forever.
 * To change a schedule safely, any existing repeatable for a known job name
 * is removed first, then re-added fresh from the current SCHEDULED_JOBS
 * definition. Safe to call on every boot either way (removing + re-adding an
 * unchanged schedule is a harmless no-op).
 */
export async function registerScheduledJobs() {
    const existing = await scheduledTasksQueue.getRepeatableJobs();
    const knownNames = new Set(SCHEDULED_JOBS.map((j) => j.name));

    for (const repeatable of existing) {
        if (knownNames.has(repeatable.name)) {
            await scheduledTasksQueue.removeRepeatableByKey(repeatable.key);
            console.log(`[Scheduler] Removed stale repeatable: ${repeatable.name} (was "${repeatable.pattern}")`);
        }
    }

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
