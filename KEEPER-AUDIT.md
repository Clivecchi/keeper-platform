# Keeper Platform Audit (2026-02-05)

This document captures a technical snapshot of the Keeper platform for a 2-week launch assessment.

---

# 1. DATABASE SCHEMA

Complete `packages/database/prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model ContextualContainerConfig {
  id           String   @id @db.Uuid
  name         String   @unique
  description  String?
  defaultMode  String
  allowedModes String[]
  permissions  Json?
  createdAt    DateTime @default(now())
  updatedAt    DateTime
}

model InteractionContentConfig {
  id          String   @id @db.Uuid
  name        String   @unique
  description String?
  contentMode String?
  components  Json[]
  permissions Json?
  config      Json
  createdBy   String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime
}

model Journey {
  id        String   @id
  name      String
  forward   String
  ownerId   String
  createdAt DateTime @default(now())
  updatedAt DateTime
  keeperId  String
  theme_id  String?  @db.Uuid
  domainId  String?
  domain    Domain?  @relation(fields: [domainId], references: [id])
  Keeper    Keeper   @relation(fields: [keeperId], references: [id])
  themes    themes?  @relation(fields: [theme_id], references: [id])
  Moment    Moment[]
  Path      Path[]

  @@index([domainId])
}

model Keeper {
  id                   String                 @id
  title                String
  purpose              String
  keeperTypeId         String?
  ownerId              String
  theme_id             String?                @db.Uuid
  createdAt            DateTime               @default(now())
  keeperType           String?
  memoryPattern        String?
  updatedAt            DateTime               @updatedAt
  sole                 Json?
  soleDraft            Json?
  soleSubmittedAt      DateTime?
  domainId             String?
  Journey              Journey[]
  domain               Domain?                @relation(fields: [domainId], references: [id])
  KeeperType           KeeperType?            @relation(fields: [keeperTypeId], references: [id])
  themes               themes?                @relation(fields: [theme_id], references: [id])
  Path                 Path[]
  SoleEcho             SoleEcho[]
  SoleLogbookEntry     SoleLogbookEntry[]
  SoleMemoryCard       SoleMemoryCard[]
  SoleReflection       SoleReflection[]
  SoleVoiceEntry       SoleVoiceEntry[]
  engagement_templates engagement_templates[]

  @@index([domainId])
}

model KeeperMapping {
  id                 String     @id
  memoryCardId       String
  keeperId           String?
  journeyId          String?
  pathId             String?
  suggestedType      String
  suggestionStrength Float?     @default(0)
  status             String
  createdAt          DateTime   @default(now())
  MemoryCard         MemoryCard @relation(fields: [memoryCardId], references: [id])
}

model KeeperRecord {
  id            String     @id @default(uuid())
  
  // which KeeperType this record is an instance of
  typeId        String
  type          KeeperType @relation(fields: [typeId], references: [id])
  
  // optional per-record board override
  customBoardId String?    @db.Uuid
  customBoard   Board?     @relation("CustomBoard", fields: [customBoardId], references: [id])
  
  // actual data for the record (JSON blob for flexibility)
  data          Json       @default("{}")
  
  createdAt     DateTime   @default(now())
  updatedAt     DateTime   @updatedAt
  
  @@index([typeId])
  @@index([customBoardId])
}

model KeeperType {
  id                               String                             @id
  name                             String
  createdAt                        DateTime                           @default(now())
  memoryPattern                    String?
  system                           Boolean                            @default(false)
  
  // Design Board Template System
  defaultBoardTemplateId           String?                            @db.Uuid
  defaultBoardTemplate             Board?                             @relation("DefaultBoardTemplate", fields: [defaultBoardTemplateId], references: [id])
  
  Keeper                           Keeper[]
  KeeperRecord                     KeeperRecord[]
  keeper_type_engagement_templates keeper_type_engagement_templates[]
  kip_agent_keeper_types           kip_agent_keeper_types[]
}

model FrameConfig {
  id            String          @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  name          String
  description   String?
  theme         Json?
  createdAt     DateTime        @default(now())
  updatedAt     DateTime        @default(now())
  FrameInstance FrameInstance[]
}

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
  config      Json            @default("{}")
  access      Json            @default("{}")
  tags        Json            @default("[]")
  viewerMode  String?         @default("public")
  isPublic    Boolean         @default(false)
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @default(now()) @updatedAt
  frames      FrameInstance[]

  // BEGIN: Phase-0 addition - agent relation
  agentId     String?         @db.Uuid
  kip_agents  kip_agents?     @relation(fields: [agentId], references: [id])
  // END: Phase-0 addition

  // Domain-scoped fields
  domainId    String?
  domain      Domain?         @relation(fields: [domainId], references: [id], onDelete: SetNull)
  /**
   * Logical type of board used for uniqueness within a scope.
   * Examples: 'agent-home', 'domain-home', 'journey-home'
   */
  boardType   String?

  // Design Board Template System
  isTemplate  Boolean         @default(false)
  KeeperType  KeeperType[]    @relation("DefaultBoardTemplate")
  KeeperRecord KeeperRecord[] @relation("CustomBoard")

  @@unique([keeperId, slug])
  @@index([keeperId])
  @@index([agentId])
  @@index([domainId])
  @@index([isTemplate])
  @@unique([domainId, boardType])
}

// Phase 11: Agent-scoped entities
model Topic {
  id        String   @id @default(uuid())
  agentId   String
  boardId   String?
  title     String
  status    String   @default("active")
  data      Json?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([agentId])
  @@index([boardId])
}

model Draft {
  id        String   @id @default(uuid())
  agentId   String
  topicId   String?
  title     String
  status    String   @default("draft")
  data      Json?
  history   Json?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([agentId])
  @@index([topicId])
}

model Task {
  id        String   @id @default(uuid())
  agentId   String
  topicId   String?
  draftId   String?
  title     String
  status    String   @default("open")
  dueAt     DateTime?
  data      Json?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([agentId])
  @@index([topicId])
  @@index([draftId])
}

model Activity {
  id        String   @id @default(uuid())
  agentId   String
  topicId   String?
  type      String
  data      Json?
  createdAt DateTime @default(now())

  @@index([agentId])
  @@index([topicId])
}

model MemoryCard {
  id             String          @id
  threadBlobId   String
  type           String
  title          String
  content        String
  tags           String[]
  timestamp      DateTime
  status         String
  suggestionType String?
  KeeperMapping  KeeperMapping[]
  ThreadBlob     ThreadBlob      @relation(fields: [threadBlobId], references: [id])
}

model Moment {
  id        String   @id @default(cuid())
  title     String
  narrative String
  pathId    String?  
  journeyId String? 
  ownerId   String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  theme_id  String?  @db.Uuid
  domainId  String?
  keptAt    DateTime?
  anonKey   String?
  claimToken String?
  claimTokenExpiresAt DateTime?
  domain    Domain?  @relation(fields: [domainId], references: [id])
  Journey   Journey? @relation(fields: [journeyId], references: [id])
  Path      Path?    @relation(fields: [pathId], references: [id])
  themes    themes?  @relation(fields: [theme_id], references: [id])


  @@index([pathId])
  @@index([journeyId])
  @@index([domainId])
}

model Path {
  id        String  @id
  name      String
  prelude   String
  ownerId   String
  journeyId String
  keeperId  String
  theme_id  String? @db.Uuid
  Moment    Moment[]
  Journey   Journey @relation(fields: [journeyId], references: [id])
  Keeper    Keeper  @relation(fields: [keeperId], references: [id])
  themes    themes? @relation(fields: [theme_id], references: [id])
}

model PlatformStorageConfig {
  id          String   @id
  provider    String   @unique
  isEnabled   Boolean  @default(true)
  displayName String
  description String?
  configJson  Json?
  isDefault   Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime
}

model StudioModule {
  id           String   @id @db.Uuid
  name         String
  slug         String   @unique
  description  String?
  icon         String?
  moduleType   String
  config       Json
  linkedMenuId String?
  isPublic     Boolean  @default(false)
  createdBy    String   @db.Uuid
  createdAt    DateTime @default(now())
  updatedAt    DateTime
}

model ThreadBlob {
  id          String       @id
  userId      String
  assistantId String
  title       String
  topicTag    String?
  messages    Json
  capturedAt  DateTime     @default(now())
  source      String
  MemoryCard  MemoryCard[]
}

model UserApiCredential {
  id        String   @id
  userId    String
  provider  String
  apiKey    String
  scopes    String[] @default([])
  createdAt DateTime @default(now())
  updatedAt DateTime
  users     users    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}

model UserSettings {
  id                 String   @id
  userId             String   @unique
  themeMode          String?
  respectSystemTheme Boolean? @default(true)
  createdAt          DateTime @default(now())
  updatedAt          DateTime
  preferred_theme_id String   @default("4b5cf27f-06b1-4aed-95a4-fbfdb610dfc8")
  users              users    @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model UserStorageConfig {
  id         String   @id
  userId     String   @unique
  provider   String
  configJson Json?
  isActive   Boolean  @default(true)
  createdAt  DateTime @default(now())
  updatedAt  DateTime
  users      users    @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model content_permissions {
  id             String       @id @db.Uuid
  entityTypeId   String       @db.Uuid
  entityId       String       @db.Uuid
  userId         String?      @db.Uuid
  roleId         String?      @db.Uuid
  permissionType String
  grantedBy      String?      @db.Uuid
  createdAt      DateTime     @default(now())
  updatedAt      DateTime
  entity_types   entity_types @relation(fields: [entityTypeId], references: [id])
  roles          roles?       @relation(fields: [roleId], references: [id], onDelete: Cascade)
}

model engagement_fields {
  id                   String               @id @db.Uuid
  templateId           String               @db.Uuid
  label                String
  type                 String
  name                 String
  placeholder          String?
  config               Json?
  order                Int                  @default(0)
  createdAt            DateTime             @default(now()) @db.Timestamptz(6)
  engagement_templates engagement_templates @relation(fields: [templateId], references: [id], onDelete: Cascade)
}

model engagement_styles {
  id                   String               @id @db.Uuid
  templateId           String               @db.Uuid
  variant              String
  style                Json?
  createdAt            DateTime             @default(now()) @db.Timestamptz(6)
  engagement_templates engagement_templates @relation(fields: [templateId], references: [id], onDelete: Cascade)
}

model engagement_templates {
  id                               String                             @id @db.Uuid
  label                            String
  slug                             String                             @unique
  type                             String
  targetType                       String
  icon                             String?
  style                            Json?
  config                           Json?
  createdAt                        DateTime                           @default(now()) @db.Timestamptz(6)
  updatedAt                        DateTime                           @db.Timestamptz(6)
  keeperId                         String?
  system                           Boolean                            @default(false)
  engagement_fields                engagement_fields[]
  engagement_styles                engagement_styles[]
  Keeper                           Keeper?                            @relation(fields: [keeperId], references: [id])
  keeper_type_engagement_templates keeper_type_engagement_templates[]
}

model engagements {
  id         String   @id @db.Uuid
  type       String
  content    String?
  userId     String?  @db.Uuid
  targetId   String   @db.Uuid
  targetType String
  createdAt  DateTime @default(now()) @db.Timestamptz(6)
}

model entity_types {
  id                  String                @id @db.Uuid
  name                String                @unique
  description         String?
  createdAt           DateTime              @default(now())
  updatedAt           DateTime
  content_permissions content_permissions[]
}

model field_definitions {
  id         String    @id @db.Uuid
  name       String
  label      String?
  type       String
  config     Json?
  isRequired Boolean?  @default(false)
  createdAt  DateTime? @default(now()) @db.Timestamptz(6)
}

model keeper_activity_log {
  id        String    @id @db.Uuid
  keeperId  String
  userId    String?   @db.Uuid
  action    String
  metadata  Json?
  createdAt DateTime? @default(now()) @db.Timestamptz(6)
}

model keeper_journeys {
  id        String    @id @db.Uuid
  keeperId  String
  journeyId String
  snapshot  Json?
  createdAt DateTime? @default(now()) @db.Timestamptz(6)
}

model keeper_revisions {
  id        String    @id @db.Uuid
  keeperId  String
  data      Json
  note      String?
  createdAt DateTime? @default(now()) @db.Timestamptz(6)
}

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
  visibility       String      @default("admin")
  createdAt        DateTime    @default(now())
  updatedAt        DateTime    @default(now()) @updatedAt
  Board            Board?      @relation(fields: [boardId], references: [id])
  FrameConfig      FrameConfig @relation(fields: [configId], references: [id])

  @@index([boardId])
  @@index([entityType, entityId])
  @@index([visibility])
}

model note_tags {
  noteId    String   @db.Uuid
  tagId     String   @db.Uuid
  createdAt DateTime @default(now())
  notes     notes    @relation(fields: [noteId], references: [id], onDelete: Cascade)
  tags      tags     @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@id([noteId, tagId])
}

model notes {
  id        String      @id @db.Uuid
  title     String
  content   String
  userId    String      @db.Uuid
  createdAt DateTime    @default(now())
  updatedAt DateTime
  note_tags note_tags[]
}

model roles {
  id                  String                @id @db.Uuid
  name                String                @unique
  description         String?
  createdAt           DateTime              @default(now())
  updatedAt           DateTime
  content_permissions content_permissions[]
  user_roles          user_roles[]
}

model shared_content {
  id          String    @id @db.Uuid
  contentType String
  contentId   String    @db.Uuid
  urlSlug     String    @unique
  visibility  String?   @default("public")
  viewCount   Int?      @default(0)
  theme       Json?
  meta        Json?
  createdAt   DateTime? @default(now()) @db.Timestamptz(6)
  updatedAt   DateTime? @db.Timestamptz(6)
}

model tags {
  id        String      @id @db.Uuid
  userId    String      @db.Uuid
  name      String
  color     String      @default("#3498db")
  createdAt DateTime    @default(now())
  note_tags note_tags[]

  @@unique([userId, name])
}

model themes {
  id           String    @id @db.Uuid
  label        String
  slug         String    @unique
  palette      Json
  style        Json?
  source_image String?
  inspired_by  String?
  default_mode String    @default("light")
  tags         Json?
  created_at   DateTime  @default(now()) @db.Timestamptz(6)
  updated_at   DateTime  @db.Timestamptz(6)
  Journey      Journey[]
  Keeper       Keeper[]
  Moment       Moment[]
  Path         Path[]
}

model user_roles {
  id         String   @id @db.Uuid
  userId     String
  roleId     String   @db.Uuid
  assignedBy String?  @db.Uuid
  createdAt DateTime @default(now())
  updatedAt DateTime
  roles      roles    @relation(fields: [roleId], references: [id], onDelete: Cascade)

  @@unique([userId, roleId])
}

model kip_agents {
  id                     String                   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  slug                   String                   @unique
  name                   String
  purpose                String
  model                  String
  context_scope          String?
  memory_enabled         Boolean                  @default(false)
  tools                  String[]                 @default([])
  permissions            String[]                 @default([])
  config                 Json                     @default("{}")
  status                 String                   @default("ready")
  created_at             DateTime                 @default(now())
  updated_at             DateTime                 @default(now())
  agent_class            String                   @default("Standard")
  model_provider         String                   @default("openai")
  model_settings         Json                     @default("{}")
  created_by             String?                  @db.Uuid
  visibility             String                   @default("private")
  kip_agent_keeper_types kip_agent_keeper_types[]
  kip_agent_logs         kip_agent_logs[]
  kip_agent_permissions  kip_agent_permissions[]
  kip_sessions           kip_sessions[]
  kip_drafts             kip_drafts[]
  Board                  Board[]
}

model kip_agent_logs {
  id                String     @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  agent_id          String     @db.Uuid
  user_id           String?
  input             String
  output            String?
  error             String?
  model             String?
  execution_time_ms Int?
  created_at        DateTime   @default(now())
  kip_agents        kip_agents @relation(fields: [agent_id], references: [id], onDelete: Cascade)
  users             users?     @relation(fields: [user_id], references: [id])

  @@index([agent_id])
  @@index([user_id])
  @@index([created_at])
}

model kip_drafts {
  id               String         @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  domain_id        String
  owner_id         String
  agent_id         String?        @db.Uuid
  kind             String
  key              String
  title            String
  summary          String?
  status           String         @default("draft")
  spec_json        Json           @default("{}")
  created_at       DateTime       @default(now())
  updated_at       DateTime       @default(now())
  domain           Domain         @relation(fields: [domain_id], references: [id], onDelete: Cascade)
  owner            users          @relation(fields: [owner_id], references: [id])
  agent            kip_agents?    @relation(fields: [agent_id], references: [id], onDelete: SetNull)
  active_sessions  kip_sessions[] @relation("KipDraftActiveSessions")

  @@index([domain_id, owner_id, kind, status])
  @@unique([domain_id, owner_id, kind, key])
}

model kip_sessions {
  id           String         @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  agent_id     String         @db.Uuid
  user_id      String?
  session_name String?
  topic        String?
  summary      String?
  tags         String[]       @default([])
  primary_keeper_id  String?
  primary_journey_id String?
  active_draft_id    String?        @db.Uuid
  created_at   DateTime       @default(now())
  updated_at   DateTime       @default(now())
  active_draft kip_drafts?    @relation("KipDraftActiveSessions", fields: [active_draft_id], references: [id], onDelete: SetNull)
  kip_messages kip_messages[]
  kip_agents   kip_agents     @relation(fields: [agent_id], references: [id], onDelete: Cascade)
  users        users?         @relation(fields: [user_id], references: [id])

  @@index([agent_id])
  @@index([user_id])
  @@index([active_draft_id])
  @@index([created_at])
}

model kip_messages {
  id           String       @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  session_id   String       @db.Uuid
  sender       String
  content      String
  role         String       @default("assistant")
  metadata     Json         @default("{}")
  created_at   DateTime     @default(now())
  kip_sessions kip_sessions @relation(fields: [session_id], references: [id], onDelete: Cascade)

  @@index([session_id])
  @@index([created_at])
}

model users {
  id                                                   String                     @id
  createdAt                                            DateTime                   @default(now())
  updatedAt                                            DateTime
  lastLoginAt                                          DateTime?
  email                                                String?                    @unique
  emailVerified                                        DateTime?
  hashedPassword                                       String?
  resetPasswordToken                                   String?
  resetPasswordTokenExpiresAt                          DateTime?
  emailVerificationToken                               String?
  emailVerificationTokenExpiresAt                      DateTime?
  name                                                 String?
  avatar_url                                           String?
  settings                                             Json?
  primaryDomainId                                      String?
  CollaborationActivity                                CollaborationActivity[]
  CrossDomainCollaboration                             CrossDomainCollaboration[]
  CrossDomainShare                                     CrossDomainShare[]
  Domain                                               Domain[]
  DomainInvitation                                     DomainInvitation[]
  DomainPermission_DomainPermission_grantedByTousers   DomainPermission[]         @relation("DomainPermission_grantedByTousers")
  DomainPermission_DomainPermission_userIdTousers      DomainPermission[]         @relation("DomainPermission_userIdTousers")
  DomainTransfer_DomainTransfer_fromOwnerIdTousers     DomainTransfer[]           @relation("DomainTransfer_fromOwnerIdTousers")
  DomainTransfer_DomainTransfer_toOwnerIdTousers       DomainTransfer[]           @relation("DomainTransfer_toOwnerIdTousers")
  DomainUsage                                          DomainUsage[]
  MemoryAccess                                         MemoryAccess[]
  MemoryAlert                                          MemoryAlert[]
  MemoryMigration_MemoryMigration_approvedByTousers    MemoryMigration[]          @relation("MemoryMigration_approvedByTousers")
  MemoryMigration_MemoryMigration_initiatedByTousers   MemoryMigration[]          @relation("MemoryMigration_initiatedByTousers")
  MemoryShare_MemoryShare_approvedByTousers            MemoryShare[]              @relation("MemoryShare_approvedByTousers")
  MemoryShare_MemoryShare_requestedByTousers           MemoryShare[]              @relation("MemoryShare_requestedByTousers")
  ShareAccessLog                                       ShareAccessLog[]
  ShareActivation_ShareActivation_activatedByTousers   ShareActivation[]          @relation("ShareActivation_activatedByTousers")
  ShareActivation_ShareActivation_deactivatedByTousers ShareActivation[]          @relation("ShareActivation_deactivatedByTousers")
  ShareNotification                                    ShareNotification[]
  ShareRequest_ShareRequest_approvedByTousers          ShareRequest[]             @relation("ShareRequest_approvedByTousers")
  ShareRequest_ShareRequest_requestedByTousers         ShareRequest[]             @relation("ShareRequest_requestedByTousers")
  ShareRequest_ShareRequest_reviewedByTousers          ShareRequest[]             @relation("ShareRequest_reviewedByTousers")
  ShareStepExecution                                   ShareStepExecution[]
  ShareTemplate                                        ShareTemplate[]
  ShareWorkflow                                        ShareWorkflow[]
  SoleMemoryScope                                      SoleMemoryScope[]
  UserApiCredential                                    UserApiCredential[]
  UserSettings                                         UserSettings?
  UserStorageConfig                                    UserStorageConfig?
  kip_agent_logs                                       kip_agent_logs[]
  kip_sessions                                         kip_sessions[]
  kip_drafts                                           kip_drafts[]
}

model kip_user_keys {
  id         String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  user_id    String   @db.Uuid
  provider   String
  api_key    String
  created_at DateTime @default(now())

  @@unique([user_id, provider])
  @@index([user_id])
}

model kip_agent_permissions {
  id         String     @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  agent_id   String     @db.Uuid
  user_id    String     @db.Uuid
  permission String
  created_at DateTime   @default(now())
  kip_agents kip_agents @relation(fields: [agent_id], references: [id], onDelete: Cascade)

  @@unique([agent_id, user_id, permission])
  @@index([agent_id])
  @@index([user_id])
}

model kip_platform_keys {
  id         String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  provider   String   @unique
  api_key    String
  label      String?
  is_active  Boolean  @default(true)
  created_by String?  @db.Uuid
  created_at DateTime @default(now())
  updated_at DateTime @default(now())

  @@index([provider])
  @@index([is_active])
}

model kip_agent_keeper_types {
  id             String     @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  agent_id       String     @db.Uuid
  keeper_type_id String
  created_at     DateTime   @default(now())
  updated_at     DateTime   @default(now())
  kip_agents     kip_agents @relation(fields: [agent_id], references: [id], onDelete: Cascade)
  KeeperType     KeeperType @relation(fields: [keeper_type_id], references: [id], onDelete: Cascade)

  @@unique([agent_id, keeper_type_id])
  @@index([agent_id])
  @@index([keeper_type_id])
}

model kip_lenses {
  id               String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  domainId         String?
  name             String
  systemPrompt     String
  rulesJson        Json?
  outputSchemaJson Json?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  @@unique([domainId, name])
  @@index([domainId])
  @@index([name])
}

model keeper_type_engagement_templates {
  id                     String               @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  keeper_type_id         String
  engagement_template_id String               @db.Uuid
  created_at             DateTime             @default(now())
  engagement_templates   engagement_templates @relation(fields: [engagement_template_id], references: [id], onDelete: Cascade)
  KeeperType             KeeperType           @relation(fields: [keeper_type_id], references: [id], onDelete: Cascade)

  @@unique([keeper_type_id, engagement_template_id])
  @@index([keeper_type_id])
  @@index([engagement_template_id])
}

model SoleReflection {
  id                   String           @id @default(cuid())
  keeperId             String
  agentId              String
  content              String
  topic                String?
  createdAt            DateTime         @default(now())
  promotedToMemoryCard Boolean          @default(false)
  promotedAt           DateTime?
  SoleMemoryCard       SoleMemoryCard[]
  Keeper               Keeper           @relation(fields: [keeperId], references: [id], onDelete: Cascade)

  @@index([keeperId])
  @@index([agentId])
  @@index([createdAt])
  @@index([promotedToMemoryCard])
}

model SoleMemoryCard {
  id             String         @id @default(cuid())
  keeperId       String
  reflectionId   String
  content        String
  topic          String?
  embedding      String?
  embedded       Boolean        @default(false)
  createdAt      DateTime       @default(now())
  Keeper         Keeper         @relation(fields: [keeperId], references: [id], onDelete: Cascade)
  SoleReflection SoleReflection @relation(fields: [reflectionId], references: [id], onDelete: Cascade)

  @@index([keeperId])
  @@index([reflectionId])
  @@index([embedded])
  @@index([topic])
  @@index([createdAt])
}

model SoleVoiceEntry {
  id        String   @id @default(cuid())
  keeperId  String
  agentId   String
  label     String
  belief    String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  Keeper    Keeper   @relation(fields: [keeperId], references: [id], onDelete: Cascade)

  @@index([keeperId])
  @@index([agentId])
  @@index([createdAt])
}

model SoleEcho {
  id                String    @id @default(cuid())
  keeperId          String
  agentId           String
  message           String
  triggerDate       DateTime?
  triggerConditions Json?
  createdAt         DateTime  @default(now())
  delivered         Boolean   @default(false)
  Keeper            Keeper    @relation(fields: [keeperId], references: [id], onDelete: Cascade)

  @@index([keeperId])
  @@index([agentId])
  @@index([triggerDate])
  @@index([delivered])
  @@index([createdAt])
}

model SoleLogbookEntry {
  id        String   @id @default(cuid())
  keeperId  String
  agentId   String
  entry     String
  label     String
  category  String
  createdAt DateTime @default(now())
  tags      String[]
  Keeper    Keeper   @relation(fields: [keeperId], references: [id], onDelete: Cascade)

  @@index([keeperId])
  @@index([agentId])
  @@index([category])
  @@index([createdAt])
}

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
  boards                                                   Board[]
  DomainInvitation                                         DomainInvitation[]
  DomainPermission                                         DomainPermission[]
  DomainTransfer                                           DomainTransfer[]
  DomainUsage                                              DomainUsage[]
  journeys                                                 Journey[]
  keepers                                                  Keeper[]
  moments                                                  Moment[]
  kip_drafts                                               kip_drafts[]
  policy                                                   DomainPolicy?
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

model DomainPolicy {
  id        String   @id @default(cuid())
  domainId  String   @unique
  version   String   @default("policy-v1")
  policy    Json     @default("{}")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  domain Domain @relation(fields: [domainId], references: [id], onDelete: Cascade)
}

model DomainAudit {
  id          String   @id @default(uuid())
  domainId    String
  action      String
  actorUserId String?
  actorEmail  String?
  ip          String?
  userAgent   String?
  before      Json?
  after       Json?
  createdAt   DateTime @default(now())

  @@index([domainId, createdAt])
}

model DomainPermission {
  id                                      String    @id @default(uuid())
  domainId                                String
  userId                                  String
  role                                    String    @default("user")
  permissions                             String[]  @default([])
  grantedBy                               String
  grantedAt                               DateTime  @default(now())
  expiresAt                               DateTime?
  Domain                                  Domain    @relation(fields: [domainId], references: [id], onDelete: Cascade)
  users_DomainPermission_grantedByTousers users     @relation("DomainPermission_grantedByTousers", fields: [grantedBy], references: [id], onDelete: Cascade)
  users_DomainPermission_userIdTousers    users     @relation("DomainPermission_userIdTousers", fields: [userId], references: [id], onDelete: Cascade)

  @@unique([domainId, userId])
  @@index([domainId])
  @@index([userId])
  @@index([role])
}

model CrossDomainShare {
  id                                             String    @id @default(uuid())
  sourceDomainId                                 String
  targetDomainId                                 String
  contentType                                    String
  contentId                                      String
  permissions                                    String[]  @default([])
  expiresAt                                      DateTime?
  allowSubsharing                                Boolean   @default(false)
  requireApproval                                Boolean   @default(true)
  approvedAt                                     DateTime?
  approvedBy                                     String?
  createdAt                                      DateTime  @default(now())
  updatedAt                                      DateTime  @updatedAt
  users                                          users?    @relation(fields: [approvedBy], references: [id])
  Domain_CrossDomainShare_sourceDomainIdToDomain Domain    @relation("CrossDomainShare_sourceDomainIdToDomain", fields: [sourceDomainId], references: [id], onDelete: Cascade)
  Domain_CrossDomainShare_targetDomainIdToDomain Domain    @relation("CrossDomainShare_targetDomainIdToDomain", fields: [targetDomainId], references: [id], onDelete: Cascade)

  @@unique([sourceDomainId, targetDomainId, contentType, contentId])
  @@index([sourceDomainId])
  @@index([targetDomainId])
  @@index([contentType, contentId])
  @@index([approvedAt])
}

model DomainInvitation {
  id         String    @id @default(uuid())
  domainId   String
  email      String
  role       String    @default("user")
  invitedBy  String
  token      String    @unique
  expiresAt  DateTime
  acceptedAt DateTime?
  createdAt  DateTime  @default(now())
  Domain     Domain    @relation(fields: [domainId], references: [id], onDelete: Cascade)
  users      users     @relation(fields: [invitedBy], references: [id], onDelete: Cascade)

  @@unique([domainId, email])
  @@index([domainId])
  @@index([token])
  @@index([expiresAt])
}

model DomainUsage {
  id        String   @id @default(uuid())
  domainId  String
  userId    String?
  action    String
  metadata  Json?    @default("{}")
  timestamp DateTime @default(now())
  ipAddress String?
  userAgent String?
  Domain    Domain   @relation(fields: [domainId], references: [id], onDelete: Cascade)
  users     users?   @relation(fields: [userId], references: [id])

  @@index([domainId, timestamp])
  @@index([action])
  @@index([userId])
}

model SoleMemoryScope {
  id                                                      String            @id @default(uuid())
  domainId                                                String            @unique
  isolationLevel                                          String            @default("strict")
  allowCrossDomain                                        Boolean           @default(false)
  maxMemorySize                                           Int               @default(1073741824)
  currentMemorySize                                       Int               @default(0)
  conversationMemory                                      Json?
  factualMemory                                           Json?
  proceduralMemory                                        Json?
  episodicMemory                                          Json?
  semanticMemory                                          Json?
  lastCleanupAt                                           DateTime?
  compressionLevel                                        String            @default("moderate")
  retentionPolicy                                         Json?
  readAccess                                              String[]          @default([])
  writeAccess                                             String[]          @default([])
  adminAccess                                             String[]          @default([])
  createdAt                                               DateTime          @default(now())
  updatedAt                                               DateTime          @updatedAt
  createdBy                                               String
  MemoryAccess                                            MemoryAccess[]
  MemoryAlert                                             MemoryAlert[]
  MemoryMigration                                         MemoryMigration[]
  MemoryShare_MemoryShare_sourceMemoryIdToSoleMemoryScope MemoryShare[]     @relation("MemoryShare_sourceMemoryIdToSoleMemoryScope")
  MemoryShare_MemoryShare_targetMemoryIdToSoleMemoryScope MemoryShare[]     @relation("MemoryShare_targetMemoryIdToSoleMemoryScope")
  users                                                   users             @relation(fields: [createdBy], references: [id])
  Domain                                                  Domain            @relation(fields: [domainId], references: [id], onDelete: Cascade)

  @@index([domainId, isolationLevel])
  @@index([createdBy])
}

model MemoryShare {
  id                                                          String          @id @default(uuid())
  sourceMemoryId                                              String
  targetMemoryId                                              String
  shareType                                                   String
  memoryCategories                                            String[]
  accessLevel                                                 String          @default("limited")
  status                                                      String          @default("pending")
  requestedBy                                                 String
  approvedBy                                                  String?
  expiresAt                                                   DateTime?
  maxAccess                                                   Int?
  currentAccess                                               Int             @default(0)
  includePatterns                                             String[]        @default([])
  excludePatterns                                             String[]        @default([])
  sanitizeContent                                             Boolean         @default(true)
  createdAt                                                   DateTime        @default(now())
  approvedAt                                                  DateTime?
  lastAccessedAt                                              DateTime?
  revokedAt                                                   DateTime?
  revokedBy                                                   String?
  purpose                                                     String?
  notes                                                       String?
  metadata                                                    Json?
  users_MemoryShare_approvedByTousers                         users?          @relation("MemoryShare_approvedByTousers", fields: [approvedBy], references: [id])
  users_MemoryShare_requestedByTousers                        users           @relation("MemoryShare_requestedByTousers", fields: [requestedBy], references: [id])
  SoleMemoryScope_MemoryShare_sourceMemoryIdToSoleMemoryScope SoleMemoryScope @relation("MemoryShare_sourceMemoryIdToSoleMemoryScope", fields: [sourceMemoryId], references: [id], onDelete: Cascade)
  SoleMemoryScope_MemoryShare_targetMemoryIdToSoleMemoryScope SoleMemoryScope @relation("MemoryShare_targetMemoryIdToSoleMemoryScope", fields: [targetMemoryId], references: [id], onDelete: Cascade)

  @@unique([sourceMemoryId, targetMemoryId])
  @@index([status, expiresAt])
  @@index([requestedBy])
  @@index([approvedBy])
}

model MemoryMigration {
  id                                       String          @id @default(uuid())
  sourceMemoryId                           String
  targetMemoryId                           String?
  migrationType                            String
  memoryCategories                         String[]
  preserveSource                           Boolean         @default(true)
  status                                   String          @default("pending")
  progress                                 Float           @default(0.0)
  transformRules                           Json?
  mappingRules                             Json?
  validationRules                          Json?
  startedAt                                DateTime?
  completedAt                              DateTime?
  failedAt                                 DateTime?
  errorMessage                             String?
  initiatedBy                              String
  approvedBy                               String?
  totalItems                               Int             @default(0)
  processedItems                           Int             @default(0)
  failedItems                              Int             @default(0)
  dataSize                                 Int             @default(0)
  rollbackData                             Json?
  canRollback                              Boolean         @default(false)
  rolledBackAt                             DateTime?
  createdAt                                DateTime        @default(now())
  updatedAt                                DateTime        @updatedAt
  users_MemoryMigration_approvedByTousers  users?          @relation("MemoryMigration_approvedByTousers", fields: [approvedBy], references: [id])
  users_MemoryMigration_initiatedByTousers users           @relation("MemoryMigration_initiatedByTousers", fields: [initiatedBy], references: [id])
  SoleMemoryScope                          SoleMemoryScope @relation(fields: [sourceMemoryId], references: [id])

  @@index([status, createdAt])
  @@index([initiatedBy])
  @@index([sourceMemoryId])
}

model MemoryAccess {
  id               String          @id @default(uuid())
  memoryId         String
  userId           String
  accessType       String
  memoryCategory   String
  operation        String
  requestSource    String?
  sessionId        String?
  ipAddress        String?
  userAgent        String?
  responseTime     Int?
  dataSize         Int?
  accessGranted    Boolean         @default(false)
  denialReason     String?
  validationPassed Boolean         @default(true)
  timestamp        DateTime        @default(now())
  metadata         Json?
  SoleMemoryScope  SoleMemoryScope @relation(fields: [memoryId], references: [id], onDelete: Cascade)
  users            users           @relation(fields: [userId], references: [id])

  @@index([memoryId, timestamp])
  @@index([userId, timestamp])
  @@index([accessType, accessGranted])
}

model MemoryAlert {
  id               String          @id @default(uuid())
  memoryId         String
  alertType        String
  severity         String
  message          String
  description      String?
  triggerData      Json?
  affectedUsers    String[]
  status           String          @default("active")
  acknowledgedBy   String?
  acknowledgedAt   DateTime?
  resolvedAt       DateTime?
  dismissedAt      DateTime?
  notificationSent Boolean         @default(false)
  escalationLevel  Int             @default(1)
  createdAt        DateTime        @default(now())
  updatedAt        DateTime        @updatedAt
  users            users?          @relation(fields: [acknowledgedBy], references: [id])
  SoleMemoryScope  SoleMemoryScope @relation(fields: [memoryId], references: [id], onDelete: Cascade)

  @@index([memoryId, status])
  @@index([severity, createdAt])
  @@index([alertType, status])
}

model DomainTransfer {
  id                                      String    @id @default(uuid())
  domainId                                String
  fromOwnerId                             String
  toOwnerId                               String
  token                                   String    @unique
  initiatedAt                             DateTime  @default(now())
  expiresAt                               DateTime
  approvedAt                              DateTime?
  completedAt                             DateTime?
  cancelledAt                             DateTime?
  Domain                                  Domain    @relation(fields: [domainId], references: [id], onDelete: Cascade)
  users_DomainTransfer_fromOwnerIdTousers users     @relation("DomainTransfer_fromOwnerIdTousers", fields: [fromOwnerId], references: [id], onDelete: Cascade)
  users_DomainTransfer_toOwnerIdTousers   users     @relation("DomainTransfer_toOwnerIdTousers", fields: [toOwnerId], references: [id], onDelete: Cascade)

  @@index([domainId])
  @@index([token])
  @@index([expiresAt])
}

model ShareWorkflow {
  id                    String              @id @default(uuid())
  name                  String
  description           String?
  workflowType          String              @default("content_share")
  requiresApproval      Boolean             @default(true)
  approvalSteps         Json
  autoApprovalRules     Json?
  defaultExpirationDays Int?                @default(30)
  maxAccessCount        Int?
  allowSubsharing       Boolean             @default(false)
  sourceDomainId        String
  targetDomainIds       String[]            @default([])
  isActive              Boolean             @default(true)
  contentFilters        Json?
  accessRestrictions    Json?
  auditLevel            String              @default("standard")
  createdBy             String
  createdAt             DateTime            @default(now())
  updatedAt             DateTime            @updatedAt
  ShareRequest          ShareRequest[]
  ShareTemplate         ShareTemplate[]
  users                 users               @relation(fields: [createdBy], references: [id])
  Domain                Domain              @relation(fields: [sourceDomainId], references: [id], onDelete: Cascade)
  ShareWorkflowStep     ShareWorkflowStep[]

  @@index([sourceDomainId])
  @@index([workflowType, isActive])
  @@index([createdBy])
}

model ShareWorkflowStep {
  id                 String               @id @default(uuid())
  workflowId         String
  stepNumber         Int
  stepName           String
  stepType           String
  requiredRole       String?
  requiredUsers      String[]             @default([])
  requireAllUsers    Boolean              @default(false)
  conditions         Json?
  actions            Json?
  timeoutHours       Int?
  isActive           Boolean              @default(true)
  order              Int                  @default(0)
  createdAt          DateTime             @default(now())
  updatedAt          DateTime             @updatedAt
  ShareStepExecution ShareStepExecution[]
  ShareWorkflow      ShareWorkflow        @relation(fields: [workflowId], references: [id], onDelete: Cascade)

  @@unique([workflowId, stepNumber])
  @@index([workflowId, order])
}

model ShareRequest {
  id                                         String               @id @default(uuid())
  workflowId                                 String?
  sourceDomainId                             String
  targetDomainId                             String
  contentType                                String
  contentId                                  String
  requestType                                String               @default("share")
  permissions                                String[]             @default([])
  accessLevel                                String               @default("read")
  requestedDuration                          Int?
  expiresAt                                  DateTime?
  maxAccess                                  Int?
  title                                      String?
  description                                String?
  justification                              String?
  urgency                                    String               @default("normal")
  status                                     String               @default("pending")
  currentStep                                Int                  @default(1)
  progress                                   Float                @default(0.0)
  requestedBy                                String
  requestedAt                                DateTime             @default(now())
  reviewedBy                                 String?
  reviewedAt                                 DateTime?
  approvedBy                                 String?
  approvedAt                                 DateTime?
  rejectedBy                                 String?
  rejectedAt                                 DateTime?
  rejectionReason                            String?
  activatedAt                                DateTime?
  completedAt                                DateTime?
  cancelledAt                                DateTime?
  cancelledBy                                String?
  cancellationReason                         String?
  accessCount                                Int                  @default(0)
  lastAccessedAt                             DateTime?
  lastAccessedBy                             String?
  ShareActivation                            ShareActivation[]
  ShareNotification                          ShareNotification[]
  users_ShareRequest_approvedByTousers       users?               @relation("ShareRequest_approvedByTousers", fields: [approvedBy], references: [id])
  users_ShareRequest_requestedByTousers      users                @relation("ShareRequest_requestedByTousers", fields: [requestedBy], references: [id])
  users_ShareRequest_reviewedByTousers       users?               @relation("ShareRequest_reviewedByTousers", fields: [reviewedBy], references: [id])
  Domain_ShareRequest_sourceDomainIdToDomain Domain               @relation("ShareRequest_sourceDomainIdToDomain", fields: [sourceDomainId], references: [id], onDelete: Cascade)
  Domain_ShareRequest_targetDomainIdToDomain Domain               @relation("ShareRequest_targetDomainIdToDomain", fields: [targetDomainId], references: [id], onDelete: Cascade)
  ShareWorkflow                              ShareWorkflow?       @relation(fields: [workflowId], references: [id])
  ShareStepExecution                         ShareStepExecution[]

  @@unique([sourceDomainId, targetDomainId, contentType, contentId, status])
  @@index([sourceDomainId, status])
  @@index([targetDomainId, status])
  @@index([requestedBy])
  @@index([status, requestedAt])
  @@index([contentType, contentId])
}

model ShareStepExecution {
  id                String            @id @default(uuid())
  shareRequestId    String
  workflowStepId    String
  stepNumber        Int
  status            String            @default("pending")
  startedAt         DateTime          @default(now())
  completedAt       DateTime?
  timeoutAt         DateTime?
  inputData         Json?
  outputData        Json?
  errorMessage      String?
  assignedTo        String?
  approvedBy        String?
  approvedAt        DateTime?
  rejectedBy        String?
  rejectedAt        DateTime?
  rejectionReason   String?
  executionTime     Int?
  retryCount        Int               @default(0)
  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt
  users             users?            @relation(fields: [assignedTo], references: [id])
  ShareRequest      ShareRequest      @relation(fields: [shareRequestId], references: [id], onDelete: Cascade)
  ShareWorkflowStep ShareWorkflowStep @relation(fields: [workflowStepId], references: [id], onDelete: Cascade)

  @@unique([shareRequestId, workflowStepId])
  @@index([shareRequestId, stepNumber])
  @@index([status, startedAt])
  @@index([assignedTo, status])
}

model ShareActivation {
  id                                         String           @id @default(uuid())
  shareRequestId                             String
  activationType                             String           @default("direct")
  accessToken                                String           @unique
  accessUrl                                  String?
  embedCode                                  String?
  ipRestrictions                             String[]         @default([])
  userRestrictions                           String[]         @default([])
  sessionTimeout                             Int?
  activatedBy                                String
  activatedAt                                DateTime         @default(now())
  expiresAt                                  DateTime?
  deactivatedAt                              DateTime?
  deactivatedBy                              String?
  deactivationReason                         String?
  accessCount                                Int              @default(0)
  lastAccessedAt                             DateTime?
  lastAccessedBy                             String?
  lastAccessIP                               String?
  suspiciousActivity                         Boolean          @default(false)
  securityAlerts                             Json[]           @default([])
  createdAt                                  DateTime         @default(now())
  updatedAt                                  DateTime         @updatedAt
  ShareAccessLog                             ShareAccessLog[]
  users_ShareActivation_activatedByTousers   users            @relation("ShareActivation_activatedByTousers", fields: [activatedBy], references: [id])
  users_ShareActivation_deactivatedByTousers users?           @relation("ShareActivation_deactivatedByTousers", fields: [deactivatedBy], references: [id])
  ShareRequest                               ShareRequest     @relation(fields: [shareRequestId], references: [id], onDelete: Cascade)

  @@index([shareRequestId])
  @@index([accessToken])
  @@index([activatedBy])
  @@index([expiresAt])
}

model ShareAccessLog {
  id                String          @id @default(uuid())
  shareActivationId String
  userId            String?
  accessedAt        DateTime        @default(now())
  ipAddress         String?
  userAgent         String?
  referrer          String?
  sessionId         String?
  accessType        String
  contentAccessed   String?
  actionPerformed   String?
  responseTime      Int?
  dataTransferred   Int?
  accessGranted     Boolean         @default(true)
  denialReason      String?
  securityFlags     String[]        @default([])
  metadata          Json?
  ShareActivation   ShareActivation @relation(fields: [shareActivationId], references: [id], onDelete: Cascade)
  users             users?          @relation(fields: [userId], references: [id])

  @@index([shareActivationId, accessedAt])
  @@index([userId, accessedAt])
  @@index([accessType, accessedAt])
  @@index([ipAddress])
}

model ShareNotification {
  id               String       @id @default(uuid())
  shareRequestId   String
  recipientId      String
  notificationType String
  title            String
  message          String
  actionUrl        String?
  actionText       String?
  channels         String[]     @default(["email"])
  priority         String       @default("normal")
  status           String       @default("pending")
  sentAt           DateTime?
  deliveredAt      DateTime?
  failedAt         DateTime?
  failureReason    String?
  readAt           DateTime?
  clickedAt        DateTime?
  respondedAt      DateTime?
  retryCount       Int          @default(0)
  maxRetries       Int          @default(3)
  nextRetryAt      DateTime?
  createdAt        DateTime     @default(now())
  updatedAt        DateTime     @updatedAt
  users            users        @relation(fields: [recipientId], references: [id])
  ShareRequest     ShareRequest @relation(fields: [shareRequestId], references: [id], onDelete: Cascade)

  @@index([shareRequestId])
  @@index([recipientId, status])
  @@index([notificationType, status])
  @@index([sentAt])
}

model ShareTemplate {
  id                 String         @id @default(uuid())
  name               String
  description        String?
  templateType       String
  permissions        String[]       @default([])
  accessLevel        String         @default("read")
  defaultDuration    Int?
  maxAccess          Int?
  workflowId         String?
  requireApproval    Boolean        @default(false)
  autoActivate       Boolean        @default(false)
  allowSubsharing    Boolean        @default(false)
  contentFilters     Json?
  accessRestrictions Json?
  domainId           String
  contentTypes       String[]       @default([])
  isPublic           Boolean        @default(false)
  usageCount         Int            @default(0)
  lastUsedAt         DateTime?
  createdBy          String
  createdAt          DateTime       @default(now())
  updatedAt          DateTime       @updatedAt
  isActive           Boolean        @default(true)
  users              users          @relation(fields: [createdBy], references: [id])
  Domain             Domain         @relation(fields: [domainId], references: [id], onDelete: Cascade)
  ShareWorkflow      ShareWorkflow? @relation(fields: [workflowId], references: [id])

  @@index([domainId])
  @@index([templateType, isActive])
  @@index([createdBy])
}

model CrossDomainCollaboration {
  id                    String                  @id @default(uuid())
  name                  String
  description           String?
  collaborationType     String                  @default("project")
  hostDomainId          String
  memberDomainIds       String[]                @default([])
  invitedDomainIds      String[]                @default([])
  permissions           Json
  sharedResources       Json
  accessRules           Json
  status                String                  @default("planning")
  startDate             DateTime?
  endDate               DateTime?
  actualEndDate         DateTime?
  auditLevel            String                  @default("standard")
  requireMFA            Boolean                 @default(false)
  allowedIPs            String[]                @default([])
  lastActivity          DateTime?
  activityCount         Int                     @default(0)
  createdBy             String
  createdAt             DateTime                @default(now())
  updatedAt             DateTime                @updatedAt
  CollaborationActivity CollaborationActivity[]
  users                 users                   @relation(fields: [createdBy], references: [id])
  Domain                Domain                  @relation(fields: [hostDomainId], references: [id], onDelete: Cascade)

  @@index([hostDomainId])
  @@index([status, startDate])
  @@index([createdBy])
}

model CollaborationActivity {
  id                       String                   @id @default(uuid())
  collaborationId          String
  domainId                 String
  userId                   String
  activityType             String
  entityType               String?
  entityId                 String?
  description              String?
  changes                  Json?
  ipAddress                String?
  userAgent                String?
  sessionId                String?
  timestamp                DateTime                 @default(now())
  CrossDomainCollaboration CrossDomainCollaboration @relation(fields: [collaborationId], references: [id], onDelete: Cascade)
  Domain                   Domain                   @relation(fields: [domainId], references: [id])
  users                    users                    @relation(fields: [userId], references: [id])

  @@index([collaborationId, timestamp])
  @@index([domainId, activityType])
  @@index([userId, timestamp])
}

model SslCertificate {
  id                 String    @id @default(uuid())
  domainId           String
  customDomain       String
  certificateData    String
  privateKey         String
  certificateChain   String[]  @default([])
  provider           String
  providerData       Json?
  commonName         String
  subjectAltNames    String[]  @default([])
  issuer             String
  serialNumber       String
  validFrom          DateTime
  validUntil         DateTime
  status             String    @default("pending")
  challengeType      String?
  validationMethod   String?
  keyAlgorithm       String?
  autoRenewal        Boolean   @default(true)
  renewalDaysBefore  Int       @default(30)
  lastRenewalAttempt DateTime?
  nextRenewalCheck   DateTime?
  createdAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt
  Domain             Domain    @relation(fields: [domainId], references: [id], onDelete: Cascade)

  @@index([domainId])
  @@index([customDomain])
  @@index([status, validUntil])
  @@index([nextRenewalCheck])
}

model MediaContent {
  id                                                                         String                 @id @db.Uuid
  type                                                                       String
  url                                                                        String
  alt                                                                        String?
  createdAt                                                                  DateTime               @default(now())
  playlistOwnerId                                                            String?                @db.Uuid
  media_frame_instances_MediaContent_playlistOwnerIdTomedia_frame_instances  media_frame_instances? @relation("MediaContent_playlistOwnerIdTomedia_frame_instances", fields: [playlistOwnerId], references: [id])
  media_frame_instances_media_frame_instances_currentContentIdToMediaContent media_frame_instances? @relation("media_frame_instances_currentContentIdToMediaContent")
}

model MediaFrameConfig {
  id                    String                  @id @db.Uuid
  name                  String                  @unique
  description           String?
  theme                 Json?
  createdAt             DateTime                @default(now())
  updatedAt             DateTime
  media_frame_instances media_frame_instances[]
}

model media_frame_instances {
  id                                                                String           @id @db.Uuid
  entityType                                                        String
  entityId                                                          String
  configId                                                          String           @db.Uuid
  currentContentId                                                  String?          @unique @db.Uuid
  createdAt                                                         DateTime         @default(now())
  updatedAt                                                         DateTime
  MediaContent_MediaContent_playlistOwnerIdTomedia_frame_instances  MediaContent[]   @relation("MediaContent_playlistOwnerIdTomedia_frame_instances")
  MediaFrameConfig                                                  MediaFrameConfig @relation(fields: [configId], references: [id])
  MediaContent_media_frame_instances_currentContentIdToMediaContent MediaContent?    @relation("media_frame_instances_currentContentIdToMediaContent", fields: [currentContentId], references: [id])
}

/// Alias mapping for legacy board identifiers within a domain scope
model BoardAlias {
  id       String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  domainId String
  boardId  String @db.Uuid
  alias    String

  @@unique([domainId, alias])
}

/// Durable request logging for diagnostics and correlation
model RequestLog {
  id    String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  reqId String
  at    DateTime @default(now())
  level String
  step  String
  meta  Json?

  @@index([reqId, at])
}
```

