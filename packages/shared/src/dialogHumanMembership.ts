export type DialogHumanMemberSource = 'invitation' | 'manual';

export type DialogHumanMemberRow = {
  userId: string;
  displayName: string;
  email: string | null;
  homeDomainId: string | null;
  homeDomainSlug: string | null;
  addedAt: string;
  source: DialogHumanMemberSource;
};

export function parseDialogHumanMemberSource(value: unknown): DialogHumanMemberSource {
  return value === 'invitation' ? 'invitation' : 'manual';
}
