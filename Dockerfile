# Use Node.js LTS version
FROM node:18-alpine

# Install pnpm with the CORRECT version that matches our lockfile (pnpm v10+)
RUN npm install -g pnpm@10.11.0

# Set working directory
WORKDIR /app

# Set Railway-specific environment variables
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV NPM_CONFIG_UPDATE_NOTIFIER=false
ENV NPM_CONFIG_FUND=false

# Copy package files first (for Docker layer caching)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./

# Copy all packages and apps
COPY tools ./tools
COPY packages ./packages
COPY apps/api ./apps/api

# Install dependencies
RUN pnpm install --frozen-lockfile --no-optional --prefer-offline

# Build all packages and apps
RUN pnpm build

# Verify API build
RUN echo "=== Verifying API build ===" && \
    ls -la apps/api/dist/ && \
    test -f apps/api/dist/index.js && echo "✓ API index.js found!" || echo "✗ API index.js missing!"

# Remove dev dependencies to reduce image size
RUN pnpm prune --prod --config.ignore-scripts=true

# Set environment
ENV NODE_ENV=production

# Railway will set PORT dynamically, but expose 8080 as default
EXPOSE 8080

# Start the API
CMD ["node", "apps/api/dist/index.js"] 