---

# 2. PACKAGE DEPENDENCIES

`package.json` (root):
```json
{
  "name": "keeper-platform",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*",
    "tools/*"
  ],
  "version": "0.0.0",
  "type": "module",
  "packageManager": "pnpm@10.11.0",
  "scripts": {
    "dev": "node scripts/dev-with-url.js",
    "dev:simple": "turbo dev",
    "dev:with-link": "turbo dev && echo '\\n\\n—————————' && echo '🚀  Web dev server ready: http://localhost:5173' && echo '—————————\\n'",
    "build": "turbo build",
    "build:clean": "turbo clean && turbo build",
    "start": "turbo run start",
    "start:api": "node apps/api/dist/index.js",
    "start:api:dev": "node apps/api/dist/index.js",
    "lint": "pnpm -r run lint",
    "lint:fix": "pnpm -r run lint:fix",
    "type-check": "pnpm -r run type-check || pnpm -r run typecheck",
    "clean": "turbo clean",
    "test": "vitest run",
    "db:generate": "pnpm --filter @keeper/database generate",
    "db:push": "pnpm --filter @keeper/database push",
    "db:pull": "pnpm --filter @keeper/database pull",
    "db:studio": "pnpm --filter @keeper/database studio",
    "db:migrate": "pnpm --filter @keeper/database migrate",
    "db:reset": "pnpm --filter @keeper/database reset",
    "preinstall": "npx only-allow pnpm",
    "build:railway": "pnpm run clean && RAILWAY_DISABLE_BUILD_CACHE=true pnpm install --frozen-lockfile --no-cache && pnpm --filter @keeper/database run migrate:deploy && pnpm run build",
    "build:railway-debug": "pnpm run clean && echo 'Railway build with full debugging' && pnpm install --frozen-lockfile --no-cache --loglevel=verbose && pnpm run build --verbose",
    "railway:verify": "echo 'Verifying Railway build artifacts...' && find packages/kam/dist -name '*.js' -type f && ls -la packages/kam/dist/auth/",
    "quick:web": "pnpm -F keeper-web run type-check",
    "quick:api": "pnpm -F keeper-api run test:smoke",
    "smoke:web": "pnpm -F keeper-web run type-check && pnpm -F keeper-web run build",
    "smoke:api": "pnpm -F keeper-api run type-check && pnpm -F keeper-api exec vitest run src/tests/smoke --reporter=dot --silent",
    "smoke": "pnpm run smoke:api && pnpm run smoke:web",
    "postinstall": "pnpm --filter @keeper/database generate",
    "diag:boards": "tsx tools/diag/boards-domains-report.ts",
    "diag:verify:board-data": "tsx tools/diag/verify-board-data-mounts.ts",
    "diag:verify:dmb": "tsx tools/diag/verify-dmb-mounts.ts",
    "diag:verify:ctx": "tsx tools/diag/find-context-reads.ts",
    "diag:verify:all": "pnpm diag:verify:board-data && pnpm diag:verify:dmb && pnpm diag:verify:ctx"
  },
  "devDependencies": {
    "@eslint/js": "^9.28.0",
    "@types/express": "4.17.21",
    "@types/node": "^22.15.30",
    "eslint": "^9.28.0",
    "eslint-plugin-react-hooks": "^5.1.0",
    "eslint-plugin-react-refresh": "^0.4.5",
    "eslint-plugin-unused-imports": "^4.2.0",
    "globals": "^15.13.0",
    "turbo": "^2.5.4",
    "typescript": "~5.8.3",
    "typescript-eslint": "^8.15.0"
  },
  "pnpm": {
    "overrides": {
      "@types/express": "4.17.21",
      "@types/express-serve-static-core": "4.19.6"
    }
  }
}
```

