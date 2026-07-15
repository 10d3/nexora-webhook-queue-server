import { Worker, Job, UnrecoverableError } from 'bullmq';
import crypto from 'crypto';
import { redisConnection } from './config/redis';
import { env } from './config/env';

// Worker will process jobs automatically if launched, so we export it
export const dispatchWorker = new Worker('nexora-webhooks', async (job: Job) => {
    const { actionName, payload, tenantId, businessType, actor, clientRequestId, targetUrl } = job.data;

    // Clean payload matching Nexora spec — actor carries the original user's
    // identity so /api/process-queue can pass permission checks;
    // clientRequestId is Nexora's idempotency key
    const bodyString = JSON.stringify({ actionName, payload, tenantId, businessType, actor, clientRequestId });

    // Webhook Security: Generate HMAC SHA256 signature
    const signature = crypto
        .createHmac('sha256', env.WEBHOOK_SECRET)
        .update(bodyString)
        .digest('hex');

    console.log(`[Worker] Dispatching Job ${job.id} -> ${targetUrl} [Action: ${actionName}]`);

    // Fire the webhook
    const response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'nexora-signature': signature,
        },
        body: bodyString
    });

    if (!response.ok) {
        const errorText = await response.text();

        // 422 = the action was processed and rejected (permission, validation,
        // business rule). Retrying can never succeed — fail the job permanently.
        if (response.status === 422) {
            throw new UnrecoverableError(`Action rejected (422): ${errorText}`);
        }

        // Throwing error causes BullMQ to trigger retry mechanism
        throw new Error(`Webhook failed with status: ${response.status}. Body: ${errorText}`);
    }

    const responseText = await response.text();
    console.log(`[Worker] ✨ Success Job ${job.id}`);
    return responseText;

}, {
    connection: redisConnection as any,
    concurrency: 10 // Handle 10 simultaneous fetch requests safely
});

dispatchWorker.on('failed', (job, err) => {
    console.error(`[Worker] ❌ Failed Job ${job?.id} (Action: ${job?.data?.actionName}): ${err.message}`);
});
