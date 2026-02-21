# --------- Base Stage ---------
FROM oven/bun:1 as base
WORKDIR /usr/src/app

# --------- Dependencies Stage ---------
FROM base AS install
# Install ALL dependencies (including dev) for potential build steps
RUN mkdir -p /temp/dev
COPY package.json bun.lockb /temp/dev/
RUN cd /temp/dev && bun install --frozen-lockfile

# Install only production dependencies
RUN mkdir -p /temp/prod
COPY package.json bun.lockb /temp/prod/
RUN cd /temp/prod && bun install --frozen-lockfile --production

# --------- Release Stage ---------
FROM base AS release
# Copy production dependencies
COPY --from=install /temp/prod/node_modules node_modules

# Copy application source code
COPY . .

# Set environment to production
ENV NODE_ENV=production

# Run as a non-root user for security
USER bun

# Expose backend port
EXPOSE 3000

# Start server
CMD ["bun", "run", "start"]