`apps/web/package.json`:
```json
{
  "name": "keeper-web",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "vercel-build": "vite build",
    "preview": "vite preview",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "type-check": "tsc --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "@heroicons/react": "^2.2.0",
    "@keeper/shared": "workspace:*",
    "@radix-ui/react-dialog": "^1.1.4",
    "@radix-ui/react-dropdown-menu": "^2.1.4",
    "@radix-ui/react-label": "^2.1.7",
    "@radix-ui/react-scroll-area": "^1.2.2",
    "@radix-ui/react-select": "^2.1.4",
    "@radix-ui/react-slot": "^1.1.1",
    "@radix-ui/react-switch": "^1.2.6",
    "@radix-ui/react-tabs": "^1.1.2",
    "@tailwindcss/postcss": "^4.1.10",
    "@types/react": "^19.1.2",
    "@types/react-dom": "^19.1.2",
    "@types/uuid": "^10.0.0",
    "@vitejs/plugin-react": "^4.4.1",
    "autoprefixer": "^10.4.21",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "framer-motion": "^12.16.0",
    "lucide-react": "^0.513.0",
    "react": "^19.1.0",
    "react-dom": "^19.1.0",
    "react-router-dom": "^7.6.2",
    "tailwind-merge": "^3.3.1",
    "tailwindcss": "^4.1.10",
    "tailwindcss-animate": "^1.0.7",
    "typescript": "~5.8.3",
    "uuid": "^11.1.0",
    "vite": "^6.3.5"
  },
  "devDependencies": {
    "@keeper/eslint-config": "workspace:*",
    "eslint-plugin-unused-imports": "^4.2.0"
  }
}
```

