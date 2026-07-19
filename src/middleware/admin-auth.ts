import basicAuth from 'express-basic-auth';
import { env } from '../config/env';

// Shared by the Bull-Board dashboard and the manual job-trigger endpoint —
// one place for the ADMIN_USER/ADMIN_PASS wiring.
export const adminAuthMiddleware = basicAuth({
    users: { [env.ADMIN_USER]: env.ADMIN_PASS },
    challenge: true,
    realm: 'Nexora Queue Admin',
});
