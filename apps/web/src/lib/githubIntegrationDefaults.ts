/** Default GitHub repo for IDE Board integration (Option A — explicit domain build context). */
export const DEFAULT_GITHUB_REPOSITORY = 'Clivecchi/keeper-platform';
export const DEFAULT_GITHUB_BRANCH = 'main';

/** Placeholder shown in domain config UI before a real repo is saved. */
export const GITHUB_REPO_PLACEHOLDER = 'owner/repo';

export const DEFAULT_IDE_BUILD_CONTEXT = {
  activeRepository: DEFAULT_GITHUB_REPOSITORY,
  activeBranch: DEFAULT_GITHUB_BRANCH,
} as const;