`apps/api/package.json`:
```json
{
  "name": "keeper-api",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "dist/index.js",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "build:server": "tsc -p apps/api/tsconfig.json",
    "start": "pnpm --filter @keeper/database prisma migrate deploy && node --enable-source-maps apps/api/dist/index.js",
    "test": "vitest",
    "test:smoke": "vitest run --reporter=dot --silent=true src/tests/smoke",
    "postinstall": "pnpm --filter @keeper/database generate",
    "migrate:deploy": "pnpm --filter @keeper/database prisma migrate deploy",
    "type-check": "tsc --noEmit",
    "lint": "eslint ."
  },
  "dependencies": {
    "@keeper/database": "workspace:*",
    "@keeper/kam": "workspace:*",
    "@keeper/shared": "workspace:*",
    "@prisma/client": "^6.11.1",
    "@vercel/blob": "^2.0.0",
    "bcryptjs": "^2.4.3",
    "cookie-parser": "^1.4.7",
    "cors": "^2.8.5",
    "dotenv": "^16.5.0",
    "express": "^4.18.2",
    "express-rate-limit": "^7.1.5",
    "helmet": "^7.1.0",
    "ioredis": "^5.3.2",
    "jsonwebtoken": "^9.0.2",
    "morgan": "^1.10.0",
    "openai": "^4.75.1",
    "zod": "^3.25.45"
  },
  "engines": {
    "node": ">=20"
  },
  "devDependencies": {
    "@types/bcryptjs": "^2.4.2",
    "@types/cookie-parser": "^1.4.9",
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/jsonwebtoken": "^9.0.9",
    "@types/morgan": "^1.9.9",
    "@types/node": "^22.15.30",
    "@types/supertest": "^6.0.2",
    "jsonwebtoken": "^9.0.2",
    "supertest": "^7.0.0",
    "tsx": "^4.19.2",
    "typescript": "~5.8.3",
    "vitest": "^3.2.4"
  }
}
```

`apps/proxy/package.json`:
```json
{
  "name": "proxy",
  "version": "0.1.0",
  "private": true,
  "type": "commonjs",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "start": "node dist/index.js",
    "dev": "tsc -w -p tsconfig.json",
    "test": "jest",
    "test:watch": "jest --watch"
  },
  "dependencies": {
    "express": "^4.19.2",
    "node-fetch": "^2.7.0",
    "pg": "^8.11.5"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/jest": "^29.5.12",
    "@types/node": "^22.15.30",
    "@types/node-fetch": "^2.6.11",
    "@types/supertest": "^6.0.2",
    "jest": "^29.7.0",
    "supertest": "^6.3.4",
    "ts-jest": "^29.1.2",
    "typescript": "~5.8.3"
  },
  "engines": {
    "node": ">=18"
  }
}
```

`packages/database/package.json`:
```json
{
  "name": "@keeper/database",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "default": "./dist/index.js"
    }
  },
  "scripts": {
    "prisma": "prisma",
    "generate": "prisma generate",
    "build": "prisma generate && tsc",
    "migrate:deploy": "prisma migrate deploy",
    "migrate:resolve": "node scripts/resolve-failed-migration.js",
    "check:boards": "node scripts/check-board-data.js",
    "check:migrations": "node scripts/check-migrations.js",
    "check:table": "node scripts/check-table-structure.js",
    "dev": "tsc --watch",
    "type-check": "tsc --noEmit",
    "push": "prisma db push",
    "pull": "prisma db pull",
    "studio": "prisma studio",
    "migrate": "prisma migrate dev",
    "reset": "prisma migrate reset",
    "seed": "tsx prisma/seed.ts"
  },
  "dependencies": {
    "@keeper/shared": "workspace:*",
    "@prisma/client": "^6.11.1",
    "@types/pg": "^8.15.5",
    "ioredis": "^5.6.1",
    "node-cron": "^4.2.1",
    "pg": "^8.16.3",
    "prisma": "^6.11.1",
    "prom-client": "^15.1.3",
    "uuid": "^11.1.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.23",
    "@types/node-cron": "^3.0.11",
    "@types/uuid": "^10.0.0",
    "typescript": "~5.8.3"
  }
}
```

`packages/shared/package.json`:
```json
{
  "name": "@keeper/shared",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "default": "./dist/index.js"
    }
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "type-check": "tsc --noEmit"
  },
  "devDependencies": {
    "typescript": "~5.8.3"
  }
}
```

`packages/kam/package.json`:
```json
{
  "name": "@keeper/kam",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "default": "./dist/index.js"
    }
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "@keeper/database": "workspace:*",
    "@keeper/shared": "workspace:*",
    "bcryptjs": "^2.4.3",
    "express": "^4.21.2",
    "ioredis": "^5.6.1",
    "jsonwebtoken": "^9.0.2",
    "zod": "^3.25.45"
  },
  "devDependencies": {
    "@types/bcryptjs": "^2.4.6",
    "@types/express": "^4.17.23",
    "@types/jsonwebtoken": "^9.0.9",
    "typescript": "~5.8.3"
  }
}
```

`tools/eslint-config/package.json`:
```json
{
  "name": "@keeper/eslint-config",
  "version": "0.1.0",
  "private": true,
  "main": "index.js",
  "exports": {
    ".": "./index.js",
    "./react": "./react.js",
    "./node": "./node.js"
  },
  "dependencies": {
    "@typescript-eslint/eslint-plugin": "^8.30.1",
    "@typescript-eslint/parser": "^8.30.1",
    "eslint": "^9.25.0",
    "eslint-plugin-react": "^7.32.2",
    "eslint-plugin-react-hooks": "^4.6.0"
  }
}
```

`v0 Temp/boards-canvas/package.json`:
```json
{
  "name": "my-v0-project",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "build": "next build",
    "dev": "next dev",
    "lint": "next lint",
    "start": "next start"
  },
  "dependencies": {
    "@hookform/resolvers": "^3.9.1",
    "@radix-ui/react-accordion": "1.2.2",
    "@radix-ui/react-alert-dialog": "1.1.4",
    "@radix-ui/react-aspect-ratio": "1.1.1",
    "@radix-ui/react-avatar": "1.1.2",
    "@radix-ui/react-checkbox": "1.1.3",
    "@radix-ui/react-collapsible": "1.1.2",
    "@radix-ui/react-context-menu": "2.2.4",
    "@radix-ui/react-dialog": "1.1.4",
    "@radix-ui/react-dropdown-menu": "2.1.4",
    "@radix-ui/react-hover-card": "1.1.4",
    "@radix-ui/react-label": "2.1.1",
    "@radix-ui/react-menubar": "1.1.4",
    "@radix-ui/react-navigation-menu": "1.2.3",
    "@radix-ui/react-popover": "1.1.4",
    "@radix-ui/react-progress": "1.1.1",
    "@radix-ui/react-radio-group": "1.2.2",
    "@radix-ui/react-scroll-area": "1.2.2",
    "@radix-ui/react-select": "2.1.4",
    "@radix-ui/react-separator": "1.1.1",
    "@radix-ui/react-slider": "1.2.2",
    "@radix-ui/react-slot": "1.1.1",
    "@radix-ui/react-switch": "1.1.2",
    "@radix-ui/react-tabs": "1.1.2",
    "@radix-ui/react-toast": "1.2.4",
    "@radix-ui/react-toggle": "1.1.1",
    "@radix-ui/react-toggle-group": "1.1.1",
    "@radix-ui/react-tooltip": "1.1.6",
    "autoprefixer": "^10.4.20",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "cmdk": "1.0.4",
    "date-fns": "4.1.0",
    "embla-carousel-react": "8.5.1",
    "geist": "^1.3.1",
    "input-otp": "1.4.1",
    "lucide-react": "^0.454.0",
    "next": "15.2.4",
    "next-themes": "^0.4.4",
    "react": "^19",
    "react-day-picker": "9.8.0",
    "react-dom": "^19",
    "react-hook-form": "^7.54.1",
    "react-resizable-panels": "^2.1.7",
    "recharts": "2.15.0",
    "sonner": "^1.7.1",
    "tailwind-merge": "^2.5.5",
    "tailwindcss-animate": "^1.0.7",
    "vaul": "^0.9.6",
    "zod": "^3.24.1"
  },
  "devDependencies": {
    "@types/node": "^22",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "postcss": "^8.5",
    "tailwindcss": "^3.4.17",
    "typescript": "^5"
  }
}
```

---

# 3. PROJECT STRUCTURE

Only `.ts`, `.tsx`, `.js`, `.jsx` files listed. Counts reflect the number of matching files in each directory.

## `apps/web/src` (290 files)
- App.tsx
- app-old.tsx
- main.tsx
- postcss.config.js
- vite-env.d.ts
- ai (1)
  - agentBridge.ts
- auth (4)
  - AuthGate.tsx
  - ensureSession.ts
  - handleAuthError.ts
  - logout.ts
- boards (15)
  - AgentBoard.tsx
  - BoardContext.tsx
  - domain-board.tsx
  - index.ts
  - journey-board.tsx
  - keeper-type-board.tsx
  - people-board.tsx
  - components (3)
    - AgentRuntimeToolbar.tsx
    - BoardToolbar.tsx
    - FramePicker.tsx
  - templates (5)
    - agent.template.ts
    - domain.template.ts
    - index.ts
    - journey.template.ts
    - people.template.ts
- boot (1)
  - fetch-shim.ts
- components (92)
  - AuthDebug.tsx
  - AuthForm.tsx
  - DebugButton.tsx
  - ErrorBoundary.tsx
  - boards (2)
    - BoardRenderer.tsx
    - index.ts
  - domain (3)
    - DomainBoardRenderer.tsx
    - EditableProp.tsx
    - PropRenderer.tsx
  - domain-manager (9)
    - DnsInfoPanel.tsx
    - DnsStatusBadge.tsx
    - DomainDetailCard.tsx
    - DomainDetailForm.tsx
    - DomainDetailModal.tsx
    - DomainListPane.tsx
    - DomainManager.tsx
    - MembersPanel.tsx
    - types.ts
  - engagement (7)
    - EchoWriter.tsx
    - EngagementButton.tsx
    - EngagementModal.tsx
    - IdentityLogbook.tsx
    - MemoryCardManager.tsx
    - ReflectionJournal.tsx
    - VoicePanel.tsx
  - frames (34)
    - AgentPreviewFrame.tsx
    - CodeSnippetFrame.tsx
    - ConfigPanelFrame.tsx
    - CustomDomainFrame.tsx
    - DialogFrame.tsx
    - DomainCardFrame.tsx
    - DraftFrame.tsx
    - FrameRenderer.tsx
    - MediaCardFrame.tsx
    - MemberListFrame.tsx
    - MemoryFrame.tsx
    - PreviewFrame.tsx
    - ProcessFrame.tsx
    - SetupStepsFrame.tsx
    - TasksFrame.tsx
    - TopicsFrame.tsx
    - activity-feed-frame.tsx
    - collaboration-network-frame.tsx
    - index.ts
    - journey-config-frame.tsx
    - journey-overview-frame.tsx
    - keeper-type-config-frame.tsx
    - keeper-type-overview-frame.tsx
    - keeper-type-process-frame.tsx
    - linked-agents-frame.tsx
    - linked-journeys-frame.tsx
    - moment-grid-frame.tsx
    - path-list-frame.tsx
    - people-overview-frame.tsx
    - people-process-frame.tsx
    - registerFrames.ts
    - registry.ts
    - role-manager-frame.tsx
    - schemas.ts
  - keeper (1)
    - SoleArchitectureTab.tsx
  - kip (1)
    - ActionReceiptCard.tsx
  - layout (3)
    - Navbar.tsx
    - Sidebar.tsx
    - UserIdentityDropdown.tsx
  - patterns (4)
    - ManifestoCard.tsx
    - PathwayNav.tsx
    - index.ts
    - types.ts
  - props (14)
    - ActionButtonProp.tsx
    - ActionPropRenderer.tsx
    - FormProp.tsx
    - LinkedCard.tsx
    - PropDropZone.tsx
    - PropManager.tsx
    - TokenProp.tsx
    - index.ts
    - editors (2)
      - ImageUploadDiagnostic.tsx
      - PropEditors.tsx
    - renderers (4)
      - ActionButton.tsx
      - ActionForm.tsx
      - ActionToggle.tsx
      - ActionUpload.tsx
  - studio (7)
    - AIAssistPanel.tsx
    - AgentKeeperTypeAssignment.tsx
    - ConflictDialog.tsx
    - DraggableTabs.tsx
    - FrameConfigSheet.tsx
    - MediaUploader.tsx
    - TemplateChooser.tsx
  - ui (2)
    - ApiKeyForm.tsx
    - HelpTooltip.tsx
- context (8)
  - AuthContext.tsx
  - BoardContext.tsx
  - BoardDataContext.tsx
  - FrameContext.tsx
  - KeeperContext.tsx
  - ThemeContext.tsx
  - ViewModeContext.tsx
  - WorldModeContext.tsx
- features (30)
  - board-studio (28)
    - components (1)
      - FrameConfigPanel.tsx
    - patterns (1)
      - PatternRenderer.tsx
    - settings (2)
      - SettingsRenderer.tsx
      - schema.ts
    - templates (1)
      - index.ts
    - types (2)
      - frame-adapters.ts
      - unified-frame.ts
    - v0 (21)
      - BoardStudio.tsx
      - index.ts
      - types.ts
      - context (1)
        - BoardStudioContext.tsx
      - lib (1)
        - utils.ts
      - patterns (1)
        - registry.ts
      - components (2)
        - FrameConfigPanel.tsx
        - FrameRenderer.tsx
      - components/ui (12)
        - button.tsx
        - card.tsx
        - dialog.tsx
        - dropdown-menu.tsx
        - input.tsx
        - label.tsx
        - scroll-area.tsx
        - select.tsx
        - sheet.tsx
        - switch.tsx
        - tabs.tsx
        - textarea.tsx
      - components/navigation.tsx
  - studio (2)
    - debug (2)
      - StudioDebug.tsx
      - useStudioDebug.tsx
- hooks (5)
  - useAgentEvents.ts
  - useAgentSessions.ts
  - useAutosave.ts
  - useUserSettings.ts
  - useViewerContext.ts
- layouts (4)
  - AppLayout.tsx
  - BoardPublicLayout.tsx
  - KeeperDashboardLayout.tsx
  - PublicLayout.tsx
- lib (14)
  - agentRegistry.ts
  - api.ts
  - apiFetch.ts
  - authz.ts
  - debug.tsx
  - diagnostics.ts
  - keeperApi.ts
  - kipApi.ts
  - themeApi.ts
  - token.ts
  - engagement (3)
    - submit.ts
    - templates.client.ts
    - types.ts
  - uid (1)
    - requestId.ts
- pages (64)
  - BoardDemoPage.tsx
  - DebugPage.tsx
  - FrameSystemDemoPage.tsx
  - LandingPage.tsx
  - LeadAgentPage.tsx
  - LibraryPage.tsx
  - LoginPage.tsx
  - RegisterPage.tsx
  - RootKeeperPage.tsx
  - StyleEditorPage.tsx
  - UserApiKeyManagerPage.tsx
  - V0Page.tsx
  - admin (3)
    - DomainsPage.tsx
    - RolesPage.tsx
    - UserManagementPage.tsx
  - d (9)
    - DomainAdminPage.tsx
    - DomainAgentPage.tsx
    - DomainFeedPage.tsx
    - DomainJourneysPage.tsx
    - DomainKeepersPage.tsx
    - DomainProfilePage.tsx
    - LegacyDomainRedirect.tsx
    - PublicDomainPage.tsx
    - V0ShellPage.tsx
  - keeper (17)
    - AllKeepersPage.tsx
    - CreateKeeperPage.tsx
    - DomainDashboardPage.tsx
    - EchoWriterPage.tsx
    - EngagementTemplatesPage.tsx
    - IdentityLogbookPage.tsx
    - KeeperDashboardPage.tsx
    - KeeperJourneysPage.tsx
    - KeeperManagePage.tsx
    - KeeperMemoryPage.tsx
    - KeeperMomentsPage.tsx
    - KeeperTypesPage.tsx
    - MemoryCardManagerPage.tsx
    - ReflectionJournalPage.tsx
    - SelectedKeeperMetadataPage.tsx
    - VoicePanelPage.tsx
  - kip (2)
    - KipAgentBoardPage.tsx
    - SessionEditModal.tsx
  - manifestos (1)
    - CleanSurfaceDoctrinePage.tsx
  - root (1)
    - RootDashboardPage.tsx
  - settings (2)
    - SettingsPage.tsx
    - UserApiKeyManagerPage.tsx
  - studio (11)
    - AdminPage.tsx
    - AgentBoardPage.tsx
    - AgentClassesPage.tsx
    - DomainBoardPage.tsx
    - KipStudioPage.tsx
    - MemoryPatternsPage.tsx
    - board-studio-page.tsx
    - journey-board-page.tsx
    - keeper-type-board-page.tsx
    - people-board-page.tsx
    - board-studio (1)
      - kip/AgentsPage.tsx
    - domain (2)
      - DomainBoardStudioPage.tsx
      - DomainWorkshopPage.tsx
    - kip (3)
      - AgentBuilderForm.tsx
      - AgentLogsPage.tsx
      - AgentsPage.tsx
      - PlatformApiKeyManagerPage.tsx
- patterns (1)
  - registry.tsx
- props (2)
  - token (2)
    - TokenPlaceholder.tsx
    - schema.ts
- providers (1)
  - AppProviders.tsx
- types (5)
  - frame.ts
  - keeper.ts
  - kip.ts
  - props.ts
  - viewMode.ts
- utils (1)
  - frameFactory.ts
