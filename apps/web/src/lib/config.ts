/**
 * Configuration and Feature Flags
 * ===============================
 * 
 * Centralized configuration management for the Keeper Platform.
 * Handles environment variables and feature flags.
 */

// Environment Variables
export const ENV = {
  NODE_ENV: import.meta.env.NODE_ENV || 'development',
  VITE_API_URL: import.meta.env.VITE_API_URL || '',
  VITE_APP_URL: import.meta.env.VITE_APP_URL || 'http://localhost:5173',
} as const;

// Feature Flags
export const FEATURE_FLAGS = {
  // Agent Home Board Draft Mode
  KEEPER_DRAFT_MODE: import.meta.env.VITE_KEEPER_DRAFT_MODE === 'true' || ENV.NODE_ENV === 'development',
  
  // Board Layout Editing
  BOARD_LAYOUT_EDITING: import.meta.env.VITE_BOARD_LAYOUT_EDITING === 'true' || true,
  
  // Props System
  PROPS_SYSTEM: import.meta.env.VITE_PROPS_SYSTEM === 'true' || ENV.NODE_ENV === 'development',
  
  // Advanced Agent Features
  AGENT_ADVANCED_CONFIG: import.meta.env.VITE_AGENT_ADVANCED_CONFIG === 'true' || false,
  
  // Debug Mode
  DEBUG_MODE: import.meta.env.VITE_DEBUG_MODE === 'true' || ENV.NODE_ENV === 'development',
} as const;

// Configuration Objects
export const CONFIG = {
  // API Configuration
  api: {
    baseUrl: ENV.VITE_API_URL || (ENV.NODE_ENV === 'production' ? '/api' : 'http://localhost:3001/api'),
    timeout: 10000,
  },
  
  // Board Configuration
  board: {
    maxFrames: 20,
    defaultLayout: 'column' as const,
    defaultEngagementMode: 'dialogic' as const,
    autosaveInterval: 5000, // 5 seconds
  },
  
  // Agent Configuration
  agent: {
    maxDraftHistory: 10,
    draftAutoSave: true,
    defaultModel: 'gpt-4',
    defaultProvider: 'openai',
  },
  
  // UI Configuration
  ui: {
    animationDuration: 300,
    toastDuration: 5000,
    maxSearchResults: 50,
  },
} as const;

// Feature Flag Utilities
export const isFeatureEnabled = (flag: keyof typeof FEATURE_FLAGS): boolean => {
  return FEATURE_FLAGS[flag];
};

export const getFeatureFlags = () => {
  return { ...FEATURE_FLAGS };
};

// Environment Utilities
export const isDevelopment = () => ENV.NODE_ENV === 'development';
export const isProduction = () => ENV.NODE_ENV === 'production';
export const isTest = () => ENV.NODE_ENV === 'test';

// Debug Utilities
export const debug = (...args: any[]) => {
  if (FEATURE_FLAGS.DEBUG_MODE) {
    console.log('[DEBUG]', ...args);
  }
};

export const debugWarn = (...args: any[]) => {
  if (FEATURE_FLAGS.DEBUG_MODE) {
    console.warn('[DEBUG]', ...args);
  }
};

export const debugError = (...args: any[]) => {
  if (FEATURE_FLAGS.DEBUG_MODE) {
    console.error('[DEBUG]', ...args);
  }
};

// Export everything as default for convenience
export default {
  ENV,
  FEATURE_FLAGS,
  CONFIG,
  isFeatureEnabled,
  getFeatureFlags,
  isDevelopment,
  isProduction,
  isTest,
  debug,
  debugWarn,
  debugError,
};
