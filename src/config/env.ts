import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env file
config({ path: resolve(process.cwd(), '.env') });

const requireEnv = (name: string) => {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
};

export const env = {
    PORT: parseInt(process.env.PORT || '3000', 10),
    REDIS_URL: requireEnv('REDIS_URL'),
    INTERNAL_ACCESS_TOKEN: requireEnv('INTERNAL_ACCESS_TOKEN'),
    WEBHOOK_SECRET: requireEnv('WEBHOOK_SECRET'),
    DEFAULT_TARGET_URL: requireEnv('DEFAULT_TARGET_URL'),
    ADMIN_USER: requireEnv('ADMIN_USER'),
    ADMIN_PASS: requireEnv('ADMIN_PASS'),
};
