import { describe, expect, it } from 'vitest';
import {
  parseDomainServiceBindings,
  parseGitHubServiceBinding,
  validateGitHubBindingFields,
} from '@keeper/shared';

describe('serviceBindings', () => {
  it('parses github binding from integration metadata shape', () => {
    expect(
      parseGitHubServiceBinding({
        repository: 'Clivecchi/keeper-platform',
        defaultBranch: 'main',
      }),
    ).toEqual({
      repository: 'Clivecchi/keeper-platform',
      defaultBranch: 'main',
    });
  });

  it('reads legacy ideBuildContext fields as github binding', () => {
    expect(
      parseDomainServiceBindings({
        ideBuildContext: {
          activeRepository: 'Clivecchi/keeper-platform',
          activeBranch: 'develop',
        },
      }).github,
    ).toEqual({
      repository: 'Clivecchi/keeper-platform',
      defaultBranch: 'develop',
    });
  });

  it('prefers serviceBindings over legacy ideBuildContext', () => {
    expect(
      parseDomainServiceBindings({
        serviceBindings: {
          github: {
            repository: 'org/new-repo',
            defaultBranch: 'main',
          },
        },
        ideBuildContext: {
          activeRepository: 'org/old-repo',
          activeBranch: 'legacy',
        },
      }).github,
    ).toEqual({
      repository: 'org/new-repo',
      defaultBranch: 'main',
    });
  });

  it('validates owner/repo format', () => {
    const errors = validateGitHubBindingFields({
      repository: 'not-a-repo',
      defaultBranch: '',
    });
    expect(errors.repository).toBeTruthy();
    expect(errors.defaultBranch).toBeTruthy();
  });
});
