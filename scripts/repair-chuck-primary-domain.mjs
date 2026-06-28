#!/usr/bin/env node
/**
 * One-time repair: create Chuck Livecchi personal domain, set users.primaryDomainId,
 * seed default keeper + permissions. Does not move keepers off KE3P.
 */
import { PrismaClient } from "@prisma/client"
import { randomUUID } from "crypto"
import dotenv from "dotenv"
import { dirname, join } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: join(__dirname, "../apps/api/.env") })

const USER_EMAIL = "clivecchi@gmail.com"
const PERSONAL_NAME = "Chuck Livecchi"
const PERSONAL_SLUG = "chuck-livecchi"

const prisma = new PrismaClient()

async function ensureAgentPolicy(domainId) {
  const contract = await prisma.agentContract.findFirst({
    where: { version: "1.1" },
    select: { id: true },
  })
  if (!contract) {
    console.warn("⚠️  No AgentContract v1.1 — skip domain agent policy")
    return
  }
  await prisma.domainAgentPolicy.upsert({
    where: { domainId },
    create: { domainId, contractId: contract.id, enforcementMode: "warn" },
    update: {},
  })
  console.log("✅ Domain agent policy assigned")
}

async function main() {
  const user = await prisma.users.findFirst({ where: { email: USER_EMAIL } })
  if (!user) {
    throw new Error(`User not found: ${USER_EMAIL}`)
  }

  console.log(`✅ User: ${user.name} (${user.id})`)
  console.log(`   Current primaryDomainId: ${user.primaryDomainId ?? "(null)"}`)

  let personalDomain = await prisma.domain.findFirst({
    where: {
      OR: [{ slug: PERSONAL_SLUG }, { name: PERSONAL_NAME, ownerId: user.id }],
    },
  })

  if (personalDomain) {
    console.log(`ℹ️  Personal domain already exists: ${personalDomain.slug}`)
  } else {
    const domainId = randomUUID()
    personalDomain = await prisma.domain.create({
      data: {
        id: domainId,
        name: PERSONAL_NAME,
        slug: PERSONAL_SLUG,
        ownerId: user.id,
        description: "Personal Keeper domain for Chuck Livecchi",
        isPublic: false,
        allowRequests: false,
        status: "active",
        isActive: true,
        features: { kip_enabled: true, custom_themes: true, memory_enabled: true },
        limits: { max_keepers: 100, max_users: 50 },
        theme: {},
        settings: { default_visibility: "private" },
      },
    })
    console.log(`✅ Created personal domain: ${personalDomain.slug} (${personalDomain.id})`)

    await ensureAgentPolicy(personalDomain.id)

    const existingPerm = await prisma.domainPermission.findUnique({
      where: { domainId_userId: { domainId: personalDomain.id, userId: user.id } },
    })
    if (!existingPerm) {
      await prisma.domainPermission.create({
        data: {
          id: randomUUID(),
          domainId: personalDomain.id,
          userId: user.id,
          role: "admin",
          permissions: ["read", "write", "share", "admin", "invite", "delete"],
          grantedBy: user.id,
        },
      })
      console.log("✅ Owner domain permission created")
    }
  }

  const keeperOnPersonal = await prisma.keeper.findFirst({
    where: { domainId: personalDomain.id, ownerId: user.id },
  })
  if (!keeperOnPersonal) {
    await prisma.keeper.create({
      data: {
        id: `keeper-default-${user.id}`,
        title: `${PERSONAL_NAME}'s Keeper`,
        purpose: "Default keeper for organizing journeys and moments.",
        ownerId: user.id,
        domainId: personalDomain.id,
        keeperType: "PersonalKeeper",
      },
    })
    console.log("✅ Default PersonalKeeper created on personal domain")
  } else {
    console.log(`ℹ️  Keeper already on personal domain: ${keeperOnPersonal.title}`)
  }

  await prisma.users.update({
    where: { id: user.id },
    data: { primaryDomainId: personalDomain.id },
  })
  console.log(`✅ Set primaryDomainId → ${personalDomain.slug}`)

  // Bust Redis user-domain list if production cache still holds pre-repair ids only
  try {
    const { DomainCacheService } = await import("@keeper/database/dist/services/DomainCacheService.js")
    const cache = new DomainCacheService()
    await cache.invalidateUser(user.id)
    console.log("✅ Invalidated user domain cache (when Redis enabled)")
  } catch {
    console.log("ℹ️  Skipped cache invalidation (Redis disabled or package not built)")
  }

  const owned = await prisma.domain.findMany({
    where: { ownerId: user.id, isActive: true, deletedAt: null },
    select: { name: true, slug: true },
    orderBy: { createdAt: "asc" },
  })

  console.log("\n📋 Owned domains (switcher should list these):")
  for (const d of owned) {
    const mark = d.slug === personalDomain.slug ? " ← primary" : ""
    console.log(`   • ${d.name.trim()} (${d.slug})${mark}`)
  }

  console.log("\n🎉 Repair complete. Open /d/chuck-livecchi/board?board=domain or use Domain switcher.")
}

main()
  .catch((err) => {
    console.error("❌ Repair failed:", err)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
