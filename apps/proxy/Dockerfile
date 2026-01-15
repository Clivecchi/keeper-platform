# Use Node.js 20
FROM node:20-alpine

# Install pnpm
RUN npm install -g pnpm@10.11.0

# Set working directory to app root (this is the proxy folder context)
WORKDIR /app

# Copy only proxy package manifests first (better cache)
COPY package.json pnpm-lock.yaml* ./

# Install dependencies (production build needs dev deps for TypeScript build)
RUN pnpm install --frozen-lockfile

# Copy the rest of the proxy source
COPY . .

# Build proxy
RUN pnpm build

# Verify build output exists (adjust if your build outputs a different file)
RUN test -f dist/index.js && echo "✓ Proxy build successful!" || (echo "✗ Proxy build failed!" && exit 1)

# Set environment
ENV NODE_ENV=production

# Expose port (keep consistent with your service)
EXPOSE 8080

# Start the proxy
CMD ["node", "dist/index.js"]


