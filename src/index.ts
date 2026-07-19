import express from 'express';
import helmet from 'helmet';
import { env } from './config/env';
import { ingestionRouter } from './api/ingestion';
import { dashboardRouter } from './api/dashboard';
import { adminTriggerRouter } from './api/admin-trigger';
import { registerScheduledJobs } from './scheduler';

// Initialize background workers (dispatchWorker + scheduledTaskWorker)
import './worker';

const app = express();

// Security headers
app.use(helmet());

// Parse JSON payloads (increase limit if huge offline batches are expected)
app.use(express.json({ limit: '10mb' }));

// Mount Ingestion API (The QStash replacement)
app.use('/', ingestionRouter);

// Mount Monitoring Dashboard
app.use('/admin/queues', dashboardRouter);

// Mount manual job trigger (same basic auth as the dashboard) — GET lists
// known jobs, POST /admin/trigger/<name> fires one immediately for testing
app.use('/admin/trigger', adminTriggerRouter);

// Register cron-pattern repeatable jobs (idempotent — safe on every boot)
registerScheduledJobs().catch((err) => {
    console.error('[Scheduler] Failed to register scheduled jobs:', err);
});

// Start Server
app.listen(env.PORT, () => {
    console.log(`Nexora Queue Server running on http://localhost:${env.PORT}`);
    console.log(`Bull-Board Dashboard available at http://localhost:${env.PORT}/admin/queues`);
    console.log(`Manual job trigger available at http://localhost:${env.PORT}/admin/trigger`);
});