- v0 (35)
  - api (1)
    - v0Moments.ts
  - components (7)
    - FooterTrail.tsx
    - Margin.tsx
    - cover-frame.tsx
    - cover-lens.tsx
    - diagnostics-frame.tsx
    - kept-moments-frame.tsx
    - moment-frame.tsx
  - frames (17)
    - DesignFrame.test.tsx
    - DesignFrame.tsx
    - ThemeSwitcher.tsx
    - admin (1)
      - AdminFrame.tsx
    - agent (1)
      - AgentFrame.tsx
    - commons (1)
      - CommonsFrame.tsx
    - cover (1)
      - CoverBody.tsx
    - diagnostics (1)
      - DiagnosticsFrame.tsx
    - feed (1)
      - FeedFrame.tsx
    - index (1)
      - IndexFrame.tsx
    - journeys (1)
      - JourneysFrame.tsx
    - keepers (1)
      - KeepersFrame.tsx
    - moment (3)
      - KeptMomentsBody.tsx
      - MomentBody.tsx
      - MomentFeedbackRail.tsx
    - present (1)
      - PresentFrame.tsx
    - profile (1)
      - ProfileFrame.tsx
  - shell (3)
    - V0Shell.tsx
    - V0ShellContext.tsx
    - useExperienceMode.ts
  - stores (1)
    - trailStore.ts
  - styles (4)
    - StyleOverrideProvider.tsx
    - StyleScope.tsx
    - styleRegistry.ts
    - styles.ts
  - themes (2)
    - themeRegistry.ts
    - themeResolver.ts
- worlds (4)
  - presentation (1)
    - NarrativeFrameRenderer.tsx
  - shared (2)
    - BoardRenderer.tsx
    - patternUtils.ts
  - workshop (1)
    - StructuralFrameRenderer.tsx

## `apps/api/src` (151 files)
- health.ts
- index.ts
- api (55)
  - admin.ts
  - agents.ts
  - boards.ts
  - debug-db.ts
  - debug.ts
  - domains.management.ts
  - domains.ts
  - journeys.ts
  - keeper-types.ts
  - people.ts
  - production/routes.ts
  - sharing/cross-domain-routes.ts
  - admin (7)
    - diagnostics.ts
    - domains.ts
    - inspect.ts
    - query.ts
    - repair.ts
    - roles.ts
    - tenant-scan.ts
    - users.ts
  - agents (7)
    - _activity-util.ts
    - activity.ts
    - drafts.ts
    - events.ts
    - memory.ts
    - tasks.ts
    - topics.ts
  - board-data (1)
    - dev.ts
  - domains (5)
    - board-data.ts
    - contact.ts
    - custom-domain-routes.ts
    - kip-drafts.ts
    - routes.ts
  - engagement (2)
    - execute.ts
    - templates.ts
  - entities (1)
    - routes.ts
  - journey (1)
    - domain-integrated-routes.ts
  - keeper (7)
    - domain-integrated-routes.ts
    - keepers.ts
    - routes.ts
    - sole-echo-writer.ts
    - sole-identity-logbook.ts
    - sole-memory-cards.ts
    - sole-reflections.ts
    - sole-voice-panel.ts
  - kip (5)
    - actions/schema.ts
    - agents.ts
    - lenses.ts
    - mode-config.ts
    - platform-keys.ts
    - user-keys.ts
  - memory (1)
    - sole-memory-routes.ts
  - moment (1)
    - domain-integrated-routes.ts
  - path (1)
    - domain-integrated-routes.ts
  - uploads (1)
    - routes.ts
- kam (9)
  - auth-routes.ts
  - auth.ts
  - middleware.ts
  - permissions.ts
  - routes.auth.test.ts
  - routes.ts
  - session.ts
  - lib (2)
    - kamKeyLoader.test.ts
    - kamKeyLoader.ts
- lib (6)
  - audit/domainAudit.ts
  - db-guards.ts
  - env.ts
  - redis.ts
  - errors (2)
    - DomainError.test.ts
    - DomainError.ts
- mcp (9)
  - auth.ts
  - core.ts
  - cors.ts
  - id.ts
  - index.ts
  - jsonRpc.ts
  - log.ts
  - mcp.test.ts
  - tools.ts
- middleware (19)
  - auth-combined.ts
  - auth.ts
  - authMiddleware.ts
  - domainPermissionMiddleware.ts
  - domainResolutionMiddleware.ts
  - dynamicCorsMiddleware.ts
  - idempotency.ts
  - logRequestMiddleware.ts
  - memoryAccessMiddleware.ts
  - platformRoleMiddleware.ts
  - validationMiddleware.ts
  - domain (7)
    - index.ts
    - pipeline.ts
    - requireAuth.ts
    - requireDomainPermission.ts
    - requireDomainPermissions.ts
    - requireMemoryAccess.ts
    - resolveDomainContext.ts
    - utils.ts
- policy (2)
  - domainPolicyService.ts
  - policyPack.ts
- routes (4)
  - boards.schemas.ts
  - boards.ts
  - frames.ts
  - v0/moments.ts
- services (15)
  - EngagementTemplateExecutor.ts
  - KipAgentPermissionService.ts
  - KipUserKeyService.ts
  - ModelProviderService.ts
  - PlatformApiKeyService.ts
  - SoleMemoryService.ts
  - VercelDomainManagerService.ts
  - ensureDomainManagementBoard.ts
  - boards (3)
    - BoardsService.ts
    - boardResolver.ts
    - domainManagement.ts
  - kip (4)
    - buildKipEnvironmentContext.ts
    - mockAgents.ts
    - modeConfig.ts
    - resolveAgentEnvironment.ts
- startup (1)
  - migrate.ts
- tests (10)
  - board-alias-compat.test.ts
  - board-data-auth.test.ts
  - board-data-dev.test.ts
  - debug-req-logs.test.ts
  - ensure-dmb-idempotent.test.ts
  - ensureDomainManagementBoard.test.ts
  - kam-parity.test.ts
  - kip-action-execution-guard.test.ts
  - smoke (2)
    - basic.test.ts
    - production.test.ts
- __tests__ (9)
  - domain-permission-integration.test.ts
  - kam-cors.test.ts
  - kam-readonly.test.ts
  - mvp-cors-domains.test.ts
  - mvp-domain-fallback.test.ts
  - sprint4-integration.test.ts
  - sprint5-memory-isolation.test.ts
  - sprint6-cross-domain-sharing.test.ts
  - sprint7-production-readiness.test.ts
- types (3)
  - design-boards.ts
  - express.d.ts
  - pipeline.ts
- utils (6)
  - LogStore.js
  - LogStore.ts
  - audit.ts
  - domain.test.ts
  - domain.ts
  - requestLog.ts

## `apps/proxy/src` (8 files)
- db.ts
- http.ts
- index.ts
- mcpProxy.test.ts
- mcpProxy.ts
- middleware (3)
  - auth.ts
  - cors.ts
  - ratelimit.ts

## `packages/database/src` (76 files)
- index.ts
- index.js
- index.d.ts
- migrations (1)
  - domainMigrationHelpers.ts
- queries (3)
  - index.ts
  - index.js
  - index.d.ts
- system-boards (1)
  - index.ts
- test-fixtures (1)
  - domainFixtures.ts
- types (9)
  - domain.ts
  - domain.js
  - domain.d.ts
  - ssl.ts
  - ssl.js
  - ssl.d.ts
  - types.ts
  - types.js
  - types.d.ts
- services (52)
  - CrossDomainSharingService.ts
  - CrossDomainSharingService.js
  - CrossDomainSharingService.d.ts
  - DeploymentAutomationService.ts
  - DeploymentAutomationService.js
  - DeploymentAutomationService.d.ts
  - DomainCacheService.ts
  - DomainCacheService.js
  - DomainCacheService.d.ts
  - DomainContextService.ts
  - DomainContextService.js
  - DomainContextService.d.ts
  - DomainContextService.test.ts
  - DomainHealthMonitoringService.ts
  - DomainHealthMonitoringService.js
  - DomainHealthMonitoringService.d.ts
  - DomainPermissionService.ts
  - DomainPermissionService.js
  - DomainPermissionService.d.ts
  - DomainResolutionService.ts
  - DomainResolutionService.js
  - DomainResolutionService.d.ts
  - DomainService.ts
  - DomainService.js
  - DomainService.d.ts
  - DomainServiceFactory.ts
  - FeatureFlagService.ts
  - FeatureFlagService.js
  - FeatureFlagService.d.ts
  - MemoryMigrationService.ts
  - MemoryMigrationService.js
  - MemoryMigrationService.d.ts
  - MonitoringService.ts
  - MonitoringService.js
  - MonitoringService.d.ts
  - ProductionConfigService.ts
  - ProductionConfigService.js
  - ProductionConfigService.d.ts
  - ShareWorkflowAutomationService.ts
  - ShareWorkflowAutomationService.js
  - ShareWorkflowAutomationService.d.ts
  - SlugValidationService.ts
  - SlugValidationService.js
  - SlugValidationService.d.ts
  - SoleMemoryIsolationService.ts
  - SoleMemoryIsolationService.js
  - SoleMemoryIsolationService.d.ts
  - SslCertificateService.ts
  - SslCertificateService.js
  - SslCertificateService.d.ts
  - __tests__ (2)
    - FeatureFlagService.test.ts
    - SlugValidationService.test.ts
- factories (3)
  - DomainServiceFactory.ts
  - DomainServiceFactory.js
  - DomainServiceFactory.d.ts

## `packages/shared/src` (8 files)
- canonicalBoards.ts
- index.ts
- index.js
- index.d.ts
- logger.ts
- logger.js
- logger.d.ts
- roles.ts

## `packages/kam/src` (60 files)
- index.ts
- index.js
- index.d.ts
- api (6)
  - index.ts
  - index.js
  - types.ts
  - types.js
  - types.d.ts
  - auth/api/index.ts
  - auth/api/index.js
- auth (18)
  - domainAuth.ts
  - domainAuth.test.ts
  - index.ts
  - index.js
  - index.d.ts
  - login.ts
  - login.js
  - login.d.ts
  - logout.ts
  - logout.js
  - logout.d.ts
  - register.ts
  - register.js
  - register.d.ts
  - session.ts
  - session.js
  - session.d.ts
  - types.ts
  - types.js
  - types.d.ts
  - hooks (4)
    - index.ts
    - index.js
    - types.ts
    - types.js
- hooks (3)
  - index.ts
  - index.js
  - types.ts
  - types.js
  - types.d.ts
- lib (4)
  - index.ts
  - index.js
  - types.ts
  - types.js
- settings (9)
  - getSettings.ts
  - getSettings.js
  - getSettings.d.ts
  - index.ts
  - index.js
  - index.d.ts
  - types.ts
  - types.js
  - types.d.ts
  - updateSettings.ts
  - updateSettings.js
  - updateSettings.d.ts
- types (5)
  - index.ts
  - index.js
  - index.d.ts
  - types.ts
  - types.js

---

# 4. KEY SOURCE FILES INVENTORY

## Authentication
- `apps/api/src/kam/auth.ts` - HttpOnly cookie-based authentication endpoints (login/logout).
- `apps/api/src/index.ts` - Inline auth handlers (login/register/logout) for KAM.
- `packages/kam/src/auth/login.ts` - Login handler and validation logic.
- `packages/kam/src/auth/register.ts` - User registration logic.
- `packages/kam/src/auth/session.ts` - Session management.
- `packages/kam/src/auth/types.ts` - Auth types and schemas.
- `apps/web/src/context/AuthContext.tsx` - Frontend auth context.
- `apps/web/src/components/AuthForm.tsx` - Login/register UI.
- `apps/api/src/middleware/authMiddleware.ts` - API auth middleware.

## Moments System
- `apps/api/src/api/moment/domain-integrated-routes.ts` - Domain-scoped moment CRUD routes.
- `apps/api/src/routes/v0/moments.ts` - V0 moment routes (drafts, keep).
- `apps/api/src/api/journey/domain-integrated-routes.ts` - Journey endpoint that adds moments.
- `apps/web/src/v0/components/moment-frame.tsx` - Moment editing frame wrapper.
- `apps/web/src/v0/frames/moment/MomentBody.tsx` - Moment editor body.
- `apps/web/src/v0/frames/moment/KeptMomentsBody.tsx` - Kept moments display.
- `apps/web/src/v0/api/v0Moments.ts` - Frontend moment API client.
- `apps/web/src/components/frames/moment-grid-frame.tsx` - Moment grid UI.
- `packages/database/prisma/schema.prisma` - `Moment` model.

## Journey / Keeper / Domain System
- `apps/api/src/api/domains/routes.ts` - Domain CRUD + permissions + agent execute.
- `apps/api/src/api/domains/custom-domain-routes.ts` - Custom domain management.
- `apps/api/src/api/domains/board-data.ts` - Domain board data endpoints.
- `apps/api/src/api/journey/domain-integrated-routes.ts` - Journey CRUD with domain permissions.
- `apps/api/src/api/journeys.ts` - Legacy journey routes.
- `apps/api/src/api/keeper/domain-integrated-routes.ts` - Keeper CRUD + journey/moment list.
- `apps/api/src/api/path/domain-integrated-routes.ts` - Path CRUD.
- `apps/api/src/api/keeper/sole-*.ts` - SOLE memory endpoints tied to Keeper.
- `packages/database/prisma/schema.prisma` - `Domain`, `Keeper`, `Journey`, `Path` models.

## AI Integration (Kip)
- `apps/api/src/api/kip/agents.ts` - Agent execution + listing.
- `apps/api/src/services/kip/buildKipEnvironmentContext.ts` - Build agent environment context.
- `apps/api/src/services/kip/resolveAgentEnvironment.ts` - Resolve agent env for execution.
- `apps/api/src/api/kip/mode-config.ts` - Agent mode config endpoints.
- `apps/api/src/api/kip/lenses.ts` - Lenses endpoints.
- `apps/api/src/api/kip/platform-keys.ts` - Platform API keys.
- `apps/api/src/api/kip/user-keys.ts` - User API keys.
- `apps/web/src/lib/kipApi.ts` - Frontend Kip API client.
- `apps/web/src/pages/kip/KipAgentBoardPage.tsx` - Kip UI.

### Engagement Executor
- `apps/api/src/services/EngagementTemplateExecutor.ts` - Execute engagement templates.
- `apps/api/src/api/engagement/execute.ts` - Execute engagement template (API).
- `apps/api/src/api/engagement/templates.ts` - Fetch engagement templates.

## UI Shell / Navigation
- `apps/web/src/layouts/AppLayout.tsx` - Main app shell.
- `apps/web/src/components/layout/Navbar.tsx` - Top navigation.
- `apps/web/src/components/layout/Sidebar.tsx` - Side navigation.
- `apps/web/src/App.tsx` - Main routing.
- `apps/web/src/v0/shell/V0Shell.tsx` - V0 shell container.
- `apps/web/src/v0/shell/V0ShellContext.tsx` - V0 shell context.
- `apps/web/src/v0/shell/useExperienceMode.ts` - Experience mode routing logic.
- `apps/web/src/v0/frames/cover/CoverBody.tsx` - Cover frame.
- `apps/web/src/v0/frames/commons/CommonsFrame.tsx` - Commons frame.
- `apps/web/src/components/frames/FrameRenderer.tsx` - Frame rendering hub.

