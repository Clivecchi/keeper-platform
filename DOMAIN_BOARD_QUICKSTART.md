# Domain Design Board - Quick Start Guide

**Ready to test your MVP!** Everything is implemented. Here's how to get started.

---

## 🚀 Getting Started

### **1. Seed the Database**

```bash
cd packages/database
pnpm run seed
```

This creates:
- ✅ Domain Design Board template (5 frames with props)
- ✅ 6 Engagement Templates (contact, update, verify, etc.)
- ✅ Links templates to Domain KeeperType

---

### **2. Start the Servers**

**Terminal 1 - API:**
```bash
cd apps/api
pnpm dev
```

**Terminal 2 - Web:**
```bash
cd apps/web
pnpm dev
```

---

### **3. Test the Public Landing**

**URL:** `http://localhost:3000/d/YOUR_DOMAIN_SLUG`

(Replace `YOUR_DOMAIN_SLUG` with an actual domain slug from your database)

**What you should see:**
- ✅ Hero frame (Cover Image, Title, Tagline, Contact Button)
- ✅ Activity frame (Heading, Gallery, Quote)
- ✅ People frame (Team Heading, Member Gallery, Note)
- ❌ Admin frames should NOT be visible

**Try clicking:**
- Contact button → Opens form modal
- Submit form → Shows success message

---

### **4. Test the Admin Dashboard**

**URL:** `http://localhost:3000/keeper/domain-dashboard?domainId=YOUR_DOMAIN_ID`

(Replace `YOUR_DOMAIN_ID` with an actual domain UUID)

**What you should see:**
- ✅ All 3 public frames from above
- ✅ Domain Operations frame (Update Form, Verify Button, DNS Status)
- ✅ Keys & Integrations frame (API Key Form, Agent Assignment, Agent Card)

**Try clicking:**
- "Update Domain" form button → Opens modal with current values
- Edit name → Submit → Should update domain
- "Verify Domain" button → Triggers verification

---

### **5. Browse Engagement Templates**

**URL:** `http://localhost:3000/keeper/engagement-templates`

**What you should see:**
- ✅ 6 real templates (not mock processes)
- ✅ Template cards with icons and badges
- ✅ Click to view details (fields, endpoint, metadata)

---

## 🧪 Testing Checklist

### **Backend:**
- [ ] `GET /api/domains/by-slug/:slug` returns domain
- [ ] `GET /api/domains/:id/board-data` returns hydrated board
- [ ] `GET /api/engagement/templates/:slug` returns template definition
- [ ] `POST /api/engagement/execute` executes template
- [ ] `POST /api/domains/:id/contact` accepts contact form

### **Public Landing:**
- [ ] Page loads without errors
- [ ] 3 frames render
- [ ] Props display live data (domain name, description, etc.)
- [ ] Contact button opens modal
- [ ] Contact form validates and submits

### **Admin Dashboard:**
- [ ] Page loads with authentication
- [ ] All 5 frames render
- [ ] Admin frames visible
- [ ] Update Domain form pre-fills with current values
- [ ] Form submission updates domain
- [ ] Board refreshes after action

### **Engagement Templates:**
- [ ] Page shows 6 templates (not mock data)
- [ ] Template cards display correctly
- [ ] Detail modal opens with full info
- [ ] No references to "Engagement Processes"

---

## 📂 Key Files to Know

### **Components:**
```
apps/web/src/components/
├── domain/
│   ├── DomainBoardRenderer.tsx    ← Fetches & renders board
│   └── PropRenderer.tsx           ← Renders individual props
└── engagement/
    ├── EngagementButton.tsx       ← Triggers templates
    └── EngagementModal.tsx        ← Dynamic form modal
```

### **Pages:**
```
apps/web/src/pages/
├── d/[slug].tsx                   ← Public landing
└── keeper/
    ├── DomainDashboardPage.tsx    ← Admin dashboard
    └── EngagementTemplatesPage.tsx ← Template browser
```

### **Backend:**
```
apps/api/src/api/domains/
├── routes.ts                      ← Domain CRUD + by-slug endpoint
└── board-data.ts                  ← Hydration endpoint

apps/api/src/api/engagement/
└── execute.ts                     ← Template execution

apps/api/src/services/
└── EngagementTemplateExecutor.ts  ← Executor logic
```

### **Database:**
```
packages/database/prisma/seeds/
├── design-boards.seed.ts          ← Board template definition
└── domain-engagement-templates.seed.ts ← Template definitions
```

---

## 🔍 Troubleshooting

### **"Domain not found" error:**
- Check that domain exists in database
- Verify slug is correct
- Run seed if domain doesn't exist

### **"Template not found" error:**
- Run database seed to create templates
- Check that templates are linked to Domain KeeperType

### **Board shows no frames:**
- Check browser console for API errors
- Verify `/api/domains/:id/board-data` returns frames
- Check that Domain KeeperType has defaultBoardTemplateId set

### **Admin frames not showing:**
- Check that user is authenticated
- Verify user has admin permission on domain
- Check userPermissions.role in board-data response

### **Engagement template doesn't execute:**
- Check browser console for errors
- Verify template slug matches database
- Check that user has permission (visibility: admin requires admin role)
- Verify target endpoint exists

---

## 🎯 What's Working

### **✅ Fully Implemented:**
- Domain Design Board persistence
- Hydration endpoint with live data
- Visibility filtering (public vs admin)
- Engagement template system (6 templates)
- Public landing page
- Admin dashboard
- Template browser
- Prop renderers (8 types)
- Engagement execution flow
- Form validation
- Success/error handling

### **⚠️ Known Limitations (MVP):**
- Using `alert()` instead of toast notifications
- No custom domain routing yet (requires DNS/middleware)
- No board refresh on engagement success (manual for now)
- Minimal styling (functional, not polished)
- No field option loading (agent dropdown, etc.)

---

## 📈 Next Steps After Testing

1. Replace alerts with toast notifications
2. Add custom domain routing
3. Implement automatic board refresh
4. Polish styling
5. Add more engagement templates
6. Integrate with Board Studio for editing
7. Add analytics/tracking

---

## 💬 Quick Reference: API Endpoints

```
# Public routes (no auth required)
GET  /api/domains/by-slug/:slug              # Resolve slug to domain
GET  /api/domains/:id/board-data             # Get hydrated board (public frames only)

# Authenticated routes
GET  /api/domains/my                         # List user's domains
GET  /api/domains/:id/board-data             # Get hydrated board (all frames if admin)
GET  /api/engagement/templates/:slug         # Get template definition
GET  /api/engagement/templates/type/:name    # Get templates for KeeperType
POST /api/engagement/execute                 # Execute engagement template

# Domain operations (called by templates)
POST  /api/domains/:id/contact               # Contact form
PATCH /api/domains/:id                       # Update domain
POST  /api/domains/:id/custom-domain/verify  # Verify DNS
POST  /api/kip/user-keys                     # Save API key
```

---

## 🎉 You're Ready!

**Everything is built and ready to test.** Follow the steps above to see your Domain Design Board in action.

**The board IS the product surface.** Public visitors get a landing page. Admins get a dashboard. One system, two experiences.

**This is MVP-complete.** 🚀

