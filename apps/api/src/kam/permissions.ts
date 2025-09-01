export type Role = 'DomainLead' | 'AgentDev' | 'Member';

const permissionsMatrix: Record<Role, Set<string>> = {
  DomainLead: new Set<string>([
    'board.frames.add',
    'board.frames.update',
    'board.frames.remove',
    'board.frames.reorder',
    'board.templates.save',
    'board.templates.apply',
    'board.layout.update',
  ]),
  AgentDev: new Set<string>([
    'board.frames.add',
    'board.frames.update',
    'board.frames.remove',
    'board.frames.reorder',
    'board.templates.save',
    'board.templates.apply',
    'board.layout.update',
  ]),
  Member: new Set<string>([]),
};

export function can(role: Role, action: string, _subject?: string): boolean {
  const set = permissionsMatrix[role] || permissionsMatrix.Member;
  return set.has(action);
}

export function extractRole(req: any): Role {
  // Stub resolution: prefer header, then req.user.role, else Member
  const hdr = (req.get && req.get('x-user-role')) || (req.headers?.['x-user-role'] as string);
  const raw = hdr || (req.user?.role as string) || '';
  if (raw === 'DomainLead' || raw === 'AgentDev' || raw === 'Member') return raw;
  return 'DomainLead'; // default permissive for development
}


