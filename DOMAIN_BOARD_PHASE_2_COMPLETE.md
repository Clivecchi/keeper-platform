# Domain Design Board - Phase 2 Complete ✅

**Date:** November 1, 2025  
**Phase:** API Endpoint Implementation  
**Status:** Complete and Ready for Testing

---

## ✅ What Was Accomplished

### **API Endpoint Created**
**File:** `apps/api/src/api/domains/board-data.ts`  
**Route:** `GET /api/domains/:id/board-data`  
**Lines of Code:** 372

### **Route Registered**
**File:** `apps/api/src/index.ts`  
- Imported board-data router
- Mounted at `/api/domains` before other domain routes

---

## 📊 Endpoint Capabilities

### **Authentication & Authorization**
- ✅ Requires valid bearer token
- ✅ Checks domain ownership (`ownerId`)
- ✅ Checks domain permissions (`DomainPermission`)
- ✅ Determines admin status (owner OR admin role)

### **Data Fetching**
- ✅ Single query with optimized includes
- ✅ Aggregates data from multiple tables:
  - `Domain` - Core domain info
  - `DomainPermission` - Members with user data
  - `Keeper` - Keepers in domain
  - `Journey` - Journeys in domain
  - `Board` - Boards in domain
  - `kip_user_keys` - API key status (admin only)
  - `kip_agents` - Primary agent (admin only)

### **Permission-Based Filtering**
- ✅ Public view: Limited members (5 max), no admin data
- ✅ Admin view: All members, DNS, SSL, keys, agent data
- ✅ Actions filtered by permission level

---

## 🎯 Data Provided for Each Frame

### **Frame A: Hero / Identity** (Always)
```typescript
domain: {
  id: string;
  name: string;
  slug: string;
  description: string;
  status: 'active' | 'suspended';
  createdAt: Date;
  theme: {
    coverImage: string | null;
    primaryColor: string;
  };
}
```

### **Frame B: Activity / Assets** (Always)
```typescript
keepers: Array<{
  id: string;
  title: string;
  purpose: string;
  theme: { coverImage: null };
  journeyCount: number;
  keeperType: string;
  createdAt: Date;
}>;

journeys: Array<{
  id: string;
  name: string;
  forward: string;
  keeper: { id, title };
  createdAt: Date;
}>;

boards: Array<{
  id: string;
  name: string;
  slug: string;
  description: string;
}>;
```

### **Frame C: People / Membership** (Always)
```typescript
members: Array<{
  id: string;
  role: 'owner' | 'admin' | 'member' | 'guest';
  permissions: string[];
  grantedAt: Date;
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
  };
}>;
// Limited to 5 for public, all for admin

verification: {
  badge: string | null; // "Verified domain of..."
};
```

### **Frame D: Domain Operations** (Admin Only)
```typescript
dns: {
  configured: boolean;
  verified: boolean;
  nameservers: string[];
  records: Array<{
    type: string;
    name: string;
    value: string;
    status: string;
  }>;
};

ssl: {
  issued: boolean;
  pending: boolean;
  expiresAt: Date | null;
};

customDomains: Array<{
  domain: string;
  verified: boolean;
  status: 'verified' | 'pending';
  verificationMethod: string;
}>;
```

### **Frame E: Keys / Integrations** (Admin Only)
```typescript
keys: {
  openai: {
    configured: boolean;
    status: 'active' | 'fallback' | 'missing';
    lastUsed: Date | null;
  };
  anthropic: {
    configured: boolean;
    status: 'active' | 'fallback' | 'missing';
    lastUsed: Date | null;
  };
};

primaryAgent?: {
  id: string;
  name: string;
  slug: string;
  agentClass: string;
};
```

### **Viewer Permissions** (Always)
```typescript
viewerPermissions: {
  isOwner: boolean;
  isAdmin: boolean;
  canEdit: boolean;
  role: 'owner' | 'admin' | 'member' | 'guest' | 'viewer';
}
```

### **Available Actions** (Filtered)
```typescript
actions: Array<{
  id: string; // e.g. 'domain.public.contact'
  name: string;
  visibility: 'public' | 'admin';
  availableInFrame: string;
}>;
// Public: 1 action
// Admin: 6 actions
```

---

## 🔒 Security Features

### **Authentication**
- ✅ Bearer token required
- ✅ Returns 401 if not authenticated

### **Authorization**
- ✅ Permission checks before data fetch
- ✅ Admin-only data filtered based on role
- ✅ Member list limited for non-admins

### **Data Privacy**
- ✅ DNS details only visible to admins
- ✅ API key info only visible to admins
- ✅ Agent assignments only visible to admins
- ✅ Full member list only visible to admins

