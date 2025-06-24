module.exports = {
  extends: ['./index.js'],
  env: {
    node: true,
    es6: true
  },
  rules: {
    // Node.js specific rules for Keeper Platform
    'no-console': 'off', // Console logging is acceptable in server code
    'no-process-exit': 'error',
    'no-process-env': 'off', // Environment variables are common in Node.js
    
    // CommonJS/ES Modules
    '@typescript-eslint/no-var-requires': 'off',
    
    // Error handling
    'handle-callback-err': 'error',
    'no-new-require': 'error',
    'no-path-concat': 'error',
    
    // Keeper Platform Node.js conventions
    'prefer-const': 'error',
    'no-var': 'error',
    
    // Import patterns for server code
    'no-restricted-imports': ['error', {
      patterns: [{
        group: ['../../../*'],
        message: 'Use workspace packages (@keeper/*) instead of deep relative imports'
      }]
    }]
  }
} 