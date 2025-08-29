// apps/web/.eslintrc.cjs
module.exports = {
  root: true,
  rules: {
    '@typescript-eslint/no-explicit-any': 'warn'
  },
  overrides: [
    {
      files: ['**/*.ts', '**/*.tsx'],
      rules: {
        '@typescript-eslint/no-unused-vars': ['warn', { 'argsIgnorePattern': '^_', 'varsIgnorePattern': '^_' }],
        '@typescript-eslint/no-empty-interface': 'warn',
        'no-case-declarations': 'warn'
      }
    }
  ]
};
