#!/usr/bin/env node
/** Simulate GET /api/domains/my for Chuck — DB + cache key check */
import { PrismaClient } from "@prisma/client"
import dotenv from "dotenv"
import { dirname, join } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: join(__dirname, "../../apps/api/.env") })

const USER_ID = "491307f3-b331-436c-b53a-09a11ec110cb"
const prisma = new PrismaClient()

async function main() {
  const domains = await prisma.domain.findMany({
    where: {
      OR: [
        { ownerId: USER_ID },
        {
          DomainPermission: {
            some: {
              userId: USER_ID,
              OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
            },
          },
        },
      ],
      isActive: true,
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      slug: true,
      name: true,
      isActive: true,
      deletedAt: true,
      ownerId: true,
    },
  })

  console.log(JSON.stringify({ count: domains.length, domains }, null, 2))
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