## SOLE Memory (matches for "SOLE", "sole", "memory protocol")
Files containing the terms (full list):
- `apps/web/src/v0/frames/commons/CommonsFrame.tsx`
- `apps/web/src/v0/frames/DesignFrame.tsx`
- `docs/modules/packages_database_prisma_seeds.md`
- `packages/database/prisma/seeds/README.md`
- `packages/database/prisma/seed.ts`
- `packages/database/prisma/seeds/default-domain-journeys.seed.ts`
- `apps/api/src/api/path/domain-integrated-routes.ts`
- `docs/modules/apps_api_src.md`
- `apps/api/src/README.md`
- `packages/database/prisma/seeds/journey-path-moment-engagement-templates.seed.ts`
- `apps/api/src/api/engagement/execute.ts`
- `apps/api/src/services/EngagementTemplateExecutor.ts`
- `apps/api/src/index.ts`
- `apps/api/src/api/moment/domain-integrated-routes.ts`
- `docs/modules/pages_kip.md`
- `apps/web/src/pages/kip/README.md`
- `apps/web/src/v0/frames/cover/CoverBody.tsx`
- `apps/web/src/App.tsx`
- `apps/web/src/pages/d/DomainAdminPage.tsx`
- `apps/web/src/pages/kip/KipAgentBoardPage.tsx`
- `docs/modules/apps_web_src_components_layout.md`
- `apps/web/src/components/layout/README.md`
- `apps/web/src/components/layout/UserIdentityDropdown.tsx`
- `apps/web/src/pages/d/PublicDomainPage.tsx`
- `apps/web/src/components/AuthForm.tsx`
- `apps/web/src/v0/components/cover-frame.tsx`
- `apps/web/src/pages/settings/SettingsPage.tsx`
- `apps/web/src/components/domain-manager/DomainDetailForm.tsx`
- `apps/web/src/context/AuthContext.tsx`
- `apps/web/src/v0/frames/index/IndexFrame.tsx`
- `apps/web/src/vite.config.ts`
- `apps/web/src/v0/frames/moment/MomentBody.tsx`
- `apps/web/src/v0/components/diagnostics-frame.tsx`
- `apps/web/src/v0/components/moment-frame.tsx`
- `apps/api/src/api/domains/routes.ts`
- `docs/blueprints/keeper-re-center-blueprint.md`
- `apps/api/src/middleware/dynamicCorsMiddleware.ts`
- `apps/web/src/v0/api/v0Moments.ts`
- `apps/api/src/routes/v0/moments.ts`
- `packages/database/src/migrations/domainMigrationHelpers.ts`
- `packages/database/prisma/schema.prisma`
- `apps/api/src/api/journeys.ts`
- `apps/web/src/v0/frames/moment/KeptMomentsBody.tsx`
- `docs/modules/keeper-platform.md`
- `README.md`
- `docs/modules/database.md`
- `packages/database/README.md`
- `apps/api/src/middleware/memoryAccessMiddleware.ts`
- `scripts/dev-with-url.js`
- `apps/api/src/services/kip/resolveAgentEnvironment.ts`
- `apps/api/src/services/kip/buildKipEnvironmentContext.ts`
- `apps/api/src/middleware/domain/pipeline.ts`
- `apps/api/src/api/domains/board-data.ts`
- `apps/api/src/api/admin/domains.ts`
- `apps/api/src/api/domains/custom-domain-routes.ts`
- `apps/api/src/middleware/domainResolutionMiddleware.ts`
- `apps/api/src/middleware/domainPermissionMiddleware.ts`
- `apps/web/src/main.tsx`
- `apps/web/src/components/ErrorBoundary.tsx`
- `apps/web/src/v0/styles/StyleScope.tsx`
- `apps/web/src/v0/themes/themeResolver.ts`
- `apps/api/src/api/debug.ts`
- `apps/web/src/lib/themeApi.ts`
- `packages/database/prisma/seeds/themes.seed.ts`
- `apps/web/src/pages/studio/board-studio-page.tsx`
- `apps/web/src/components/frames/FrameRenderer.tsx`
- `apps/web/src/context/ThemeContext.tsx`
- `packages/kam/src/auth/domainAuth.ts`
- `apps/web/src/components/domain/DomainBoardRenderer.tsx`
- `apps/web/src/lib/kipApi.ts`
- `apps/api/src/api/kip/agents.ts`
- `apps/api/src/api/domains/kip-drafts.ts`
- `docs/modules/shared.md`
- `docs/modules/packages_shared_src.md`
- `packages/shared/src/README.md`
- `packages/shared/README.md`
- `apps/api/src/kam/session.ts`
- `apps/api/src/services/ModelProviderService.ts`
- `packages/database/prisma/seeds/system-boards.seed.ts`
- `apps/api/src/policy/domainPolicyService.ts`
- `apps/web/src/pages/kip/SessionEditModal.tsx`
- `apps/api/src/api/kip/mode-config.ts`
- `apps/api/src/api/kip/lenses.ts`
- `packages/database/prisma/seeds/lenses.seed.ts`
- `docs/modules/boot.md`
- `apps/web/src/boot/README.md`
- `apps/web/src/boot/fetch-shim.ts`
- `apps/api/src/api/keeper/domain-integrated-routes.ts`
- `apps/web/src/pages/d/DomainKeepersPage.tsx`
- `apps/web/src/pages/d/DomainJourneysPage.tsx`
- `apps/web/src/pages/d/DomainFeedPage.tsx`
- `apps/web/src/pages/d/DomainAgentPage.tsx`
- `apps/web/src/types/README.md`
- `apps/web/src/components/domain/PropRenderer.tsx`
- `docs/modules/apps_web_src_types.md`
- `apps/web/src/lib/apiFetch.ts`
- `apps/web/src/pages/d/DomainProfilePage.tsx`
- `tools/eslint-config/README.md`
- `tools/eslint-config/node.js`
- `tools/eslint-config/index.js`
- `tools/diag/verify-dmb-mounts.ts`
- `tools/diag/verify-board-data-mounts.ts`
- `tools/diag/find-context-reads.ts`
- `tools/diag/boards-domains-report.ts`
- `scripts/test-domain-api.js`
- `scripts/set-primary-domain.js`
- `scripts/sanitize-boards.ts`
- `scripts/create-user-domain.js`
- `scripts/check-domain.js`
- `scripts/check-user-roles.js`
- `scripts/check-domains.js`
- `scripts/check-database-types.js`
- `readme2.md`
- `packages/shared/src/logger.ts`
- `packages/shared/src/logger.js`
- `parse-tsc-output.js`
- `packages/kam/temp/session.js`
- `packages/kam/temp/register.js`
- `packages/kam/src/settings/updateSettings.ts`
- `packages/kam/src/settings/updateSettings.js`
- `packages/kam/src/auth/session.ts`
- `packages/kam/src/auth/session.js`
- `packages/kam/src/auth/register.ts`
- `packages/kam/src/auth/register.js`
- `packages/kam/src/auth/login.ts`
- `packages/kam/src/auth/login.js`
- `packages/database/test-data/domain-fixtures.sql`
- `packages/database/src/services/__tests__/FeatureFlagService.test.ts`
- `packages/database/src/services/SslCertificateService.ts`
- `packages/database/src/services/SslCertificateService.js`
- `packages/database/src/services/SoleMemoryIsolationService.ts`
- `packages/database/src/services/SoleMemoryIsolationService.js`
- `packages/database/src/services/SoleMemoryIsolationService.d.ts`
- `packages/database/src/services/SlugValidationService.ts`
- `packages/database/src/services/SlugValidationService.js`
- `packages/database/src/services/ShareWorkflowAutomationService.ts`
- `packages/database/src/services/ShareWorkflowAutomationService.js`
- `packages/database/src/services/ProductionConfigService.ts`
- `packages/database/src/services/ProductionConfigService.js`
- `packages/database/src/services/ProductionConfigService.d.ts`
- `packages/database/src/services/MonitoringService.ts`
- `packages/database/src/services/MonitoringService.js`
- `packages/database/src/services/FeatureFlagService.ts`
- `packages/database/src/services/MemoryMigrationService.ts`
- `packages/database/src/services/MemoryMigrationService.js`
- `packages/database/src/services/FeatureFlagService.js`
- `packages/database/src/services/CrossDomainSharingService.ts`
- `packages/database/src/services/CrossDomainSharingService.js`
- `packages/database/src/services/DomainService.js`
- `packages/database/src/services/DomainResolutionService.js`
- `packages/database/src/services/DomainVerificationService.ts`
- `packages/database/src/services/DomainContextService.test.ts`
- `packages/database/src/services/DomainVerificationService.js`
- `packages/database/src/services/DomainResolutionService.ts`
- `packages/database/src/services/DomainHealthMonitoringService.ts`
- `packages/database/src/services/DomainHealthMonitoringService.js`
- `packages/database/src/services/DomainCacheService.ts`
- `packages/database/src/services/DomainService.ts`
- `packages/database/src/services/DomainCacheService.js`
- `packages/database/src/factories/README.md`
- `packages/database/scripts/check-board-data.js`
- `packages/database/scripts/resolve-failed-migration.js`
- `packages/database/scripts/check-table-structure.js`
- `packages/database/scripts/check-migrations.js`
- `packages/database/prisma/scripts/add-manifesto-frame.ts`
- `packages/database/prisma/scripts/update-frame-visibility.ts`
- `packages/database/prisma/scripts/set-domain-cover-image.ts`
- `packages/database/prisma/seeds/seed-ai-keeper-sole.js`
- `packages/database/prisma/seeds/roles.seed.ts`
- `packages/database/prisma/seeds/domain-engagement-templates.seed.ts`
- `packages/database/prisma/seeds/domain-board-engagement-templates.seed.ts`
- `packages/database/prisma/seeds/design-boards.seed.ts`
- `packages/database/prisma/seeds/ai-keeper-sole.sql`
- `packages/database/prisma/seeds/kip-sessions.sql`
- `packages/database/migrations/001_add_domains_to_existing_data.sql`
- `find-empty-interfaces.js`
- `docs/modules/mcp.md`
- `docs/modules/database/factories.md`
- `docs/modules/api/utils.md`
- `docs/modules/api/src.md`
- `docs/debug/visual-summary.md`
- `docs/debug/data-flow-map.md`
- `docs/debug/README.md`
- `docs/debug/inventory.md`
- `docs/debug/PART1_COMPLETION_SUMMARY.md`
- `docs/debug/INDEX.md`
- `docs/VERCEL_PREVIEW_SETUP.md`
- `docs/SPRINT_5_COMPLETION.md`
- `docs/SPRINT_1_COMPLETION.md`
- `docs/PHANTOM_LOGIN_FIX_COMPLETE.md`
- `docs/LOGOUT_IMPLEMENTATION.md`
- `docs/DOMAIN_DEVELOPMENT_PLAN.md`
- `docs/COOKIE_AUTH_QUICKSTART.md`
- `docs/COOKIE_SESSIONS_IMPLEMENTATION.md`
- `docs/DOMAIN_LAYER_README.md`
- `docs/AUTH_FIX_QUICKSTART.md`
- `docs/AUTHENTICATION_HARDENING.md`
- `apps/web/src/types/keeper.ts`
- `apps/web/src/props/token/TokenPlaceholder.tsx`
- `apps/web/src/pages/studio/people-board-page.tsx`
- `apps/web/src/pages/studio/MemoryPatternsPage.tsx`
- `apps/web/src/pages/studio/kip/PlatformApiKeyManagerPage.tsx`
- `apps/web/src/pages/studio/kip/AgentsPage.tsx`
- `apps/web/src/pages/studio/kip/AgentLogsPage.tsx`
- `apps/web/src/pages/studio/kip/AgentBuilderForm.tsx`
- `apps/web/src/pages/studio/keeper-type-board-page.tsx`
- `apps/web/src/pages/studio/journey-board-page.tsx`
- `apps/web/src/pages/studio/domain/DomainWorkshopPage.tsx`
- `apps/web/src/pages/studio/domain/DomainBoardStudioPage.tsx`
- `apps/web/src/pages/studio/KipStudioPage.tsx`
- `apps/web/src/pages/studio/DomainBoardPage.tsx`
- `apps/web/src/pages/studio/AgentBoardPage.tsx`
- `apps/web/src/pages/settings/UserApiKeyManagerPage.tsx`
- `apps/web/src/pages/keeper/SelectedKeeperMetadataPage.tsx`
- `apps/web/src/pages/keeper/ReflectionJournalPage.tsx`
- `apps/web/src/pages/keeper/README.md`
- `apps/web/src/pages/keeper/KeeperTypesPage.tsx`
- `apps/web/src/pages/keeper/KeeperMemoryPage.tsx`
- `apps/web/src/pages/keeper/KeeperManagePage.tsx`
- `apps/web/src/lib/keeperApi.ts`
- `apps/web/src/lib/diagnostics.ts`
- `apps/web/src/pages/UserApiKeyManagerPage.tsx`
- `apps/web/src/pages/LibraryPage.tsx`
- `apps/web/src/pages/LeadAgentPage.tsx`
- `apps/web/src/pages/BoardDemoPage.tsx`
- `apps/web/src/pages/admin/UserManagementPage.tsx`
- `apps/web/src/pages/admin/RolesPage.tsx`
- `apps/web/src/pages/keeper/DomainDashboardPage.tsx`
- `apps/web/src/pages/keeper/CreateKeeperPage.tsx`
- `apps/web/src/pages/keeper/AllKeepersPage.tsx`
- `apps/web/src/pages/keeper/EngagementTemplatesPage.tsx`
- `apps/web/src/pages/FrameSystemDemoPage.tsx`
- `apps/web/src/hooks/useAutosave.ts`
- `apps/web/src/features/board-studio/v0/context/BoardStudioContext.tsx`
- `apps/web/src/features/board-studio/v0/components/FrameConfigPanel.tsx`
- `apps/web/src/features/board-studio/v0/BoardStudio.tsx`
- `apps/web/src/features/board-studio/settings/SettingsRenderer.tsx`
- `apps/web/src/context/FrameContext.tsx`
- `apps/web/src/context/BoardDataContext.tsx`
- `apps/web/src/context/BoardContext.tsx`
- `apps/web/src/components/ui/ApiKeyForm.tsx`
- `apps/web/src/components/studio/MediaUploader.tsx`
- `apps/web/src/components/studio/DraggableTabs.tsx`
- `apps/web/src/components/studio/AIAssistPanel.tsx`
- `apps/web/src/components/studio/AgentKeeperTypeAssignment.tsx`
- `apps/web/src/components/props/renderers/ActionUpload.tsx`
- `apps/web/src/components/props/renderers/ActionToggle.tsx`
- `apps/web/src/components/props/renderers/ActionForm.tsx`
- `apps/web/src/features/board-studio/patterns/PatternRenderer.tsx`
- `apps/web/src/features/board-studio/components/FrameConfigPanel.tsx`
- `apps/web/src/docs/modules/studio.md`
- `apps/web/src/components/props/renderers/ActionButton.tsx`
- `apps/web/src/components/props/PropManager.tsx`
- `apps/web/src/components/props/PropDropZone.tsx`
- `apps/web/src/components/props/FormProp.tsx`
- `apps/web/src/components/props/ActionPropRenderer.tsx`
- `apps/web/src/components/props/ActionButtonProp.tsx`
- `apps/web/src/components/keeper/SoleArchitectureTab.tsx`
- `apps/web/src/components/frames/TopicsFrame.tsx`
- `apps/web/src/components/frames/ProcessFrame.tsx`
- `apps/web/src/components/frames/DraftFrame.tsx`
- `apps/web/src/components/frames/activity-feed-frame.tsx`
- `apps/web/src/components/frames/DialogFrame.tsx`
- `apps/web/src/components/frames/CustomDomainFrame.tsx`
- `apps/web/src/components/frames/CodeSnippetFrame.tsx`
- `apps/web/src/components/engagement/ReflectionJournal.tsx`
- `apps/web/src/components/engagement/EngagementButton.tsx`
- `apps/web/src/components/domain-manager/MembersPanel.tsx`
- `apps/web/src/components/domain-manager/DomainManager.tsx`
- `apps/web/src/components/domain-manager/DomainListPane.tsx`
- `apps/web/src/components/domain-manager/DomainDetailCard.tsx`
- `apps/web/src/components/domain-manager/DnsInfoPanel.tsx`
- `apps/web/src/boards/people-board.tsx`
- `apps/web/src/boards/keeper-type-board.tsx`
- `apps/web/src/boards/journey-board.tsx`
- `apps/web/src/boards/journey-board/README.md`
- `apps/web/src/components/DebugButton.tsx`
- `apps/web/src/boards/domain-board/README.md`
- `apps/web/src/app-old.tsx`
- `apps/web/docs/board-first-phase1.1a.md`
- `apps/web/src/boards/domain-board.tsx`
- `apps/web/src/boards/components/FramePicker.tsx`
- `apps/web/src/boards/components/BoardToolbar.tsx`
- `apps/web/src/boards/AgentBoard.tsx`
- `apps/web/src/auth/handleAuthError.ts`
- `apps/web/src/auth/ensureSession.ts`
- `apps/web/src/auth/AuthGate.tsx`
- `apps/proxy/src/middleware/auth.ts`
- `apps/proxy/src/mcpProxy.ts`
- `apps/proxy/src/index.ts`
- `apps/proxy/PROPERTIES_SHAPE_FIX.md`
- `apps/api/src/utils/domain.test.ts`
- `apps/api/src/utils/audit.ts`
- `apps/api/src/utils/README.md`
- `apps/api/src/startup/migrate.ts`
- `apps/api/src/services/VercelDomainManagerService.ts`
- `apps/api/src/services/SoleMemoryService.ts`
- `apps/api/src/services/PlatformApiKeyService.ts`
- `apps/api/src/services/KipUserKeyService.ts`
- `apps/api/src/services/KipAgentPermissionService.ts`
- `apps/api/src/routes/frames.ts`
- `apps/api/src/routes/boards.ts`
- `apps/api/src/middleware/logRequestMiddleware.ts`
- `apps/api/src/middleware/idempotency.ts`
- `apps/api/src/middleware/domain/requireDomainPermission.ts`
- `apps/api/src/middleware/domain/requireAuth.ts`
- `apps/api/src/middleware/domain/resolveDomainContext.ts`
- `apps/api/src/middleware/domain/requireMemoryAccess.ts`
- `apps/api/src/middleware/domain/requireDomainPermissions.ts`
- `apps/api/src/middleware/authMiddleware.ts`
- `apps/api/src/middleware/auth-combined.ts`
- `apps/api/src/mcp/jsonRpc.ts`
- `apps/api/src/mcp/log.ts`
- `apps/api/src/lib/redis.ts`
- `apps/api/src/mcp/cors.ts`
- `apps/api/src/mcp/README.md`
- `apps/api/src/lib/errors/DomainError.test.ts`
- `apps/api/src/lib/audit/domainAudit.ts`
- `apps/api/src/kam/middleware.ts`
- `apps/api/src/kam/auth.ts`
- `apps/api/src/api/uploads/routes.ts`
- `apps/api/src/api/sharing/cross-domain-routes.ts`
- `apps/api/src/api/production/routes.ts`
- `apps/api/src/api/people.ts`
- `apps/api/src/api/memory/sole-memory-routes.ts`
- `apps/api/src/api/kip/user-keys.ts`
- `apps/api/src/api/kip/platform-keys.ts`
- `apps/api/src/api/keeper-types.ts`
- `apps/api/src/api/keeper/sole-voice-panel.ts`
- `apps/api/src/api/keeper/sole-reflections.ts`
- `apps/api/src/api/keeper/sole-memory-cards.ts`
- `apps/api/src/api/keeper/sole-identity-logbook.ts`
- `apps/api/src/api/keeper/sole-echo-writer.ts`
- `apps/api/src/api/keeper/routes.ts`

