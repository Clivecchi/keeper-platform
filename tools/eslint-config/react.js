module.exports = {
  extends: [
    './index.js',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended'
  ],
  plugins: ['react', 'react-hooks'],
  parserOptions: {
    ecmaFeatures: {
      jsx: true
    }
  },
  env: {
    browser: true,
    es6: true
  },
  settings: {
    react: {
      version: 'detect'
    }
  },
  rules: {
    // React specific rules for Keeper Platform
    'react/react-in-jsx-scope': 'off', // Not needed with React 17+
    'react/prop-types': 'off', // Using TypeScript instead
    'react/display-name': 'warn',
    'react/no-unescaped-entities': 'warn',
    'react/jsx-uses-react': 'off', // Not needed with React 17+
    'react/jsx-uses-vars': 'error',
    'react/jsx-key': 'error',
    'react/jsx-no-duplicate-props': 'error',
    'react/jsx-no-undef': 'error',
    'react/no-deprecated': 'warn',
    'react/no-direct-mutation-state': 'error',
    'react/no-unknown-property': 'error',
    
    // React Hooks rules
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
    
    // Keeper Platform React conventions
    'react/function-component-definition': ['warn', {
      namedComponents: 'function-declaration',
      unnamedComponents: 'arrow-function'
    }],
    
    // JSX formatting
    'react/jsx-fragments': ['warn', 'syntax'],
    'react/jsx-boolean-value': ['warn', 'never'],
    'react/jsx-curly-brace-presence': ['warn', {
      props: 'never',
      children: 'never'
    }]
  }
} 