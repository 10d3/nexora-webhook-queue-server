import { Router } from 'express';
import { ExpressAdapter } from '@bull-board/express';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { webhookQueue } from '../queue/webhook';
import { scheduledTasksQueue } from '../queue/scheduled-tasks';
import { adminAuthMiddleware } from '../middleware/admin-auth';

// Configure Bull Board Express Adapter
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

createBullBoard({
    queues: [new BullMQAdapter(webhookQueue), new BullMQAdapter(scheduledTasksQueue)],
    serverAdapter: serverAdapter,
});

export const dashboardRouter = Router();

// Mount basic auth and bull-board router
dashboardRouter.use('/', adminAuthMiddleware, serverAdapter.getRouter());
