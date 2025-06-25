# Use Node.js LTS version
FROM node:18-alpine

# Install pnpm with the CORRECT version that matches our lockfile (pnpm v10+)
RUN npm install -g pnpm@10.11.0

# Install dependencies for debugging and file operations
RUN apk add --no-cache tree

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

# Railway-specific: Clear any potential cache issues
RUN rm -rf node_modules/.cache || true
RUN rm -rf .pnpm-store || true

# Debug: Comprehensive source file verification
RUN echo "=== RAILWAY DEBUG: Source file verification ===" && \
    find packages/kam/src -name "*.ts" -type f | head -20 && \
    echo "=== register.ts content check ===" && \
    head -5 packages/kam/src/auth/register.ts && \
    echo "=== index.ts exports check ===" && \
    grep -n "register" packages/kam/src/auth/index.ts || echo "No register exports found"

# Railway-optimized: Install with correct pnpm version and fallback
RUN pnpm install --frozen-lockfile --no-optional --prefer-offline || \
    (echo "Lockfile incompatible, recreating..." && pnpm install --force --no-optional --prefer-offline)

# Railway-specific: Force workspace dependency resolution if needed
RUN pnpm install --fix-lockfile || true

# Build packages in dependency order with Railway optimizations
RUN echo "=== RAILWAY: Building with individual error isolation ===" && \
    pnpm --filter @keeper/shared build && \
    echo "Shared package built successfully"

RUN echo "=== RAILWAY: Building database package ===" && \
    pnpm --filter @keeper/database build && \
    echo "Database package built successfully"

# Critical: Build KAM with extra debugging for Railway
RUN echo "=== RAILWAY: Building KAM with debugging ===" && \
    cd packages/kam && \
    pnpm build --verbose 2>&1 | tee build.log && \
    echo "KAM build completed"

# Railway-specific: Verify compilation artifacts immediately after each build
RUN echo "=== RAILWAY: Post-build verification ===" && \
    ls -la packages/kam/dist/auth/ && \
    file packages/kam/dist/auth/register.js || echo "register.js missing!" && \
    cat packages/kam/dist/auth/index.js | head -10

# Build API last
RUN echo "=== RAILWAY: Building API ===" && \
    pnpm --filter keeper-api build

# Railway-specific: Final comprehensive verification
RUN echo "=== RAILWAY: Final file system state ===" && \
    find packages/kam/dist -name "*.js" -type f && \
    echo "=== Testing register.js module resolution ===" && \
    node -e "import('./packages/kam/dist/auth/register.js').then(m => console.log('✓ register.js imports successfully', Object.keys(m))).catch(e => console.error('✗ register.js import failed:', e.message))"

# Railway cache workaround: Remove build artifacts and rebuild if needed
RUN if [ ! -f packages/kam/dist/auth/register.js ]; then \
        echo "=== RAILWAY: register.js missing, applying cache workaround ===" && \
        rm -rf packages/kam/dist && \
        cd packages/kam && \
        pnpm build --no-cache && \
        ls -la dist/auth/; \
    fi

# Remove dev dependencies to reduce image size (Railway optimization)
RUN pnpm prune --prod --config.ignore-scripts=true

# Set environment
ENV NODE_ENV=production

# Expose port
EXPOSE 3001

# Railway-specific: Add startup verification
CMD ["sh", "-c", "echo 'Starting Railway deployment...' && node --version && ls -la packages/kam/dist/auth/ && node apps/api/dist/index.js"] 