# Use Node.js LTS version
FROM node:18-alpine AS base

# Install pnpm
RUN npm install -g pnpm

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY turbo.json ./

# Copy tools and packages
COPY tools ./tools
COPY packages ./packages
COPY apps/api ./apps/api

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build the project (this will generate Prisma client and build all packages)
RUN pnpm turbo build --filter=keeper-api...

# Production stage
FROM node:18-alpine AS production

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy built application
COPY --from=base /app/apps/api/dist ./apps/api/dist
COPY --from=base /app/apps/api/package.json ./apps/api/package.json

# Copy built packages with their dist folders
COPY --from=base /app/packages/database/dist ./packages/database/dist
COPY --from=base /app/packages/database/package.json ./packages/database/package.json
COPY --from=base /app/packages/database/prisma ./packages/database/prisma

COPY --from=base /app/packages/kam/dist ./packages/kam/dist
COPY --from=base /app/packages/kam/package.json ./packages/kam/package.json

COPY --from=base /app/packages/shared/dist ./packages/shared/dist
COPY --from=base /app/packages/shared/package.json ./packages/shared/package.json

# Copy root package files
COPY --from=base /app/package.json ./package.json
COPY --from=base /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=base /app/pnpm-workspace.yaml ./pnpm-workspace.yaml

# Copy node_modules with Prisma client
COPY --from=base /app/node_modules ./node_modules

# Expose port
EXPOSE 3001

# Start the application
CMD ["node", "apps/api/dist/index.js"] 