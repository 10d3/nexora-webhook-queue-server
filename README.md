<div align="center">
  <h1>Nexora Webhook Queue Server</h1>
  <p><strong>A blazingly fast, self-hosted webhook dispatcher powered by Bun, Express, and BullMQ.</strong></p>
  
  [![Bun](https://img.shields.io/badge/Bun-%23000000.svg?style=for-the-badge&logo=bun&logoColor=white)](https://bun.sh/)
  [![Express.js](https://img.shields.io/badge/express.js-%23404d59.svg?style=for-the-badge&logo=express&logoColor=%2361DAFB)](https://expressjs.com/)
  [![Redis](https://img.shields.io/badge/redis-%23DD0031.svg?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)
  [![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
</div>

---

## Overview

The Nexora Webhook Queue Server acts as a lightweight, independent shock absorber for your Next.js application. It gracefully handles massive bursts of offline synchronization payloads, queues them securely via Redis, and dispatches them efficiently to your core business logic logic using robust exponential backoff.

By self-hosting this dedicated queue worker, you bypass SaaS limits (like QStash's free tier) while maintaining enterprise-grade reliability and a beautiful monitoring interface.

## Key Features

- **Blazing Fast**: Built on the [Bun](https://bun.sh/) runtime for lightning-fast startup and execution.
- **Secure Payloads**: Every outgoing webhook is signed with an HMAC SHA256 signature to guarantee authenticity.
- **Auto-Retries**: Native error handling with robust exponential backoff using the industry-standard [BullMQ](https://docs.bullmq.io/).
- **Beautiful Dashboard**: Built-in monitoring UI using `@bull-board` to visualize job health, manually retry jobs, or clean up queues.
- **Fully Decoupled**: Zero database dependencies (`Prisma`), meaning it runs safely anywhere with a Redis instance.
- **Docker Ready**: Includes a highly optimized, multi-stage Dockerfile that drops dev dependencies and runs as a non-root User for enhanced security.

## Architecture

```mermaid
graph TD
    API_SYNC[Next.js /api/sync] -->|POST /enqueue<br>(Bearer Token)| HTTP_IN[Queue Receiver API]
    
    subgraph Nexora Queue Server
        HTTP_IN -->|bullmq.addBulk| REDIS[(Redis)]
        REDIS -->|Worker Job| WORKER[Webhook Dispatcher]
        BOARD[Bull-Board UI] -.->|Monitor & Admin| REDIS
    end
    
    WORKER -->|POST Fetch<br>(HMAC Signature)| API_PROC[Next.js /api/process-queue]
```

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) installed locally.
- A running [Redis](https://redis.io/) instance (Local, Docker, or Upstash).

### Installation

1. Clone the repository and install dependencies:
   ```bash
   bun install
   ```

2. Copy the example environment variables:
   ```bash
   cp .env.example .env
   ```

3. Update `.env` with your secure credentials, Redis URL, and Target URL.

### Docker Deployment

Use the provided `docker-compose.yml` to spin up both the Nexora Server and a persistent Redis instance instantly.

```bash
docker-compose up -d
```

### Development

Run the development server natively:
```bash
bun run dev
```

*(Alternatively: `bun run src/index.ts` if scripts aren't configured)*

## API Endpoints

### 1. Ingestion (`POST /enqueue`)
**Purpose:** Accepts incoming offline payloads from the main Nexora app.
- **Headers:** `Authorization: Bearer <INTERNAL_ACCESS_TOKEN>`
- **Payload:** Array of actions.
  ```json
  {
    "actions": [
      {
        "name": "CREATE_ORDER",
        "params": {
          "data": { "total": 45.00 },
          "tenantId": "t_123"
        }
      }
    ],
    "targetUrl": "https://myapp.com/api/process-queue" // Optional: Overrides DEFAULT_TARGET_URL
  }
  ```

### 2. Dashboard (`GET /admin/queues`)
**Purpose:** Visual monitoring interface.
- Protected by **Basic Auth** using `ADMIN_USER` and `ADMIN_PASS` from `.env`.

## Security Posture

**Never expose the Next.js target processing route!**

Because the background worker does not have access to user browser cookies/sessions, it securely signs the raw JSON payload body using the `WEBHOOK_SECRET` before transmission.
The receiving application *must* recreate the signature on the exact payload string and compare it against the `nexora-signature` header to verify authenticity. 

---

<div align="center">
  Built for scale, designed for resilience.
</div>
