# Use Node.js 20
FROM node:20-alpine

# Install pnpm
RUN npm install -g pnpm@10.11.0

# Set working directory to repo root
WORKDIR /app

# Copy monorepo root files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy proxy package.json
COPY apps/proxy/package.json ./apps/proxy/

# Install dependencies for proxy only
RUN pnpm install --frozen-lockfile --filter proxy

# Copy proxy source
COPY apps/proxy ./apps/proxy

# Build proxy
RUN pnpm --filter proxy build

# Verify build
RUN test -f apps/proxy/dist/index.js && echo "✓ Proxy build successful!" || (echo "✗ Proxy build failed!" && exit 1)

# Set environment
ENV NODE_ENV=production

# Expose port
EXPOSE 8080

# Start the proxy
WORKDIR /app/apps/proxy
CMD ["node", "dist/index.js"]

