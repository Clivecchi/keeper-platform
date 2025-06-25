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
    echo "=== KAM auth index.ts content ===" && \
    cat packages/kam/src/auth/index.ts

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Build everything with verbose output
RUN echo "=== Starting build ===" && \
    pnpm turbo build --filter=keeper-api...

# Debug: List built files to ensure they exist
RUN echo "=== Checking built files ===" && \
    ls -la packages/kam/dist/auth/ && \
    echo "=== Contents of kam auth index.js ===" && \
    cat packages/kam/dist/auth/index.js && \
    echo "=== Checking if register.js exists ===" && \
    ls -la packages/kam/dist/auth/register.js && \
    echo "=== End debug ==="

# Remove dev dependencies to reduce image size
RUN pnpm prune --prod

# Set environment
ENV NODE_ENV=production

# Expose port
EXPOSE 3001

# Start the application from the workspace root
CMD ["node", "apps/api/dist/index.js"] 