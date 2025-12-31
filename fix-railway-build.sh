#!/bin/bash

# Railway Build Fix Script
# This script addresses the systematic TypeScript errors causing Railway deployment failures

set -e

echo "🔧 Starting Railway build fix..."

# Step 1: Fix authentication type issues
echo "1️⃣ Fixing authentication type issues..."

# Fix sole-memory-routes.ts - replace all remaining domainPermissionMiddleware references
find apps/api/src -name "*.ts" -type f -exec sed -i 's/domainPermissionMiddleware(\[.*\])/requireDomainReadCompat/g' {} \;

# Step 2: Fix import paths to use @keeper/database
echo "2️⃣ Fixing import paths..."

# Fix domain-integrated routes imports
find apps/api/src/api -name "domain-integrated-routes.ts" -type f -exec sed -i 's/from.*packages\/database\/src\/services.*/from '\''@keeper\/database'\'';/g' {} \;

# Step 3: Fix middleware return types
echo "3️⃣ Fixing middleware return types..."

# Add proper typing for middleware functions
find apps/api/src -name "*.ts" -type f -exec sed -i 's/: Promise<void>/: Promise<void | Response>/g' {} \;

# Step 4: Fix Prisma model relations
echo "4️⃣ Fixing Prisma relations..."

# Fix Keeper model relations - remove invalid Moment relation
find apps/api/src -name "*.ts" -type f -exec sed -i '/Moment: {/,/},/d' {} \;

# Fix Journey model relations
find apps/api/src -name "*.ts" -type f -exec sed -i 's/moments:/Moment:/g' {} \;
find apps/api/src -name "*.ts" -type f -exec sed -i 's/journeys:/Journey:/g' {} \;

# Step 5: Add missing authentication checks
echo "5️⃣ Adding authentication checks..."

# Add user authentication checks to all route handlers
find apps/api/src/api -name "*.ts" -type f -exec sed -i '/req\.user\!/i\
      if (!req.user) {\
        return res.status(401).json({ error: '\''Authentication required'\'' });\
      }\
' {} \;

# Step 6: Fix code paths to ensure returns
echo "6️⃣ Fixing code paths..."

# Ensure all async functions have proper return statements
find apps/api/src -name "*.ts" -type f -exec sed -i 's/res\.json(/return res.json(/g' {} \;
find apps/api/src -name "*.ts" -type f -exec sed -i 's/res\.status(.*)\.json(/return res.status(\1).json(/g' {} \;

# Step 7: Fix package.json for proper module resolution
echo "7️⃣ Fixing package.json..."

# Update package.json to ensure proper module resolution
cat > apps/api/package.json << 'EOF'
{
  "name": "@keeper/api",
  "version": "1.0.0",
  "type": "module",
  "main": "src/index.ts",
  "scripts": {
    "build": "tsc",
    "dev": "nodemon --exec ts-node --esm src/index.ts",
    "start": "node dist/index.js",
    "test": "jest"
  },
  "dependencies": {
    "@keeper/database": "workspace:*",
    "@keeper/kam": "workspace:*",
    "@keeper/shared": "workspace:*",
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "zod": "^3.22.4",
    "jsonwebtoken": "^9.0.2",
    "bcryptjs": "^2.4.3",
    "ioredis": "^5.3.2",
    "express-rate-limit": "^7.1.5"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/cors": "^2.8.17",
    "@types/node": "^20.10.5",
    "@types/jsonwebtoken": "^9.0.5",
    "@types/bcryptjs": "^2.4.6",
    "typescript": "^5.3.3",
    "nodemon": "^3.0.2",
    "ts-node": "^10.9.2",
    "jest": "^29.7.0",
    "@types/jest": "^29.5.8"
  }
}
EOF

# Step 8: Update tsconfig.json for ESM compatibility
echo "8️⃣ Updating TypeScript configuration..."

cat > apps/api/tsconfig.json << 'EOF'
{
  "extends": "../../tools/tsconfig/node.json",
  "compilerOptions": {
    "module": "ESNext",
    "target": "ES2022",
    "moduleResolution": "node",
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "strict": true,
    "declaration": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "baseUrl": ".",
    "paths": {
      "@keeper/database": ["../../packages/database/src"],
      "@keeper/kam": ["../../packages/kam/src"],
      "@keeper/shared": ["../../packages/shared/src"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
EOF

# Step 9: Install dependencies and build
echo "9️⃣ Installing dependencies..."
cd apps/api
pnpm install

echo "🔨 Building packages..."
cd ../../
pnpm run build

echo "✅ Railway build fix complete!"
echo ""
echo "🚀 Next steps:"
echo "1. Commit these changes: git add . && git commit -m 'Fix Railway build errors'"
echo "2. Push to Railway: git push origin main"
echo "3. Monitor Railway build logs for any remaining issues"
echo ""
echo "🔍 Common remaining issues to check:"
echo "- Ensure all @keeper/database exports are available"
echo "- Verify Redis connection string is set in Railway environment"
echo "- Check that all Prisma models are properly generated" 