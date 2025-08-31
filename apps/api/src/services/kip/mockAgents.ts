export type PublicAgent = {
  id: string;
  name: string;
  description: string;
  status?: 'mock' | 'active';
};

export const MOCK_AGENTS: PublicAgent[] = [
  { id: 'echo-writer', name: 'Echo Writer', description: 'Writes echoes', status: 'mock' },
  { id: 'domain-helper', name: 'Domain Helper', description: 'Assists domain ops', status: 'mock' },
];


