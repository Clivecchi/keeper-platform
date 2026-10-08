import type { Prisma } from '@keeper/database';

/**
 * Dialog audience: admin (domain-wide), member (invitation arrival and later
 * member rooms), keeper (private to user_id). Guest never persists as a Dialog.
 */
export function dialogVisibleToUserOr(userId: string): Prisma.DialogWhereInput[] {
  return [
    { available_to: { has: 'admin' } },
    { available_to: { has: 'member' } },
    { user_id: userId, available_to: { has: 'keeper' } },
  ];
}

export function dialogVisibleToUserWhere(userId: string): Prisma.DialogWhereInput {
  return { OR: dialogVisibleToUserOr(userId) };
}

/**
 * Catalog and dialog.read audience.
 * A keeper Dialog stays with its user. With no user, only domain-shared scopes are visible.
 */
export function dialogAudienceWhere(userId?: string | null): Prisma.DialogWhereInput {
  const id = userId?.trim();
  if (id) return dialogVisibleToUserWhere(id);
  return {
    OR: [
      { available_to: { has: 'admin' } },
      { available_to: { has: 'member' } },
    ],
  };
}