## Media Stories (matches for "media", "story", "stories")
Full list of files with term matches:
- `docs/modules/apps_web_src_v0_frames.md`
- `apps/web/src/v0/frames/README.md`
- `apps/web/src/v0/frames/commons/CommonsFrame.tsx`
- `docs/keeper-ui-experience.md`
- `packages/database/prisma/seeds/default-domain-journeys.seed.ts`
- `packages/database/prisma/seeds/journey-path-moment-engagement-templates.seed.ts`
- `apps/api/src/index.ts`
- `docs/modules/apps_web_src_v0_frames_present.md`
- `apps/web/src/v0/frames/present/README.md`
- `apps/web/src/v0/frames/present/PresentFrame.tsx`
- `docs/keeper-heart-mind.md`
- `docs/modules/pages_kip.md`
- `apps/web/src/pages/kip/README.md`
- `docs/modules/apps_web_src_v0_components.md`
- `apps/web/src/v0/components/README.md`
- `apps/web/src/v0/frames/cover/CoverBody.tsx`
- `apps/web/src/v0/shell/useExperienceMode.ts`
- `apps/web/src/pages/kip/KipAgentBoardPage.tsx`
- `apps/web/src/pages/d/PublicDomainPage.tsx`
- `docs/modules/domain-manager.md`
- `apps/web/src/components/domain-manager/README.md`
- `apps/web/src/v0/frames/index/IndexFrame.tsx`
- `docs/BOARD_COVER_AUDIT.md`
- `apps/web/src/v0/frames/moment/MomentBody.tsx`
- `docs/modules/apps_web_src_v0.md`
- `apps/web/src/v0/README.md`
- `docs/modules/apps_api_src_services_boards.md`
- `docs/modules/apps_api_src_api_domains.md`
- `apps/api/src/services/boards/README.md`
- `apps/api/src/api/domains/README.md`
- `apps/api/src/api/domains/routes.ts`
- `apps/api/src/services/boards/domainManagement.ts`
- `docs/blueprints/re-center-addendum-domain-boards-frames-feedback-canon.md`
- `packages/database/src/migrations/domainMigrationHelpers.ts`
- `packages/database/prisma/schema.prisma`
- `docs/modules/database.md`
- `packages/database/README.md`
- `apps/api/src/services/kip/buildKipEnvironmentContext.ts`
- `apps/api/src/api/domains/custom-domain-routes.ts`
- `apps/web/src/v0/themes/themeResolver.ts`
- `apps/web/src/pages/studio/board-studio-page.tsx`
- `docs/modules/frame-template-audit.md`
- `apps/web/src/components/frames/FrameRenderer.tsx`
- `apps/web/src/types/frame.ts`
- `apps/web/docs/frame-template-audit.md`
- `apps/web/src/context/ThemeContext.tsx`
- `apps/api/src/api/kip/agents.ts`
- `packages/database/src/index.ts`
- `packages/database/src/types.ts`
- `apps/web/src/components/props/README.md`
- `apps/web/src/components/domain/PropRenderer.tsx`
- `packages/database/src/system-boards/index.ts`
- `docs/modules/apps_web_src_components_props.md`
- `v0 Temp/boards-canvas/hooks/use-mobile.tsx`
- `v0 Temp/boards-canvas/components/ui/use-mobile.tsx`
- `v0 Temp/boards-canvas/app/page.tsx`
- `v0 Temp/boards-canvas/app/story/[id]/page.tsx`
- `v0 Temp/boards-canvas/app/series/page.tsx`
- `v0 Temp/boards-canvas/components/navigation.tsx`
- `reports/boards-domains-report.md`
- `readme2.md`
- `packages/kam/src/auth/login.js`
- `packages/kam/src/auth/login.ts`
- `packages/database/test-data/domain-fixtures.sql`
- `packages/database/src/test-fixtures/domainFixtures.ts`
- `packages/database/src/services/SslCertificateService.js`
- `packages/database/src/services/SslCertificateService.ts`
- `packages/database/src/services/SoleMemoryIsolationService.ts`
- `packages/database/src/services/SoleMemoryIsolationService.js`
- `packages/database/src/services/SlugValidationService.ts`
- `packages/database/src/services/SlugValidationService.js`
- `packages/database/src/services/ShareWorkflowAutomationService.js`
- `packages/database/src/services/ShareWorkflowAutomationService.ts`
- `packages/database/src/services/MonitoringService.js`
- `packages/database/src/services/MonitoringService.ts`
- `packages/database/src/services/DeploymentAutomationService.ts`
- `packages/database/src/services/DeploymentAutomationService.d.ts`
- `packages/database/src/services/DeploymentAutomationService.js`
- `packages/database/src/services/DomainHealthMonitoringService.d.ts`
- `packages/database/src/services/DomainHealthMonitoringService.js`
- `packages/database/src/services/DomainHealthMonitoringService.ts`
- `packages/database/prisma/seeds/board-seed-data.sql`
- `packages/database/prisma/seeds/design-boards.seed.ts`
- `packages/database/prisma/scripts/add-manifesto-frame.ts`
- `packages/database/prisma/migrations/_baseline_upgrade.sql`
- `packages/database/prisma/MODEL_REFERENCE.MD`
- `packages/database/migrations/005_add_board_system.sql`
- `packages/database/migrations/001_add_domains_to_existing_data.sql`
- `docs/modules/board-studio.md`
- `docs/debug/visual-summary.md`
- `docs/debug/README.md`
- `docs/debug/PART1_COMPLETION_SUMMARY.md`
- `docs/debug/INDEX.md`
- `docs/VERCEL_PREVIEW_SETUP.md`
- `docs/SPRINT_7_COMPLETION.md`
- `docs/SPRINT_5_COMPLETION.md`
- `docs/PREVIEW_AUTH_SUMMARY.md`
- `docs/PHANTOM_LOGIN_FIX_COMPLETE.md`
- `docs/SPRINT_0_COMPLETION.md`
- `docs/SPRINT_4_COMPLETION.md`
- `docs/SPRINT_3_COMPLETION.md`
- `docs/DOMAIN_DEVELOPMENT_PLAN.md`
- `docs/DOMAIN_LAYER_README.md`
- `docs/AUTHENTICATION_HARDENING.md`
- `apps/web/src/worlds/presentation/NarrativeFrameRenderer.tsx`
- `apps/web/src/types/keeper.ts`
- `apps/web/src/patterns/registry.tsx`
- `apps/web/src/pages/studio/kip/README.md`
- `apps/web/src/pages/studio/README.md`
- `apps/web/src/pages/studio/kip/AgentLogsPage.tsx`
- `apps/web/src/pages/LandingPage.tsx`
- `apps/web/src/pages/BoardDemoPage.tsx`
- `apps/web/src/pages/FrameSystemDemoPage.tsx`
- `apps/web/src/features/board-studio/v0/types.ts`
- `apps/web/src/features/board-studio/v0/patterns/registry.ts`
- `apps/web/src/features/board-studio/v0/context/BoardStudioContext.tsx`
- `apps/web/src/hooks/useAutosave.ts`
- `apps/web/src/features/board-studio/v0/components/FrameRenderer.tsx`
- `apps/web/src/features/board-studio/v0/BoardStudio.tsx`
- `apps/web/src/features/board-studio/types/unified-frame.ts`
- `apps/web/src/features/board-studio/types/frame-adapters.ts`
- `apps/web/src/features/board-studio/templates/index.ts`
- `apps/web/src/features/board-studio/settings/schema.ts`
- `apps/web/src/features/board-studio/README.md`
- `apps/web/src/features/board-studio/patterns/PatternRenderer.tsx`
- `apps/web/src/context/WorldModeContext.tsx`
- `apps/web/src/context/BoardContext.tsx`
- `apps/web/src/docs/modules/step13-model-integration.md`
- `apps/web/src/docs/modules/step12-memory-system.md`
- `apps/web/src/features/board-studio/STUDIO_PREVIEW_REFACTOR.md`
- `apps/web/src/components/studio/README.md`
- `apps/web/src/components/studio/MediaUploader.tsx`
- `apps/web/src/components/studio/AIAssistPanel.tsx`
- `apps/web/src/components/frames/collaboration-network-frame.tsx`
- `apps/web/src/components/frames/activity-feed-frame.tsx`
- `apps/web/src/components/frames/role-manager-frame.tsx`
- `apps/web/src/components/props/PropManager.tsx`
- `apps/web/src/components/props/PropDropZone.tsx`
- `apps/web/src/components/frames/README.md`
- `apps/web/src/components/props/editors/PropEditors.tsx`
- `apps/web/src/components/frames/path-list-frame.tsx`
- `apps/web/src/components/frames/moment-grid-frame.tsx`
- `apps/web/src/components/frames/MediaCardFrame.tsx`
- `apps/web/src/components/frames/linked-journeys-frame.tsx`
- `apps/web/src/components/frames/linked-agents-frame.tsx`
- `apps/web/src/components/frames/index.ts`
- `apps/web/src/components/frames/DraftFrame.tsx`
- `apps/web/src/components/frames/DialogFrame.tsx`
- `apps/web/src/components/engagement/EngagementButton.tsx`
- `apps/web/src/boards/templates/people.template.ts`
- `apps/web/src/boards/templates/journey.template.ts`
- `apps/web/src/boards/journey-board/README.md`
- `apps/web/src/boards/templates/domain.template.ts`
- `apps/web/src/boards/templates/agent.template.ts`
- `apps/web/src/boards/people-board.tsx`
- `apps/web/src/boards/keeper-type-board.tsx`
- `apps/web/src/boards/journey-board.tsx`
- `apps/web/src/ai/agentBridge.ts`
- `apps/api/src/types/design-boards.ts`
- `apps/api/src/tests/board-data-dev.test.ts`
- `apps/api/src/services/boards/BoardsService.ts`
- `apps/api/src/routes/README.md`
- `apps/api/src/routes/frames.ts`
- `apps/api/src/routes/boards.ts`
- `apps/api/src/lib/redis.ts`
- `apps/api/src/api/uploads/routes.ts`
- `apps/api/src/api/boards.ts`
- `apps/api/src/api/production/routes.ts`
- `apps/api/src/api/keeper-types.ts`
- `apps/api/src/api/agents/drafts.ts`
- `apps/api/src/__tests__/sprint7-production-readiness.test.ts`
- `apps/api/src/__tests__/domain-permission-integration.test.ts`
- `apps/api/src/api/agents.ts`
- `add_board_tables.sql`
- `UPLOAD_SAVE_FLOW_DEBUG.md`
- `UPLOAD_MIXED_CONTENT_FIX.md`
- `UPLOAD_413_FIX.md`
- `UPLOAD_COMPLETE_FIX.md`
- `TEMPLATE_LOADING_ANALYSIS.md`
- `PHASE_1_ROUTE_VALIDATION.md`
- `PHASE_2_COMPLETE.md`
- `PHASE_1_SUMMARY.md`
- `TEMPLATE_EDITING_ENABLED.md`
- `SESSION_SUMMARY_2025-11-01.md`
- `PATHWAYNAV_IMPLEMENTATION_COMPLETE.md`
- `PATHWAYNAV_ACCESSIBILITY.md`
- `PHASE_1_COMPLETE.md`
- `PATHWAY_RENDERING_FIX.md`
- `MCP_ACTIONS_FIX.md`
- `LIVE_DATA_INTEGRATION_SUMMARY.md`
- `KEEPER_PLAN_V2_ARCHITECTURAL_ANALYSIS.md`
- `INLINE_EDITING_SPEC.md`
- `INLINE_EDITING_IMPLEMENTATION.md`
- `FRAME_COUNT_FIX_SOLUTION.md`
- `IMAGE_UPLOAD_SETUP.md`
- `BOARD_STUDIO_PERSISTENCE_FIX.md`
- `DESIGN_BOARDS_DEPLOYMENT_SUMMARY.md`
- `BOARD_STUDIO_MIGRATION_PLAN.md`
- `BOARD_STUDIO_MERGE_README.md`
- `DESIGN_AGENT_CONTRACT.md`
- `BOARD_STUDIO_PROPS_FIX.md`
- `DESIGN_BOARD_QUICK_START.md`
- `BOARD_STUDIO_UX_OVERHAUL_COMPLETE.md`
- `DEPLOYMENT_STATUS.md`
- `DESIGN_BOARD_IMPLEMENTATION_SUMMARY.md`
- `DESIGN_BOARD_MIGRATION.md`
- `DESIGN_BOARD_DEPLOYMENT_NOTES.md`
- `DOMAIN_BOARD_MVP_IMPLEMENTATION_SUMMARY.md`
- `DEPLOYMENT_FIX_ROUND_2.md`
- `DOMAIN_BOARD_MANAGEMENT_IMPLEMENTATION.md`
- `DOMAIN_BOARD_FINAL_IMPLEMENTATION.md`
- `DOMAIN_DESIGN_BOARD_CANONICAL_SPEC.md`
- `DOMAIN_DESIGN_BOARD_SPEC.md`
- `DOMAIN_BOARD_MANAGEMENT_QUICKSTART.md`
- `DOMAIN_BOARD_RE_SEED_COMPLETE.md`
- `DOMAIN_DESIGN_BOARD_MVP_WALKTHROUGH.md`
- `DOMAIN_KEEPER_TYPE_ANALYSIS.md`
- `ENGAGEMENT_TEMPLATE_ADAPTER_IMPLEMENTATION.md`
- `ENGAGEMENT_TEMPLATES_QUICKSTART.md`
- `ENGAGEMENT_TEMPLATES_IMPLEMENTATION_COMPLETE.md`
- `FIX_DOMAIN_OWNERSHIP.md`
- `BOARD_STUDIO_AUTH_FIX.md`
- `BOARD_STUDIO_ACTUAL_FIX.md`
- `BOARD_STUDIO_COMPREHENSIVE_FIX.md`
- `AUTH_COOKIE_FIX_QUICK_ACTION.md`
- `AUTH_SESSION_COOKIE_ROOT_CAUSE_ANALYSIS.md`
- `AUTH_INVESTIGATION_COMPLETE.md`
- `AUTH_COOKIE_INVESTIGATION_SUMMARY.md`

---

# 5. API ROUTES AUDIT

Grouped by domain (Express):

## Authentication
- POST `/api/kam/auth/login` - User login with cookie session.
- POST `/api/kam/auth/register` - User registration.
- POST `/api/kam/auth/logout` - Logout and clear session.
- GET `/api/kam/me` - Current user profile.

## Domains
- GET `/api/domains/by-slug/:slug` - Public domain lookup.
- GET `/api/domains/my` - User domains.
- GET `/api/domains` - List domains (auth).
- POST `/api/domains` - Create domain.
- GET `/api/domains/:id` - Domain details.
- PUT `/api/domains/:id` - Update domain.
- PATCH `/api/domains/:id` - Partial update.
- DELETE `/api/domains/:id` - Delete domain.
- GET `/api/domains/:id/permissions` - Domain permissions.
- POST `/api/domains/:id/permissions` - Grant permissions.
- DELETE `/api/domains/:id/permissions/:userId` - Revoke permissions.
- POST `/api/domains/:domainId/agent/execute` - Execute domain agent.
- GET `/api/domains/:domainId/kip/agents` - List domain agents.
- GET `/api/domains/:domainId/management-board` - Domain management board.
- GET `/api/domains/:domainId/board-data` - Read board data.
- PUT `/api/domains/:domainId/board-data` - Update board data.

## Journeys
- GET `/api/journeys` - List journeys.
- POST `/api/journeys` - Create journey.
- GET `/api/journeys/:id` - Fetch journey.
- POST `/api/journeys/:id/moments` - Add moment to journey.

## Keepers
- GET `/api/keepers` - List keepers.
- POST `/api/keepers` - Create keeper.
- GET `/api/keepers/:id` - Fetch keeper.
- PUT `/api/keepers/:id` - Update keeper.
- DELETE `/api/keepers/:id` - Delete keeper.
- GET `/api/keepers/:id/journeys` - Keeper journeys.
- GET `/api/keepers/:id/moments` - Keeper moments.

## Moments
- GET `/api/moments` - List moments.
- POST `/api/moments` - Create moment.
- GET `/api/moments/:id` - Fetch moment.
- PUT `/api/moments/:id` - Update moment.
- DELETE `/api/moments/:id` - Delete moment.
- GET `/api/v0/moments` - V0 moments list.
- POST `/api/v0/moments/drafts` - Create draft moment.
- PATCH `/api/v0/moments/drafts/:id` - Update draft moment.
- POST `/api/v0/moments/:id/keep` - Keep a moment.

## Paths
- GET `/api/paths` - List paths.
- POST `/api/paths` - Create path.
- GET `/api/paths/:id` - Fetch path.
- PUT `/api/paths/:id` - Update path.
- DELETE `/api/paths/:id` - Delete path.

## Kip / AI
- POST `/api/kip/agents` - Run agent (action: run).
- GET `/api/kip/agents` - List agents.
- GET `/api/kip/agents/:agentId/mode-config` - Get mode config.
- PATCH `/api/kip/agents/:agentId/mode-config` - Update mode config.
- GET `/api/kip/lenses` - List lenses.
- POST `/api/kip/lenses` - Create lens.
- GET `/api/kip/platform-keys` - Platform keys list.
- POST `/api/kip/platform-keys` - Create platform key.
- GET `/api/kip/user-keys` - User keys list.
- POST `/api/kip/user-keys` - Set user key.
- DELETE `/api/kip/user-keys/:keyId` - Delete user key.

## Engagement
- POST `/api/engagement/execute` - Execute engagement template.
- GET `/api/engagement/templates/:slug` - Fetch template by slug.
- GET `/api/engagement/templates/type/:keeperTypeName` - Templates by type.

## SOLE Memory
- GET `/api/memory/:domainId/scope` - Fetch memory scope.
- POST `/api/memory/:domainId/query` - Query memory.
- POST `/api/memory/:domainId/insert` - Insert memory.
- PUT `/api/memory/:domainId/:memoryId` - Update memory.
- DELETE `/api/memory/:domainId/:memoryId` - Delete memory.

## Boards & Frames
- GET `/api/boards` - List boards.
- POST `/api/boards` - Create board.
- GET `/api/boards/:boardId` - Fetch board.
- PATCH `/api/boards/:boardId` - Update board.
- DELETE `/api/boards/:boardId` - Delete board.
- GET `/api/frames` - List frames.
- POST `/api/frames` - Create frame.
- GET `/api/frames/:frameType` - Fetch frame by type.

## Uploads
- POST `/api/uploads/sign` - Sign upload URL.
- POST `/api/uploads/direct` - Direct upload.
- DELETE `/api/uploads/:key(*)` - Delete upload.

## Admin
- GET `/api/admin/domains` - List all domains (super-admin).
- GET `/api/admin/domains/:id/members` - Domain members.
- POST `/api/admin/domains` - Create domain (super-admin).
- PUT `/api/admin/domains/:id` - Update domain.
- PATCH `/api/admin/domains/:id/suspend` - Suspend domain.

---

# 6. DATABASE MIGRATION STATUS

`npx prisma migrate status` not run; listing migrations in `packages/database/prisma/migrations/`:
- `_baseline_upgrade.sql`
- `20250110_add_board_domain_columns/migration.sql`
- `20250903_board_agent_unique_index/migration.sql`
- `20250904_agent_home_enforce_indices/migration.sql`
- `20250911_domain_board_fields/migration.sql`
- `20250915_add_deletedAt_to_Domain/migration.sql`
- `20250921_board_alias_request_log/migration.sql`
- `20251122_add_board_tags/migration.sql`
- `20251211_kip_session_topics/migration.sql`
- `20251216_kip_drafts/migration.sql`
- `20251217_domain_policy/migration.sql`
- `20260114_add_moment_anonymous_claim/migration.sql`
- `20260114_add_moment_keptAt/migration.sql`
- `20260114_drop_moment_unique_path_journey/migration.sql`
- `migration_lock.toml`
- `README_BOARD_MANAGEMENT.md`
- `README.md`

---

# 7. ENVIRONMENT VARIABLES

From `.env.example` (names only):

## Database
- DATABASE_URL
- DB_POOL_MIN
- DB_POOL_MAX
- DB_QUERY_TIMEOUT
- DB_STATEMENT_TIMEOUT
- DB_MAX_CONNECTIONS
- DB_SSL
- DB_LOGGING
- DB_SLOW_QUERY_THRESHOLD
- DB_READ_REPLICAS
- DB_WRITE_INSTANCE
- DB_BACKUP_ENABLED
- DB_BACKUP_SCHEDULE
- DB_BACKUP_RETENTION
- DB_BACKUP_ENCRYPTION

## Auth / Security
- JWT_SECRET
- JWT_EXPIRES_IN
- JWT_REFRESH_EXPIRES_IN
- JWT_ISSUER
- JWT_AUDIENCE
- CSRF_ENABLED
- CSRF_SECRET

## App / Runtime
- NODE_ENV
- PORT
- LOG_LEVEL
- ENABLE_REQUEST_LOGGING
- REQUEST_SIZE_LIMIT
- REQUEST_TIMEOUT
- CONCURRENT_REQUESTS

