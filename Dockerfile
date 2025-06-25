# Use Node.js LTS version
FROM node:18-alpine AS base

# Install pnpm
RUN npm install -g pnpm

# Set working directory
WORKDIR /app

# Copy package files first for better layer caching
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./

# Copy all workspace packages and apps
COPY tools ./tools
COPY packages ./packages
COPY apps/api ./apps/api

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Build everything
RUN pnpm turbo build --filter=keeper-api...

# Production stage - Create standalone app
FROM node:18-alpine AS production

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Create a standalone application structure
# Copy the API's built code
COPY --from=base /app/apps/api/dist ./dist
COPY --from=base /app/apps/api/package.json ./package.json

# Copy built workspace packages as regular node_modules
RUN mkdir -p node_modules/@keeper

# Copy shared package
COPY --from=base /app/packages/shared/dist ./node_modules/@keeper/shared/dist
COPY --from=base /app/packages/shared/package.json ./node_modules/@keeper/shared/package.json

# Copy kam package  
COPY --from=base /app/packages/kam/dist ./node_modules/@keeper/kam/dist
COPY --from=base /app/packages/kam/package.json ./node_modules/@keeper/kam/package.json

# Copy database package
COPY --from=base /app/packages/database/dist ./node_modules/@keeper/database/dist
COPY --from=base /app/packages/database/package.json ./node_modules/@keeper/database/package.json
COPY --from=base /app/packages/database/prisma ./node_modules/@keeper/database/prisma

# Install only the API's production dependencies
RUN pnpm install --prod --no-optional

# Generate Prisma client for production
RUN cd node_modules/@keeper/database && npx prisma generate

# Set environment
ENV NODE_ENV=production

# Expose port
EXPOSE 3001

# Start the application
CMD ["node", "dist/index.js"] 