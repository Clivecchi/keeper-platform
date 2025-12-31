## Single-Domain MVP Setup

Required envs:

- WEB (.env):
  - VITE_PUBLIC_APP_ORIGIN=https://www.ke3p.com
  - VITE_API_URL=https://api.ke3p.com
  - FALLBACK_DOMAIN=www.ke3p.com

- API (.env):
  - PUBLIC_WEB_ORIGIN=https://www.ke3p.com
  - APP_ORIGIN=https://api.ke3p.com
  - CORS_ALLOWLIST=https://www.ke3p.com,https://api.ke3p.com
  - FALLBACK_DOMAIN=www.ke3p.com
  - KEEPER_PROXY_ENABLED=false (keep false in production)

CORS policy:
- Production: allow only https://www.ke3p.com and https://api.ke3p.com
- Dev: also allow http://localhost:5173 and http://localhost:3000

Run:
```
pnpm dev -w apps/web
pnpm dev -w apps/api
pnpm prisma migrate dev && pnpm prisma db seed -w packages/database
```


