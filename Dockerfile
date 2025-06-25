# Use Node.js LTS version
FROM node:18-alpine

# Install pnpm
RUN npm install -g pnpm

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./

# Copy all packages and apps
COPY tools ./tools
COPY packages ./packages
COPY apps/api ./apps/api

# Debug: Check source files before building
RUN echo "=== Checking source files ===" && \
    ls -la packages/kam/src/auth/ && \
    echo "=== register.ts exists? ===" && \
    test -f packages/kam/src/auth/register.ts && echo "Yes" || echo "No"

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Build each package individually to catch specific errors
RUN echo "=== Building database package ===" && \
    pnpm --filter @keeper/database build

RUN echo "=== Building shared package ===" && \
    pnpm --filter @keeper/shared build

RUN echo "=== Building KAM package ===" && \
    pnpm --filter @keeper/kam build

RUN echo "=== Building API package ===" && \
    pnpm --filter keeper-api build

# Debug: Verify all built files exist
RUN echo "=== Checking KAM built files ===" && \
    ls -la packages/kam/dist/auth/ && \
    echo "=== register.js exists? ===" && \
    test -f packages/kam/dist/auth/register.js && echo "Yes - $(ls -la packages/kam/dist/auth/register.js)" || echo "No" && \
    echo "=== Contents of auth index.js ===" && \
    cat packages/kam/dist/auth/index.js

# Remove dev dependencies to reduce image size
RUN pnpm prune --prod

# Set environment
ENV NODE_ENV=production

# Expose port
EXPOSE 3001

# Start the application from the workspace root
CMD ["node", "apps/api/dist/index.js"] 