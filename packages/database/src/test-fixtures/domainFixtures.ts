/**
 * Domain Test Fixtures
 * TypeScript fixtures for testing domain functionality
 */

export interface TestDomain {
  id: string;
  name: string;
  slug: string;
  slugHistory?: string[];
  customDomain?: string;
  customDomainVerified: boolean;
  verificationToken?: string;
  verificationMethod?: 'DNS_TXT' | 'CNAME' | 'FILE';
  verifiedAt?: Date;
  status: 'active' | 'suspended' | 'archived' | 'pending';
  features?: Record<string, unknown>;
  limits?: Record<string, unknown>;
  isPublic: boolean;
  description?: string;
  allowRequests: boolean;
  categories: string[];
  ownerId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  theme?: Record<string, unknown>;
  settings?: Record<string, unknown>;
}

export interface TestDomainPermission {
  id: string;
  domainId: string;
  userId: string;
  role: 'admin' | 'user' | 'friend' | 'connection';
  permissions: string[];
  grantedBy: string;
  grantedAt: Date;
  expiresAt?: Date;
}

export interface TestCrossDomainShare {
  id: string;
  sourceDomainId: string;
  targetDomainId: string;
  contentType: 'keeper' | 'journey' | 'moment';
  contentId: string;
  permissions: string[];
  expiresAt?: Date;
  allowSubsharing: boolean;
  requireApproval: boolean;
  approvedAt?: Date;
  approvedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TestUser {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

// Test Users
export const testUsers: TestUser[] = [
  {
    id: 'user-1',
    email: 'alice@example.com',
    name: 'Alice Johnson',
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  },
  {
    id: 'user-2',
    email: 'bob@example.com',
    name: 'Bob Smith',
    createdAt: new Date('2024-01-02T00:00:00Z'),
    updatedAt: new Date('2024-01-02T00:00:00Z'),
  },
  {
    id: 'user-3',
    email: 'charlie@example.com',
    name: 'Charlie Brown',
    createdAt: new Date('2024-01-03T00:00:00Z'),
    updatedAt: new Date('2024-01-03T00:00:00Z'),
  },
  {
    id: 'user-4',
    email: 'diana@example.com',
    name: 'Diana Prince',
    createdAt: new Date('2024-01-04T00:00:00Z'),
    updatedAt: new Date('2024-01-04T00:00:00Z'),
  },
  {
    id: 'user-5',
    email: 'eve@example.com',
    name: 'Eve Chen',
    createdAt: new Date('2024-01-05T00:00:00Z'),
    updatedAt: new Date('2024-01-05T00:00:00Z'),
  },
];

// Test Domains
export const testDomains: TestDomain[] = [
  {
    id: 'domain-1',
    name: 'Alice Family',
    slug: 'alice-family',
    slugHistory: [],
    customDomain: 'family.example.com',
    customDomainVerified: true,
    verificationToken: 'verify-token-1',
    verificationMethod: 'DNS_TXT',
    verifiedAt: new Date('2024-01-07T00:00:00Z'),
    status: 'active',
    features: { kip_enabled: true, custom_themes: true },
    limits: { max_keepers: 50, max_users: 10 },
    isPublic: false,
    description: 'Our family memories and moments',
    allowRequests: false,
    categories: ['family'],
    ownerId: 'user-1',
    isActive: true,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-08T00:00:00Z'),
    theme: { primaryColor: '#3498db' },
    settings: { timezone: 'America/New_York' },
  },
  {
    id: 'domain-2',
    name: 'Team Alpha',
    slug: 'team-alpha',
    slugHistory: ['old-team-name'],
    customDomain: 'team.example.com',
    customDomainVerified: false,
    verificationToken: 'verify-token-2',
    verificationMethod: 'CNAME',
    status: 'active',
    features: { kip_enabled: true, custom_themes: false },
    limits: { max_keepers: 100, max_users: 25 },
    isPublic: true,
    description: 'Collaborative workspace for Team Alpha',
    allowRequests: true,
    categories: ['team', 'work'],
    ownerId: 'user-2',
    isActive: true,
    createdAt: new Date('2024-01-03T00:00:00Z'),
    updatedAt: new Date('2024-01-08T00:00:00Z'),
    theme: { primaryColor: '#e74c3c' },
    settings: { timezone: 'UTC' },
  },
  {
    id: 'domain-3',
    name: 'Creative Hub',
    slug: 'creative-hub',
    slugHistory: [],
    customDomainVerified: false,
    status: 'active',
    features: { kip_enabled: true, custom_themes: true },
    limits: { max_keepers: 75, max_users: 15 },
    isPublic: true,
    description: 'A space for creative collaboration',
    allowRequests: true,
    categories: ['creative', 'art'],
    ownerId: 'user-3',
    isActive: true,
    createdAt: new Date('2024-01-05T00:00:00Z'),
    updatedAt: new Date('2024-01-08T00:00:00Z'),
    theme: { primaryColor: '#9b59b6' },
    settings: { timezone: 'Europe/London' },
  },
  {
    id: 'domain-4',
    name: 'Suspended Domain',
    slug: 'suspended-domain',
    slugHistory: [],
    customDomainVerified: false,
    status: 'suspended',
    features: { kip_enabled: false },
    limits: { max_keepers: 10, max_users: 5 },
    isPublic: false,
    description: 'This domain has been suspended',
    allowRequests: false,
    categories: [],
    ownerId: 'user-4',
    isActive: true,
    createdAt: new Date('2023-12-29T00:00:00Z'),
    updatedAt: new Date('2024-01-08T00:00:00Z'),
    theme: {},
    settings: {},
  },
  {
    id: 'domain-5',
    name: 'Old Project',
    slug: 'old-project',
    slugHistory: ['archived-2023', 'legacy-project'],
    customDomain: 'old.example.com',
    customDomainVerified: true,
    verificationToken: 'verify-token-5',
    verificationMethod: 'FILE',
    verifiedAt: new Date('2023-12-09T00:00:00Z'),
    status: 'archived',
    features: { kip_enabled: false },
    limits: { max_keepers: 20, max_users: 8 },
    isPublic: false,
    description: 'Archived project from 2023',
    allowRequests: false,
    categories: ['archive'],
    ownerId: 'user-5',
    isActive: false,
    createdAt: new Date('2023-11-09T00:00:00Z'),
    updatedAt: new Date('2024-01-08T00:00:00Z'),
    theme: {},
    settings: {},
  },
  {
    id: 'domain-6',
    name: 'Premium Workspace',
    slug: 'premium-workspace',
    slugHistory: [],
    customDomain: 'premium.example.com',
    customDomainVerified: true,
    verificationToken: 'verify-token-6',
    verificationMethod: 'DNS_TXT',
    verifiedAt: new Date('2024-01-06T00:00:00Z'),
    status: 'active',
    features: { 
      kip_enabled: true, 
      custom_themes: true, 
      advanced_analytics: true, 
      white_label: true 
    },
    limits: { max_keepers: 500, max_users: 100 },
    isPublic: true,
    description: 'Premium workspace with advanced features',
    allowRequests: true,
    categories: ['premium', 'business'],
    ownerId: 'user-1',
    isActive: true,
    createdAt: new Date('2023-12-25T00:00:00Z'),
    updatedAt: new Date('2024-01-08T00:00:00Z'),
    theme: { primaryColor: '#f39c12' },
    settings: { 
      timezone: 'America/Los_Angeles', 
      branding: { logo: 'https://example.com/logo.png' } 
    },
  },
];

// Test Domain Permissions
export const testDomainPermissions: TestDomainPermission[] = [
  // Alice's family domain permissions
  {
    id: 'perm-1',
    domainId: 'domain-1',
    userId: 'user-1',
    role: 'admin',
    permissions: ['read', 'write', 'share', 'admin'],
    grantedBy: 'user-1',
    grantedAt: new Date('2024-01-01T00:00:00Z'),
  },
  {
    id: 'perm-2',
    domainId: 'domain-1',
    userId: 'user-2',
    role: 'user',
    permissions: ['read', 'write'],
    grantedBy: 'user-1',
    grantedAt: new Date('2024-01-02T00:00:00Z'),
  },
  {
    id: 'perm-3',
    domainId: 'domain-1',
    userId: 'user-3',
    role: 'friend',
    permissions: ['read'],
    grantedBy: 'user-1',
    grantedAt: new Date('2024-01-03T00:00:00Z'),
    expiresAt: new Date('2024-02-08T00:00:00Z'),
  },
  // Team Alpha permissions
  {
    id: 'perm-4',
    domainId: 'domain-2',
    userId: 'user-2',
    role: 'admin',
    permissions: ['read', 'write', 'share', 'admin'],
    grantedBy: 'user-2',
    grantedAt: new Date('2024-01-03T00:00:00Z'),
  },
  {
    id: 'perm-5',
    domainId: 'domain-2',
    userId: 'user-1',
    role: 'user',
    permissions: ['read', 'write', 'share'],
    grantedBy: 'user-2',
    grantedAt: new Date('2024-01-04T00:00:00Z'),
  },
  {
    id: 'perm-6',
    domainId: 'domain-2',
    userId: 'user-3',
    role: 'user',
    permissions: ['read', 'write'],
    grantedBy: 'user-2',
    grantedAt: new Date('2024-01-05T00:00:00Z'),
  },
  // Creative Hub permissions
  {
    id: 'perm-7',
    domainId: 'domain-3',
    userId: 'user-3',
    role: 'admin',
    permissions: ['read', 'write', 'share', 'admin'],
    grantedBy: 'user-3',
    grantedAt: new Date('2024-01-05T00:00:00Z'),
  },
  {
    id: 'perm-8',
    domainId: 'domain-3',
    userId: 'user-1',
    role: 'user',
    permissions: ['read', 'write'],
    grantedBy: 'user-3',
    grantedAt: new Date('2024-01-06T00:00:00Z'),
  },
];

// Test Cross-Domain Shares
export const testCrossDomainShares: TestCrossDomainShare[] = [
  {
    id: 'share-1',
    sourceDomainId: 'domain-1',
    targetDomainId: 'domain-2',
    contentType: 'keeper',
    contentId: 'keeper-1',
    permissions: ['view', 'comment'],
    allowSubsharing: false,
    requireApproval: true,
    approvedAt: new Date('2024-01-07T00:00:00Z'),
    approvedBy: 'user-2',
    createdAt: new Date('2024-01-05T00:00:00Z'),
    updatedAt: new Date('2024-01-07T00:00:00Z'),
  },
  {
    id: 'share-2',
    sourceDomainId: 'domain-2',
    targetDomainId: 'domain-3',
    contentType: 'journey',
    contentId: 'journey-1',
    permissions: ['view'],
    expiresAt: new Date('2024-02-08T00:00:00Z'),
    allowSubsharing: false,
    requireApproval: true,
    approvedAt: new Date('2024-01-06T00:00:00Z'),
    approvedBy: 'user-3',
    createdAt: new Date('2024-01-04T00:00:00Z'),
    updatedAt: new Date('2024-01-06T00:00:00Z'),
  },
  {
    id: 'share-3',
    sourceDomainId: 'domain-1',
    targetDomainId: 'domain-3',
    contentType: 'keeper',
    contentId: 'keeper-2',
    permissions: ['view'],
    expiresAt: new Date('2024-01-22T00:00:00Z'),
    allowSubsharing: false,
    requireApproval: true,
    createdAt: new Date('2024-01-07T00:00:00Z'),
    updatedAt: new Date('2024-01-07T00:00:00Z'),
  },
];

// Helper functions for test data generation

export function createTestDomain(overrides: Partial<TestDomain> = {}): TestDomain {
  const baseDate = new Date('2024-01-08T00:00:00Z');
  return {
    id: `domain-${Date.now()}`,
    name: 'Test Domain',
    slug: `test-domain-${Date.now()}`,
    slugHistory: [],
    customDomainVerified: false,
    status: 'active',
    isPublic: false,
    allowRequests: false,
    categories: [],
    ownerId: 'user-1',
    isActive: true,
    createdAt: baseDate,
    updatedAt: baseDate,
    ...overrides,
  };
}

export function createTestDomainPermission(overrides: Partial<TestDomainPermission> = {}): TestDomainPermission {
  return {
    id: `perm-${Date.now()}`,
    domainId: 'domain-1',
    userId: 'user-1',
    role: 'user',
    permissions: ['read'],
    grantedBy: 'user-1',
    grantedAt: new Date('2024-01-08T00:00:00Z'),
    ...overrides,
  };
}

export function createTestCrossDomainShare(overrides: Partial<TestCrossDomainShare> = {}): TestCrossDomainShare {
  const baseDate = new Date('2024-01-08T00:00:00Z');
  return {
    id: `share-${Date.now()}`,
    sourceDomainId: 'domain-1',
    targetDomainId: 'domain-2',
    contentType: 'keeper',
    contentId: 'keeper-1',
    permissions: ['view'],
    allowSubsharing: false,
    requireApproval: true,
    createdAt: baseDate,
    updatedAt: baseDate,
    ...overrides,
  };
}

export function createTestUser(overrides: Partial<TestUser> = {}): TestUser {
  const timestamp = Date.now();
  const baseDate = new Date('2024-01-08T00:00:00Z');
  return {
    id: `user-${timestamp}`,
    email: `test-${timestamp}@example.com`,
    name: `Test User ${timestamp}`,
    createdAt: baseDate,
    updatedAt: baseDate,
    ...overrides,
  };
}

// Test scenarios for specific use cases

export const domainTestScenarios = {
  // Valid domain with all features
  validDomainComplete: testDomains[0], // domain-1
  
  // Domain without custom domain
  validDomainBasic: testDomains[2], // domain-3
  
  // Suspended domain
  suspendedDomain: testDomains[3], // domain-4
  
  // Archived domain
  archivedDomain: testDomains[4], // domain-5
  
  // Premium domain with advanced features
  premiumDomain: testDomains[5], // domain-6
  
  // Domain with unverified custom domain
  unverifiedCustomDomain: testDomains[1], // domain-2
};

export const permissionTestScenarios = {
  // Admin permission
  adminPermission: testDomainPermissions[0], // perm-1
  
  // User permission
  userPermission: testDomainPermissions[1], // perm-2
  
  // Friend permission with expiration
  friendPermission: testDomainPermissions[2], // perm-3
  
  // User with sharing permission
  userWithSharing: testDomainPermissions[4], // perm-5
};

export const shareTestScenarios = {
  // Approved share
  approvedShare: testCrossDomainShares[0], // share-1
  
  // Time-limited approved share
  timeLimitedShare: testCrossDomainShares[1], // share-2
  
  // Pending approval share
  pendingShare: testCrossDomainShares[2], // share-3
};

// Mock functions for testing
export const mockFunctions = {
  getCurrentTimestamp: () => new Date('2024-01-08T12:00:00Z'),
  generateId: () => `test-${Date.now()}`,
  generateToken: () => `token-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
};

// Validation helpers
export function isValidDomain(domain: unknown): domain is TestDomain {
  return (
    typeof domain === 'object' &&
    domain !== null &&
    'id' in domain &&
    'name' in domain &&
    'slug' in domain &&
    'ownerId' in domain &&
    'status' in domain &&
    'isActive' in domain &&
    'createdAt' in domain &&
    'updatedAt' in domain &&
    typeof (domain as Record<string, unknown>).id === 'string' &&
    typeof (domain as Record<string, unknown>).name === 'string' &&
    typeof (domain as Record<string, unknown>).slug === 'string' &&
    typeof (domain as Record<string, unknown>).ownerId === 'string' &&
    ['active', 'suspended', 'archived', 'pending'].includes((domain as Record<string, unknown>).status as string) &&
    typeof (domain as Record<string, unknown>).isActive === 'boolean' &&
    (domain as Record<string, unknown>).createdAt instanceof Date &&
    (domain as Record<string, unknown>).updatedAt instanceof Date
  );
}

export function isValidDomainPermission(permission: unknown): permission is TestDomainPermission {
  return (
    typeof permission === 'object' &&
    permission !== null &&
    'id' in permission &&
    'domainId' in permission &&
    'userId' in permission &&
    'role' in permission &&
    'permissions' in permission &&
    'grantedBy' in permission &&
    'grantedAt' in permission &&
    typeof (permission as Record<string, unknown>).id === 'string' &&
    typeof (permission as Record<string, unknown>).domainId === 'string' &&
    typeof (permission as Record<string, unknown>).userId === 'string' &&
    ['admin', 'user', 'friend', 'connection'].includes((permission as Record<string, unknown>).role as string) &&
    Array.isArray((permission as Record<string, unknown>).permissions) &&
    typeof (permission as Record<string, unknown>).grantedBy === 'string' &&
    (permission as Record<string, unknown>).grantedAt instanceof Date
  );
}

export default {
  testUsers,
  testDomains,
  testDomainPermissions,
  testCrossDomainShares,
  createTestDomain,
  createTestDomainPermission,
  createTestCrossDomainShare,
  createTestUser,
  domainTestScenarios,
  permissionTestScenarios,
  shareTestScenarios,
  mockFunctions,
  isValidDomain,
  isValidDomainPermission,
}; 