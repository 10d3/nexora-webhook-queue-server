import { Router, type Request, type Response } from 'express';
import { env } from '../config/env';
import { webhookQueue } from '../queue/webhook';

const router = Router();

// Define input types for safety
interface ActionPayload {
    name: string;
    params: {
        data: any;
        tenantId: string;
    };
}

interface EnqueueBody {
    actions: ActionPayload[];
    targetUrl?: string;
}

// Next.js calls this when the Service Worker comes back online
router.post('/enqueue', async (req: Request, res: Response): Promise<any> => {
    const { actions, targetUrl } = req.body as EnqueueBody;

    // Verify super-secret auth token from Next.js
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${env.INTERNAL_ACCESS_TOKEN}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!actions || !Array.isArray(actions)) {
        return res.status(400).json({ error: 'Invalid payload: expected actions array' });
    }

    // Map to bullmq job format
    const jobs = actions.map(action => ({
        name: 'webhook-dispatch',
        data: {
            actionName: action.name,
            payload: action.params?.data,
            tenantId: action.params?.tenantId,
            targetUrl: targetUrl || env.DEFAULT_TARGET_URL
        },
        opts: {
            attempts: 5,
            backoff: { type: 'exponential', delay: 2000 }
        }
    }));

    // Bulk add is extremely fast for Redis
    await webhookQueue.addBulk(jobs);

    return res.json({ queued: jobs.length });
});

export const ingestionRouter = router;
