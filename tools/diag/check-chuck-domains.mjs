import { PrismaClient } from "@prisma/client"
import dotenv from "dotenv"
import { dirname, join } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: join(__dirname, "../../apps/api/.env") })

const prisma = new PrismaClient()

try {
  const user = await prisma.users.findFirst({
    where: { email: "clivecchi@gmail.com" },
    select: { id: true, name: true, email: true, primaryDomainId: true },
  })

  if (!user) {
    console.log(JSON.stringify({ error: "User not found" }, null, 2))
    process.exit(0)
  }

  const owned = await prisma.domain.findMany({
    where: { ownerId: user.id },
    select: {
      id: true,
      name: true,
      slug: true,
      customDomain: true,
      isActive: true,
      deletedAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  })

  const permissions = await prisma.domainPermission.findMany({
    where: { userId: user.id },
    include: {
      Domain: {
        select: {
          name: true,
          slug: true,
          customDomain: true,
          ownerId: true,
          isActive: true,
          deletedAt: true,
        },
      },
    },
  })

  const livecchiMatches = await prisma.domain.findMany({
    where: {
      OR: [
        { slug: { contains: "livecchi" } },
        { customDomain: { contains: "livecchi" } },
        { name: { contains: "livecchi", mode: "insensitive" } },
      ],
    },
    select: { name: true, slug: true, customDomain: true, ownerId: true, isActive: true, deletedAt: true },
  })

  const primaryDomain = user.primaryDomainId
    ? await prisma.domain.findUnique({
        where: { id: user.primaryDomainId },
        select: { id: true, name: true, slug: true, customDomain: true, deletedAt: true, isActive: true },
      })
    : null

  console.log(
    JSON.stringify(
      {
        user,
        primaryDomain,
        ownedCount: owned.length,
        owned,
        permissionCount: permissions.length,
        permissions: permissions.map((p) => ({ role: p.role, domain: p.Domain })),
        livecchiMatches,
      },
      null,
      2,
    ),
  )
} finally {
  await prisma.$disconnect()
}
