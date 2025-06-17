# Stop any running Node processes
taskkill /F /IM node.exe

# Remove Prisma files
Remove-Item -Path "node_modules\.prisma" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "node_modules\@prisma" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "node_modules\.pnpm\@prisma+client*" -Recurse -Force -ErrorAction SilentlyContinue

# Clean install
Remove-Item -Path "node_modules" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "pnpm-lock.yaml" -Force -ErrorAction SilentlyContinue
pnpm install

# Generate Prisma client
pnpm prisma generate 