---

## 🧪 Testing Guide

### **Test File Created**
`apps/api/test-domain-board-data.md`

Contains:
- ✅ cURL commands for all test cases
- ✅ Expected responses for public vs admin
- ✅ Error case examples
- ✅ Data mapping to frames

### **Quick Test**
```bash
# Get your domain ID
curl https://api.ke3p.com/api/domains/my \
  -H "Authorization: Bearer YOUR_TOKEN" | jq '.id'

# Test board-data endpoint
curl https://api.ke3p.com/api/domains/DOMAIN_ID/board-data \
  -H "Authorization: Bearer YOUR_TOKEN" | jq
```

---

## 📋 Implementation Details

### **Query Optimization**
- Single Prisma query with nested includes
- Limited to 20 keepers, 20 journeys, 10 boards
- Ordered by creation date (most recent first)
- Only fetches non-template boards

### **Helper Functions**
1. **`getAvailableActions(isAdmin)`**
   - Returns filtered action list
   - Public: 1 action
   - Admin: 6 actions

2. **`getKeyStatus(userKeys, provider)`**
   - Determines API key status
   - Returns: 'active', 'fallback', or 'missing'

### **Error Handling**
- ✅ 401 for unauthenticated requests
- ✅ 404 for non-existent domains
- ✅ 500 for server errors with message
- ✅ All responses have `success` boolean

---

## 🔄 Integration Points

### **Frontend Integration**
When building the Domain Design Board UI:

```typescript
// Fetch board data
const response = await fetch(`/api/domains/${domainId}/board-data`, {
  headers: { Authorization: `Bearer ${token}` }
});

const { data } = await response.json();

// Check permissions
if (data.viewerPermissions.isAdmin) {
  // Show all 5 frames
  showAdminFrames();
} else {
  // Show only public frames (0-2)
  showPublicFrames();
}

// Render frames with data
renderHeroFrame(data.domain);
renderActivityFrame(data.keepers, data.journeys);
renderPeopleFrame(data.members);

if (data.viewerPermissions.isAdmin) {
  renderOperationsFrame(data.dns, data.ssl);
  renderKeysFrame(data.keys, data.primaryAgent);
}
```

---

## 🚀 Next Steps

### **Phase 3: Engagement Templates** (Next)
Define and implement the 6 engagement template actions:

1. `domain.public.contact` - Contact form
2. `domain.admin.update` - Update domain info
3. `domain.admin.verify` - Verify DNS/SSL
4. `domain.admin.addCustomDomain` - Add custom domain
5. `domain.admin.editApiKey` - Manage API keys
6. `domain.admin.assignAgent` - Assign primary agent

### **Phase 4: Frame Visibility**
Implement frontend logic to:
- Detect viewer permissions
- Show/hide frames based on `isAdmin`
- Filter frame content

### **Phase 5: Prop Components**
Build the 11 prop components to render frame content.

---

## 📊 Metrics

### **Code Added**
- **New File:** `apps/api/src/api/domains/board-data.ts` (372 lines)
- **Modified:** `apps/api/src/index.ts` (2 lines)
- **Test Doc:** `apps/api/test-domain-board-data.md`

### **Database Queries**
- **Main Query:** 1 optimized query with includes
- **Admin Queries:** +2 for keys and agents (admin only)
- **Total:** 1-3 queries depending on permissions

### **API Response Size**
- **Public View:** ~2-5 KB (limited data)
- **Admin View:** ~5-15 KB (full data)

---

## ✅ Phase 2 Completion Checklist

- [x] API endpoint created
- [x] Route registered in main API file
- [x] Authentication implemented
- [x] Authorization with permission checks
- [x] Data fetching optimized
- [x] Admin-only data filtering
- [x] Public data limiting (members to 5)
- [x] DNS/SSL info for admin
- [x] API keys status for admin
- [x] Primary agent lookup for admin
- [x] Engagement templates list
- [x] Viewer permissions included
- [x] Error handling implemented
- [x] Test documentation created

---

## 🎯 Success Criteria Met

✅ **Single Endpoint** - One API call provides all frame data  
✅ **Permission-Based** - Data filtered by viewer role  
✅ **Optimized** - Efficient queries with includes  
✅ **Secure** - Admin-only data properly protected  
✅ **Complete** - All 5 frames have their data sources  
✅ **Documented** - Testing guide provided  
✅ **Integrated** - Route registered in main API  

---

**Status:** ✅ Phase 2 Complete  
**Ready For:** Phase 3 - Engagement Templates  
**API Endpoint:** Live and ready for testing

