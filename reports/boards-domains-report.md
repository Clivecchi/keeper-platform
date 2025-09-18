# Boards & Domains Diagnostics Report

Mounted Route Order

- /api/domains -> flatDomainsRouter (apps\api\src\api\domains.js)
- /api/domains -> domainRoutes (apps\api\src\api\domains\routes.js)
- /api/admin/domains -> adminDomainRoutes (apps\api\src\api\admin\domains.js)
- /api/admin/roles -> adminRolesRoutes (apps\api\src\api\admin\roles.js)
- /api/admin/users -> adminUsersRoutes (apps\api\src\api\admin\users.js)
- /api/admin -> adminDiagnostics (apps\api\src\api\admin\diagnostics.js)
- /api/admin -> adminRepair (apps\api\src\api\admin\repair.js)
- /api/admin -> adminInspect (apps\api\src\api\admin\inspect.js)
- /api/admin -> adminRouter (apps\api\src\api\admin.js)
- /api/admin/query -> adminQueryRouter (apps\api\src\api\admin\query.js)
- /api/keeper -> keeperRoutes (apps\api\src\api\keeper\routes.js)
- /api/boards -> boardRoutes (apps\api\src\routes\boards.js)
- /api/frames -> frameRoutes (apps\api\src\routes\frames.js)
- /api/board-data -> kamOrUserAuth (apps\api\src\middleware\auth-combined.js)
- /api/board-data -> kamOrUserAuth (apps\api\src\middleware\auth-combined.js)
- /api/board-data -> newBoardRoutesDefault (apps\api\src\api\boards.js)
- /api/board-templates -> boardTemplatesRouter
- /api/board-data -> boardStudioAliasRouter
- /api/entities -> entitiesRoutes (apps\api\src\api\entities\routes.js)
- /api/uploads -> uploadsRoutes (apps\api\src\api\uploads\routes.js)
- /api/agents -> agentsRoutes (apps\api\src\api\agents.js)
- /api/journeys -> journeysRoutes (apps\api\src\api\journeys.js)
- /api/keeper-types -> keeperTypesRoutes (apps\api\src\api\keeper-types.js)
- /api/people -> peopleRoutes (apps\api\src\api\people.js)
- /kam -> kamRouter (apps\api\src\kam\routes.js)
- /api/kip/agents -> kipAgentsHandler (apps\api\src\api\kip\agents.js)
- /api/kip/platform-keys -> kipPlatformKeysRouter (apps\api\src\api\kip\platform-keys.js)
- /api/debug -> debugRouter (apps\api\src\api\debug.js)
- / -> healthRouter (apps\api\src\health.js)
- * -> (req: Request

Endpoint: GET /api/domains/my
  - Handler #1: apps\api\src\api\domains\routes.ts (mounted via /api/domains -> flatDomainsRouter)
    - Auth: yes; Perms: n/a; Errors: 401, 500
    - Reads domain context: none
  - Handler #2: apps\api\src\api\domains\routes.ts (mounted via /api/domains -> domainRoutes)
    - Auth: yes; Perms: n/a; Errors: 401, 500
    - Reads domain context: none
  - Handler #3: apps\api\src\api\domains\routes.ts (mounted via /api/domains -> domainRoutes)
    - Auth: yes; Perms: n/a; Errors: 401, 500
    - Reads domain context: none
  - Handler #4: apps\api\src\api\domains\routes.ts (mounted via / -> healthRouter)
    - Auth: yes; Perms: n/a; Errors: 401, 500
    - Reads domain context: none

Endpoint: GET /api/domains/:id/management-board
  - Handler #1: apps\api\src\api\domains\routes.ts (mounted via /api/domains -> flatDomainsRouter)
    - Auth: yes; Perms: n/a; Errors: 401, 403
    - Reads domain context: none
  - Handler #2: apps\api\src\api\domains.management.ts (mounted via /api/domains -> flatDomainsRouter)
    - Auth: yes; Perms: n/a; Errors: 404
    - Reads domain context: none
  - Handler #3: apps\api\src\api\domains\routes.ts (mounted via /api/domains -> domainRoutes)
    - Auth: yes; Perms: n/a; Errors: 401, 403
    - Reads domain context: none
  - Handler #4: apps\api\src\api\domains\routes.ts (mounted via /api/domains -> domainRoutes)
    - Auth: yes; Perms: n/a; Errors: 401, 403
    - Reads domain context: none
  - Handler #5: apps\api\src\api\domains.management.ts (mounted via /api/domains -> domainRoutes)
    - Auth: yes; Perms: n/a; Errors: 404
    - Reads domain context: none
  - Handler #6: apps\api\src\api\domains\routes.ts (mounted via / -> healthRouter)
    - Auth: yes; Perms: n/a; Errors: 401, 403
    - Reads domain context: none
  - Handler #7: apps\api\src\api\domains.management.ts (mounted via / -> healthRouter)
    - Auth: yes; Perms: n/a; Errors: 404
    - Reads domain context: none

Endpoint: GET /api/board-data/:id
  - No handler found in scanned files.
Domain Context Read vs Set

- Setter: apps/api/src/middleware/domainResolutionMiddleware.ts (sets req.domainContext = { domain, isCustomDomain, originalHostname, resolvedSlug })
- Readers observed:

Board Data Loader include/relations

- apps/api/src/api/boards.ts uses include: { frames: { orderBy, include: { FrameConfig: true } } }

Prisma model cross-check (Board, FrameInstance, Domain)

--- Board ---
model Board {
  id          String          @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  keeperId    String
  name        String
  slug        String
  description String?
  icon        String?
  theme       Json            @default("{}")
  behavior    Json            @default("{}")
  data        Json            @default("{}")
  access      Json            @default("{}")
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @default(now()) @updatedAt
  frames      FrameInstance[]

  // BEGIN: Phase-0 addition - agent relation
  agentId     String?         @db.Uuid
  kip_agents  kip_agents?     @relation(fields: [agentId], references: [id])
  // END: Phase-0 addition

  // Domain-scoped fields
  domainId    String?
  /**
   * Logical type of board used for uniqueness within a scope.
   * Examples: 'agent-home', 'domain-home', 'journey-home'
   */
  boardType   String?

  @@unique([keeperId, slug])
  @@index([keeperId])
  @@index([agentId])
  @@index([domainId])
  @@unique([domainId, boardType])
}

--- FrameInstance ---
model FrameInstance {
  id               String      @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  entityType       String
  entityId         String
  configId         String      @db.Uuid
  currentContentId String?     @unique @db.Uuid
  boardId          String?     @db.Uuid
  role             String?
  name             String      @default("Untitled Frame")
  pattern          String      @default("dialogic")
  frameType        String      @default("media_card")
  orderIndex       Int         @default(0)
  layoutKind       String      @default("canvas")
  layoutData       Json        @default("{}")
  props            Json        @default("{}")
  createdAt        DateTime    @default(now())
  updatedAt        DateTime    @default(now()) @updatedAt
  Board            Board?      @relation(fields: [boardId], references: [id])
  FrameConfig      FrameConfig @relation(fields: [configId], references: [id])

  @@index([boardId])
  @@index([entityType, entityId])
}

--- Domain ---
model Domain {
  id                                                       String                     @id @default(uuid())
  name                                                     String                     @unique
  slug                                                     String                     @unique
  slugHistory                                              String[]                   @default([])
  customDomain                                             String?                    @unique
  customDomainVerified                                     Boolean                    @default(false)
  verificationToken                                        String?                    @unique
  verificationMethod                                       String?
  verifiedAt                                               DateTime?
  status                                                   String                     @default("active")
  suspendedAt                                              DateTime?
  suspendedBy                                              String?
  suspensionReason                                         String?
  features                                                 Json?                      @default("{}")
  limits                                                   Json?                      @default("{}")
  subscription                                             String?
  isPublic                                                 Boolean                    @default(false)
  description                                              String?
  allowRequests                                            Boolean                    @default(false)
  categories                                               String[]                   @default([])
  ownerId                                                  String
  isActive                                                 Boolean                    @default(true)
  createdAt                                                DateTime                   @default(now())
  updatedAt                                                DateTime                   @updatedAt
  deletedAt                                                DateTime?
  theme                                                    Json?                      @default("{}")
  settings                                                 Json?                      @default("{}")
  CollaborationActivity                                    CollaborationActivity[]
  CrossDomainCollaboration                                 CrossDomainCollaboration[]
  CrossDomainShare_CrossDomainShare_sourceDomainIdToDomain CrossDomainShare[]         @relation("CrossDomainShare_sourceDomainIdToDomain")
  CrossDomainShare_CrossDomainShare_targetDomainIdToDomain CrossDomainShare[]         @relation("CrossDomainShare_targetDomainIdToDomain")
  users                                                    users                      @relation(fields: [ownerId], references: [id])
  DomainInvitation                                         DomainInvitation[]
  DomainPermission                                         DomainPermission[]
  DomainTransfer                                           DomainTransfer[]
  DomainUsage                                              DomainUsage[]
  journeys                                                 Journey[]
  keepers                                                  Keeper[]
  moments                                                  Moment[]
  ShareRequest_ShareRequest_sourceDomainIdToDomain         ShareRequest[]             @relation("ShareRequest_sourceDomainIdToDomain")
  ShareRequest_ShareRequest_targetDomainIdToDomain         ShareRequest[]             @relation("ShareRequest_targetDomainIdToDomain")
  ShareTemplate                                            ShareTemplate[]
  ShareWorkflow                                            ShareWorkflow[]
  SoleMemoryScope                                          SoleMemoryScope?
  SslCertificate                                           SslCertificate[]

  @@index([slug])
  @@index([customDomain])
  @@index([ownerId])
  @@index([status])
  @@index([isActive])
  @@index([isPublic])
}

Schema vs DB (optional)

- PARTIAL (code-only): DATABASE_URL not set; skipped DB checks.
Top 3 Risk Findings

- Duplicate handlers for /api/domains/:id/management-board detected (multiple routers). Mount order determines which wins.
