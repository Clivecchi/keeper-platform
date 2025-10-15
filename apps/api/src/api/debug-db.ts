import { prisma } from '@keeper/database';

export async function uuidCastDiagnostic(id: string) {
  try {
    await prisma.$queryRaw`SELECT ${id}::uuid`;
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: String(e?.message ?? e) };
  }
}


