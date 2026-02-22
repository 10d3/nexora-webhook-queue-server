# --------- Base Stage ---------
FROM oven/bun:1 as base
WORKDIR /usr/src/app

# --------- Dependencies Stage ---------
FROM base AS install
# Install ALL dependencies (including dev) for potential build steps
RUN mkdir -p /temp/dev
COPY package.json bun.lock /temp/dev/
RUN cd /temp/dev && bun install --frozen-lockfile

# Install only production dependencies
RUN mkdir -p /temp/prod
COPY package.json bun.lock /temp/prod/
RUN cd /temp/prod && bun install --frozen-lockfile --production

# --------- Release Stage ---------
FROM base AS release
# Copy production dependencies
COPY --from=install /temp/prod/node_modules node_modules

# Copy application source code
COPY . .

# Set environment to production
ENV NODE_ENV=production

# Install curl for reliable healthchecks (Bun base image is slim and misses it)
USER root
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*
USER bun

# Run as a non-root user for security
USER bun

# Expose backend port
EXPOSE 3000

# Inform Docker how to test if the container is healthy
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Start server
CMD ["bun", "run", "start"]
