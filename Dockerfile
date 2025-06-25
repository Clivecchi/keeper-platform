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

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Build everything
RUN pnpm turbo build --filter=keeper-api...

# Remove dev dependencies to reduce image size
RUN pnpm prune --prod

# Set environment
ENV NODE_ENV=production

# Expose port
EXPOSE 3001

# Start the application from the workspace root
CMD ["node", "apps/api/dist/index.js"] 