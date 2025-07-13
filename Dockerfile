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
# Use Turbo to handle the build order properly
RUN echo "=== RAILWAY: Building all packages with Turbo ===" && \
    pnpm build && \
    echo "All packages built successfully"

# Railway-specific: Verify compilation artifacts immediately after build
RUN echo "=== RAILWAY: Post-build verification ===" && \
    echo "Checking if KAM dist exists:" && \
    ls -la packages/kam/dist/ && \
    echo "Checking if auth directory exists:" && \
    ls -la packages/kam/dist/auth/ && \
    echo "Checking for register.js:" && \
    test -f packages/kam/dist/auth/register.js && echo "✓ register.js found!" || echo "✗ register.js missing!" && \
    echo "Contents of auth index.js:" && \
    cat packages/kam/dist/auth/index.js | head -10

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
        pnpm build && \
        ls -la dist/auth/; \
    fi

# CRITICAL FIX: Ensure API is built - EXPLICIT BUILD STEP
RUN echo "=== RAILWAY: Building API application ===" && \
    echo "Checking API source files:" && \
    ls -la apps/api/src/ && \
    echo "Building API with explicit TypeScript compilation:" && \
    cd apps/api && \
    pnpm build && \
    echo "API build complete. Checking dist:" && \
    ls -la dist/ && \
    echo "Checking for index.js:" && \
    test -f dist/index.js && echo "✓ API index.js found!" || echo "✗ API index.js missing!"

# Railway-specific: Verify API build artifacts
RUN echo "=== RAILWAY: API build verification ===" && \
    echo "API dist directory contents:" && \
    ls -la apps/api/dist/ && \
    echo "API index.js content (first 10 lines):" && \
    head -10 apps/api/dist/index.js && \
    echo "Testing API module resolution:" && \
    node -e "import('./apps/api/dist/index.js').then(m => console.log('✓ API imports successfully')).catch(e => console.error('✗ API import failed:', e.message))"

# FALLBACK: If API build failed, try alternative approach
RUN if [ ! -f apps/api/dist/index.js ]; then \
        echo "=== RAILWAY: API build failed, trying alternative approach ===" && \
        cd apps/api && \
        rm -rf dist && \
        npx tsc --project tsconfig.json && \
        echo "Alternative build complete. Checking dist:" && \
        ls -la dist/ && \
        test -f dist/index.js && echo "✓ API index.js found!" || echo "✗ API index.js still missing!"; \
    fi

# Remove dev dependencies to reduce image size (Railway optimization)
RUN pnpm prune --prod --config.ignore-scripts=true

# Set environment
ENV NODE_ENV=production

# Railway will set PORT dynamically, but expose 8080 as default
EXPOSE 8080

# Railway-specific: Add startup verification
CMD ["sh", "-c", "echo 'Starting Railway deployment...' && node --version && ls -la packages/kam/dist/auth/ && ls -la apps/api/dist/ && node apps/api/dist/index.js"] 