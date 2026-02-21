import { Router } from 'express';
import basicAuth from 'express-basic-auth';
import { ExpressAdapter } from '@bull-board/express';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { env } from '../config/env';
import { webhookQueue } from '../queue/webhook';

// Setup basic authentication middleware
const basicAuthMiddleware = basicAuth({
    users: { [env.ADMIN_USER]: env.ADMIN_PASS },
    challenge: true,
    realm: 'BullMQ Dashboard',
});

// Configure Bull Board Express Adapter
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

createBullBoard({
    queues: [new BullMQAdapter(webhookQueue)],
    serverAdapter: serverAdapter,
});

export const dashboardRouter = Router();

// Mount basic auth and bull-board router
dashboardRouter.use('/', basicAuthMiddleware, serverAdapter.getRouter());
