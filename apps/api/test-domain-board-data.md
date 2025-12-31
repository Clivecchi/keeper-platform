# Testing Domain Board Data API

## Endpoint
```
GET /api/domains/:domainId/board-data
```

## Authentication
Requires bearer token with valid user session.

## Test Cases

### 1. Public View (Non-Admin)
```bash
curl -X GET https://api.ke3p.com/api/domains/DOMAIN_ID/board-data \
  -H "Authorization: Bearer YOUR_TOKEN" \
  | jq
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "domain": {
      "id": "...",
      "name": "...",
      "slug": "...",
      "description": "...",
      "status": "active",
      "theme": { ... }
    },
    "keepers": [ ... ],
    "journeys": [ ... ],
    "boards": [ ... ],
    "members": [ /* limited to 5 */ ],
    "verification": { ... },
    "viewerPermissions": {
      "isOwner": false,
      "isAdmin": false,
      "canEdit": false,
      "role": "viewer"
    },
    "actions": [
      {
        "id": "domain.public.contact",
        "name": "Contact Domain",
        "visibility": "public"
      }
    ]
    // NO dns, ssl, keys, primaryAgent
  }
}
```

### 2. Admin View
```bash
curl -X GET https://api.ke3p.com/api/domains/DOMAIN_ID/board-data \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  | jq
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "domain": { ... },
    "keepers": [ ... ],
    "journeys": [ ... ],
    "boards": [ ... ],
    "members": [ /* all members */ ],
    "verification": { ... },
    "viewerPermissions": {
      "isOwner": true,
      "isAdmin": true,
      "canEdit": true,
      "role": "owner"
    },
    "actions": [
      /* all 6 actions: public + admin */
    ],
    // ADMIN-ONLY DATA:
    "dns": {
      "configured": true,
      "verified": true,
      "nameservers": [...],
      "records": [...]
    },
    "ssl": {
      "issued": true,
      "pending": false
    },
    "customDomains": [...],
    "keys": {
      "openai": {
        "configured": true,
        "status": "active"
      },
      "anthropic": {
        "configured": false,
        "status": "missing"
      }
    },
    "primaryAgent": {
      "id": "...",
      "name": "...",
      "slug": "...",
      "agentClass": "..."
    }
  }
}
```

### 3. Non-Existent Domain
```bash
curl -X GET https://api.ke3p.com/api/domains/00000000-0000-0000-0000-000000000000/board-data \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected:**
```json
{
  "success": false,
  "error": "Domain not found"
}
```

### 4. Unauthenticated Request
```bash
curl -X GET https://api.ke3p.com/api/domains/DOMAIN_ID/board-data
```

**Expected:**
```json
{
  "success": false,
  "error": "Authentication required"
}
```

## Data Mapping to Frames

### Frame A: Hero / Identity (Public)
- `domain.name`
- `domain.description`
- `domain.status`
- `domain.theme.coverImage`

### Frame B: Activity / Assets (Public)
- `keepers[]` - List of keepers in domain
- `journeys[]` - List of journeys in domain
- `boards[]` - List of boards in domain

### Frame C: People / Membership (Public)
- `members[]` - Domain members (limited to 5 for public)
- `verification.badge` - Verification status

### Frame D: Domain Operations (Admin Only)
- `dns.*` - DNS configuration and verification
- `ssl.*` - SSL certificate status
- `customDomains[]` - Custom domain list

### Frame E: Keys / Integrations (Admin Only)
- `keys.openai` - OpenAI API key status
- `keys.anthropic` - Anthropic API key status
- `primaryAgent` - Primary AI agent for domain

## Quick Test with Local Domain

```bash
# Get your domain ID
curl -X GET https://api.ke3p.com/api/domains/my \
  -H "Authorization: Bearer YOUR_TOKEN" \
  | jq '.id'

# Use that ID to test board-data
curl -X GET https://api.ke3p.com/api/domains/YOUR_DOMAIN_ID/board-data \
  -H "Authorization: Bearer YOUR_TOKEN" \
  | jq '.data | keys'
```

**Should see:**
```
[
  "actions",
  "boards",
  "dns",         // if admin
  "domain",
  "journeys",
  "keepers",
  "keys",        // if admin
  "members",
  "primaryAgent", // if admin & configured
  "ssl",         // if admin
  "verification",
  "viewerPermissions"
]
```

