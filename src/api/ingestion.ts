import { Router, type Request, type Response } from 'express';
import { env } from '../config/env';
import { webhookQueue } from '../queue/webhook';

const router = Router();

// Define input types for safety
interface ActionPayload {
    // Stable client-generated id — doubles as idempotency key and BullMQ jobId
    id?: string;
    name: string;
    params: {
        data: any;
        tenantId: string;
        businessType?: string;
    };
    // Identity of the user who performed the action, stamped server-side by
    // Nexora's /api/sync. Must reach /api/process-queue or permission checks fail.
    actor?: {
        id: string;
        role?: string;
        tenantId?: string;
        name?: string;
    };
}

interface EnqueueBody {
    actions: ActionPayload[];
    targetUrl?: string;
}

// Simple healthcheck endpoint for Docker/Coolify
router.get('/health', (req: Request, res: Response) => {
    res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

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
            // /api/process-queue reads payload.data / payload.categoryId / etc,
            // so forward the whole params object, not just params.data
            payload: action.params,
            tenantId: action.params?.tenantId,
            businessType: action.params?.businessType,
            actor: action.actor,
            clientRequestId: action.id,
            targetUrl: targetUrl || env.DEFAULT_TARGET_URL
        },
        opts: {
            attempts: 5,
            backoff: { type: 'exponential', delay: 2000 },
            // Same client action re-submitted while its job still exists is a
            // no-op — first line of dedupe (Nexora's SyncedAction is the second)
            ...(action.id ? { jobId: action.id } : {})
        }
    }));

    // Bulk add is extremely fast for Redis
    await webhookQueue.addBulk(jobs);

    return res.json({ queued: jobs.length });
});

export const ingestionRouter = router;