## CORS
- CORS_ORIGINS

## Redis
- DISABLE_REDIS
- REDIS_URL
- REDIS_HOST
- REDIS_PORT
- REDIS_PASSWORD
- REDIS_DB
- REDIS_KEY_PREFIX
- REDIS_CLUSTER_ENABLED
- REDIS_CLUSTER_NODES

## Performance / Monitoring
- CLUSTERING_ENABLED
- CLUSTERING_WORKERS
- GC_ENABLED
- MEMORY_THRESHOLD
- CPU_THRESHOLD

## Logging
- LOG_FORMAT
- LOG_DESTINATION
- LOG_ROTATION_ENABLED
- LOG_MAX_SIZE
- LOG_MAX_FILES

## Vercel Integration
- VERCEL_TOKEN
- VERCEL_PROJECT_ID

## Testing
- TEST_DATABASE_URL

---

# 8. BUILD & DEPLOY CONFIGURATION

`apps/web/vite.config.ts`:
```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Simple plugin to display dev server URL
const devServerUrlPlugin = () => {
  return {
    name: 'dev-server-url',
    configureServer(server: any) {
      // Display URL when server is ready
      setTimeout(() => {
        const protocol = server.config.server.https ? 'https' : 'http';
        const host = server.config.server.host || 'localhost';
        const port = server.config.server.port || 5173;
        const url = `${protocol}://${host}:${port}`;
        
        console.log('\n🚀 Keeper Platform Dev Server');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log(`📍 Local:   ${url}`);
        console.log(`📍 Network: ${url.replace('localhost', '0.0.0.0')}`);
        console.log('═══════════════════════════════════════════════════════════════\n');
      }, 1000);
    },
  };
};

const buildTime = process.env.VITE_BUILD_TIME ?? new Date().toISOString();

export default defineConfig({
  plugins: [
    react(),
    devServerUrlPlugin(),
  ],
  define: {
    'import.meta.env.VITE_BUILD_TIME': JSON.stringify(buildTime),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  base: '/',
  publicDir: '../../public',
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
```

`railway.json`:
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "dockerfile",
    "buildCommand": null
  },
  "deploy": {
    "startCommand": "sh -c 'pnpm --filter @keeper/database prisma migrate deploy && echo \"=== Migration complete, starting server ===\" && node apps/api/dist/index.js'",
    "healthcheckPath": "/health",
    "healthcheckTimeout": 300
  },
  "variables": {
    "RAILWAY_DISABLE_BUILD_CACHE": "true",
    "NODE_ENV": "production",
    "PNPM_HOME": "/pnpm",
    "NPM_CONFIG_UPDATE_NOTIFIER": "false",
    "NPM_CONFIG_FUND": "false"
  }
}
```

`apps/proxy/railway.json`:
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "rootDirectory": ".",
  "build": {
    "builder": "dockerfile",
    "dockerfilePath": "Dockerfile.proxy",
    "context": "."
  },
  "deploy": {
    "startCommand": "node dist/index.js",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

`vercel.json`:
```json
{
  "installCommand": "pnpm install --frozen-lockfile --prod=false",
  "buildCommand": "cd apps/web && pnpm build",
  "outputDirectory": "apps/web/dist",

  "rewrites": [
    { "source": "/api/(.*)", "destination": "https://keeper-platform-production.up.railway.app/api/$1" },

    { "source": "/mcp", "destination": "https://keeper-platform-production.up.railway.app/mcp" },
    { "source": "/mcp/(.*)", "destination": "https://keeper-platform-production.up.railway.app/mcp/$1" },

    { "source": "/(.*)", "destination": "/index.html" }
  ],

  "redirects": [
    {
      "source": "/(.*)",
      "has": [{ "type": "host", "value": "ke3p.com" }],
      "destination": "https://www.ke3p.com/$1",
      "permanent": true
    }
  ]
}
```

`Dockerfile`:
```dockerfile
# Use Node.js 20 (Keeper rule)
FROM node:20-alpine

# Install pnpm with the CORRECT version that matches our lockfile (pnpm v10+)
RUN npm install -g pnpm@10.11.0

# Set working directory
WORKDIR /app

# Set Railway-specific environment variables
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV NPM_CONFIG_UPDATE_NOTIFIER=false
ENV NPM_CONFIG_FUND=false

# Copy package files first (for Docker layer caching)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.json ./

# Copy all packages and apps
COPY tools ./tools
COPY packages ./packages
COPY apps/api ./apps/api

# Install dependencies
RUN pnpm install --frozen-lockfile --no-optional --prefer-offline

# Generate Prisma client first, then build packages in dependency order
RUN echo "=== Generating Prisma client ===" && \
    pnpm db:generate && \
    echo "=== Building packages in dependency order ===" && \
    pnpm --filter @keeper/shared build && \
    echo "✅ Built @keeper/shared" && \
    pnpm --filter @keeper/database build && \
    echo "✅ Built @keeper/database" && \
    pnpm --filter @keeper/kam build && \
    echo "✅ Built @keeper/kam" && \
    pnpm --filter keeper-api build && \
    echo "✅ Built keeper-api" && \
    echo "Build completed successfully"

# Verify API build
RUN echo "=== Verifying API build ===" && \
    ls -la apps/api/dist/ && \
    test -f apps/api/dist/index.js && echo "✓ API index.js found!" || echo "✗ API index.js missing!"

# Remove dev dependencies to reduce image size
RUN pnpm prune --prod --config.ignore-scripts=true

# Set environment
ENV NODE_ENV=production

# Railway will set PORT dynamically, but expose 8080 as default
EXPOSE 8080

# Start the API (with source maps)
CMD ["node", "--enable-source-maps", "apps/api/dist/index.js"]
```

`apps/proxy/Dockerfile`:
```dockerfile
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
```

`docker-compose.yml`:
```yaml
version: '3.8'

services:
  redis:
    image: redis:7-alpine
    container_name: keeper-redis
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes
    volumes:
      - redis-data:/data
    environment:
      - REDIS_REPLICATION_MODE=master
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5

  redis-commander:
    image: rediscommander/redis-commander:latest
    container_name: keeper-redis-commander
    environment:
      - REDIS_HOSTS=local:redis:6379
    ports:
      - "8081:8081"
    depends_on:
      - redis
    restart: unless-stopped

volumes:
  redis-data:
    driver: local

networks:
  default:
    name: keeper-network
```

`docker-compose.override.yml`:
```yaml
version: '3.8'

services:
  redis:
    # Development-specific Redis configuration
    command: redis-server --appendonly yes --appendfsync everysec --maxmemory 256mb --maxmemory-policy allkeys-lru
    environment:
      - REDIS_REPLICATION_MODE=master
      - REDIS_DEBUG=1
    volumes:
      - redis-data:/data
      - ./redis.conf:/usr/local/etc/redis/redis.conf:ro
    labels:
      - "traefik.enable=false"
      - "keeper.service=redis"
      - "keeper.environment=development"

  postgres:
    # Development-specific PostgreSQL configuration
    environment:
      - POSTGRES_USER=keeper
      - POSTGRES_PASSWORD=keeper_dev_password
      - POSTGRES_DB=keeper_dev
      - POSTGRES_INITDB_ARGS="--encoding=UTF-8"
      - POSTGRES_LOG_STATEMENT=all
    volumes:
      - postgres-data:/var/lib/postgresql/data
      - ./packages/database/seeds:/docker-entrypoint-initdb.d
      - ./packages/database/test-data:/docker-entrypoint-initdb.d/test-data
    labels:
      - "traefik.enable=false"
      - "keeper.service=postgres"
      - "keeper.environment=development"

  # Add Redis Insight for development
  redis-insight:
    image: redislabs/redisinsight:latest
    container_name: keeper-redis-insight
    ports:
      - "8001:8001"
    depends_on:
      - redis
    restart: unless-stopped
    labels:
      - "keeper.service=redis-insight"
      - "keeper.environment=development"

volumes:
  redis-data:
    driver: local
    driver_opts:
      type: none
      device: ${PWD}/data/redis
      o: bind
  postgres-data:
    driver: local
    driver_opts:
      type: none
      device: ${PWD}/data/postgres
      o: bind
```

---

# 9. UNFINISHED / TODO AUDIT

Search terms: `TODO`, `FIXME`, `HACK`, `XXX`, `@ts-ignore`, plus commented-out code blocks.

## TODO / FIXME / HACK / XXX / @ts-ignore
- `docs/modules/docs.md` - TODO: Verify and describe assumptions.
- `docs/README.md` - TODO: Verify and describe assumptions.
- `docs/keeper-ui-experience.md` - TODO: Verify and describe assumptions.
- `apps/api/src/index.ts` - TODO: Add DB connection test; TODO: Track recent endpoint access.
- `apps/web/src/pages/kip/KipAgentBoardPage.tsx` - TODO: Verify diagnostics wiring once backend exposes stats.
- `apps/web/src/context/AuthContext.tsx` - TODO: Replace allowlist fallback once /api/kam/auth/me returns role info.
- `docs/modules/apps_web_src_v0_frames_index.md` - TODO note on admin visibility inference.
- `apps/web/src/v0/frames/index/README.md` - TODO note on admin visibility inference.
- `apps/web/src/v0/frames/index/IndexFrame.tsx` - TODO: Verify domain admin inference from /api/domains/my.
- `docs/modules/apps_web.md` - TODOs on framework/deployment/routing.
- `apps/web/README.md` - TODOs on framework/deployment/routing.
- `docs/modules/apps_api_src_middleware.md` - TODOs on redis null safety, domain subdomains.
- `apps/api/src/middleware/README.md` - TODOs on redis null safety, domain subdomains.
- `apps/api/src/middleware/dynamicCorsMiddleware.ts` - TODO: enable *.keeper.domains; TODO: support slug subdomains.
- `apps/api/src/routes/v0/moments.ts` - TODO: Fix theme_id assignment, Prisma types, theme support.
- `docs/modules/proxy.md` - TODO: Verify and describe assumptions.
- `apps/proxy/README.md` - TODO: Verify and describe assumptions.
- `apps/api/src/middleware/domainResolutionMiddleware.ts` - TODO: revisit fallback; TODO: enable *.keeper.domains.
- `apps/api/src/kam/README.md` - TODO: consolidate auth handlers.
- `apps/api/src/services/ModelProviderService.ts` - TODOs: Anthropic, Together AI, ElevenLabs integrations.
- `docs/modules/apps_web_src_lib.md` - TODO: re-enable subdomains post-MVP.
- `apps/web/src/lib/README.md` - TODO: re-enable subdomains post-MVP.
- `docs/modules/web_lib.md` - TODO: re-enable subdomains post-MVP.
- `docs/modules/web_hooks.md` - TODO: cookie-auth endpoint guidance.
- `apps/web/src/hooks/README.md` - TODO: cookie-auth endpoint guidance.
- `apps/api/src/tests/ensureDomainManagementBoard.test.ts` - @ts-ignore on test fixtures.
- `apps/web/src/pages/d/DomainKeepersPage.tsx` - TODO: replace stubbed keepers preview.
- `apps/web/src/pages/d/DomainJourneysPage.tsx` - TODO: replace stubbed journeys preview.
- `apps/web/src/pages/d/DomainFeedPage.tsx` - TODO: replace stubbed feed preview.
- `apps/web/src/hooks/useUserSettings.ts` - TODO: cookie-authenticated settings endpoint.
- `packages/database/src/services/DomainResolutionService.ts` - TODOs for subdomains/multi-tenancy.
- `packages/database/src/services/DomainCacheService.ts` - @ts-ignore for null Redis checks.
- `packages/database/src/services/DomainCacheService.js` - @ts-ignore for null Redis checks.
- `docs/modules/api/admin.md` - TODO: verify SQL table names vs Prisma models.
- `docs/modules/apps_web_src_features_studio_debug.md` - TODO: verify assumptions.
- `docs/modules/web.md` - TODOs on framework/deployment/routing.
- `docs/modules/middleware.md` - TODOs on redis null safety, subdomains.
- `docs/modules/middleware/README.md` - TODOs on redis null safety, subdomains.
- `docs/modules/mcp.md` - TODOs: rate limiting, audit logging.
- `docs/modules/frames.md` - TODO: verify assumptions.
- `apps/web/src/pages/studio/people-board-page.tsx` - TODO: save people updates.
- `apps/web/src/pages/studio/keeper-type-board-page.tsx` - TODO: save keeper type updates.
- `apps/web/src/pages/studio/journey-board-page.tsx` - TODO: save journey updates.
- `apps/web/src/pages/studio/DomainBoardPage.tsx` - TODO: save domain updates.
- `apps/web/src/pages/studio/AgentBoardPage.tsx` - TODO: save agent updates.
- `apps/web/src/hooks/useViewerContext.ts` - TODOs: roles and domain permissions.
- `apps/web/src/features/studio/debug/README.md` - TODO: verify assumptions.
- `apps/web/src/docs/modules/NavigationMenu.md` - TODO placeholders.
- `apps/web/src/context/FrameContext.tsx` - TODOs: load/update frame instance, interaction logic.
- `apps/web/src/components/props/renderers/ActionButton.tsx` - TODO: show success toast.
- `apps/web/src/components/patterns/PathwayNav.tsx` - TODO: owner check.
- `apps/web/src/components/frames/TopicsFrame.tsx` - TODO: replace with actual API call.
- `apps/web/src/components/frames/CodeSnippetFrame.tsx` - TODO: code execution logic.
- `apps/web/src/components/engagement/ReflectionJournal.tsx` - TODO: agentId from context.
- `apps/web/src/components/engagement/EngagementButton.tsx` - TODO: replace alerts with toasts.
- `apps/web/src/components/NavigationMenu/README.md` - TODO placeholders.
- `apps/api/src/routes/frames.ts` - TODO: replace mock frame CRUD.
- `apps/api/src/routes/boards.ts` - TODO: replace mock board CRUD.
- `apps/api/src/services/boards/BoardsService.ts` - TODO: media upload integration.
- `apps/api/src/mcp/tools.ts` - TODO: replace mock DB calls.
- `apps/api/src/api/kip/platform-keys.ts` - TODO: add admin role verification.
- `apps/api/src/api/domains/contact.ts` - TODO: send email/store in DB.
- `apps/api/src/api/agents/topics.ts` - TODO: proxy to board-data, merge persistence.
- `apps/api/src/api/agents/memory.ts` - TODO: Prisma-backed implementation.
- `apps/api/src/api/admin/README.md` - TODO: verify table name mapping.
- `apps/api/README.md` - TODO: consolidate auth handlers.
- `INLINE_EDITING_IMPLEMENTATION.md` - TODO items in spec.
- `MCP_IMPLEMENTATION_SUMMARY.md` - TODO: mock data.
- `MCP_OPENAI_SETUP.md` - TODO: rate limiting.
- `BOARD_STUDIO_ACTUAL_FIX.md` - TODOs in historical notes.
- `AUTH_COOKIE_FINAL_FIX.md` - TODO: consolidate auth source of truth.

## Commented-out code blocks (heuristic)
- `apps/api/src/index.ts` - Commented conditional host check.
- `apps/api/src/routes/v0/moments.ts` - Commented theme lookup block.
- `packages/database/src/types.ts` - Commented Prisma payload alias.
- `packages/kam/temp/session.js` - Commented Prisma client lines.
- `packages/kam/src/types/index.ts` - Commented export.
- `packages/kam/src/types/index.js` - Commented export.
- `packages/kam/src/index.ts` - Commented export.
- `packages/kam/src/index.js` - Commented export.
- `packages/kam/src/auth/session.ts` - Commented Prisma client lines.
- `packages/kam/src/auth/session.js` - Commented Prisma client lines.
- `packages/kam/src/auth/logout.ts` - Commented session invalidation import.
- `packages/kam/src/auth/logout.js` - Commented session invalidation import.
- `packages/kam/src/auth/login.ts` - Commented password verification.
- `packages/kam/src/auth/login.js` - Commented password verification.
- `apps/web/src/hooks/useViewerContext.ts` - Commented permission checks.
- `apps/api/src/middleware/authMiddleware.ts` - Commented dev platform role fallback.
- `apps/api/src/api/production/routes.ts` - Commented monitoring service calls.
- `apps/api/src/api/domains/contact.ts` - Commented email check.
- `apps/api/src/api/kip/platform-keys.ts` - Commented admin access checks.

---

# 10. TEST COVERAGE

Test files found:
- `apps/web/src/v0/frames/DesignFrame.test.tsx`
- `packages/kam/src/auth/domainAuth.test.ts`
- `apps/api/src/tests/kip-action-execution-guard.test.ts`
- `apps/api/src/tests/ensure-dmb-idempotent.test.ts`
- `apps/api/src/tests/ensureDomainManagementBoard.test.ts`
- `apps/api/src/tests/debug-req-logs.test.ts`
- `packages/database/src/services/__tests__/SlugValidationService.test.ts`
- `packages/database/src/services/__tests__/FeatureFlagService.test.ts`
- `packages/database/src/services/DomainContextService.test.ts`
- `apps/proxy/src/mcpProxy.test.ts`
- `apps/api/test/redis.fallback.test.ts`
- `apps/api/src/utils/domain.test.ts`
- `apps/api/src/tests/smoke/production.test.ts`
- `apps/api/src/tests/smoke/basic.test.ts`
- `apps/api/src/tests/kam-parity.test.ts`
- `apps/api/src/tests/board-data-dev.test.ts`
- `apps/api/src/tests/board-data-auth.test.ts`
- `apps/api/src/tests/board-alias-compat.test.ts`
- `apps/api/src/mcp/mcp.test.ts`
- `apps/api/src/lib/errors/DomainError.test.ts`
- `apps/api/src/kam/routes.auth.test.ts`
- `apps/api/src/kam/lib/kamKeyLoader.test.ts`
- `apps/api/src/__tests__/sprint7-production-readiness.test.ts`
- `apps/api/src/__tests__/sprint6-cross-domain-sharing.test.ts`
- `apps/api/src/__tests__/sprint5-memory-isolation.test.ts`
- `apps/api/src/__tests__/sprint4-integration.test.ts`
- `apps/api/src/__tests__/mvp-domain-fallback.test.ts`
- `apps/api/src/__tests__/mvp-cors-domains.test.ts`
- `apps/api/src/__tests__/kam-readonly.test.ts`
- `apps/api/src/__tests__/kam-cors.test.ts`
- `apps/api/src/__tests__/domain-permission-integration.test.ts`

Estimated coverage (heuristic): low-to-moderate. API/domain permissions and some system behaviors are tested; frontend UI and many core feature flows (moments, journeys, keepers) have limited automated tests outside API-level coverage. 

