import { Router, type Request, type Response } from 'express';
import { scheduledTasksQueue } from '../queue/scheduled-tasks';
import { SCHEDULED_JOBS } from '../scheduler';
import { adminAuthMiddleware } from '../middleware/admin-auth';

const router = Router();
router.use(adminAuthMiddleware);

// List known scheduled jobs — handy to check names before triggering
router.get('/', (_req: Request, res: Response) => {
    res.json({ jobs: SCHEDULED_JOBS.map((j) => ({ name: j.name, describe: j.describe })) });
});

// Fire a job right now, bypassing its cron schedule — for testing without
// waiting for the real tick. Runs through the exact same worker/webhook path
// as a scheduled firing, just enqueued immediately with no `repeat` option.
router.post('/:jobName', async (req: Request, res: Response): Promise<any> => {
    const { jobName } = req.params;
    const job = SCHEDULED_JOBS.find((j) => j.name === jobName);

    if (!job) {
        return res.status(404).json({
            error: `Unknown job "${jobName}"`,
            known: SCHEDULED_JOBS.map((j) => j.name),
        });
    }

    const queuedJob = await scheduledTasksQueue.add(
        job.name,
        { targetPath: job.targetPath },
        { jobId: `${job.name}-manual-${Date.now()}` }
    );

    console.log(`[Admin] Manually triggered "${job.name}" (job id ${queuedJob.id})`);
    res.json({ triggered: job.name, jobId: queuedJob.id });
});

export const adminTriggerRouter = router;
