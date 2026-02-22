import express from 'express';
import helmet from 'helmet';
import { env } from './config/env';
import { ingestionRouter } from './api/ingestion';
import { dashboardRouter } from './api/dashboard';

// Initialize background worker
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

// Start Server
app.listen(env.PORT, () => {
    console.log(`Nexora Queue Server running on http://localhost:${env.PORT}`);
    console.log(`Bull-Board Dashboard available at http://localhost:${env.PORT}/admin/queues`);
});
