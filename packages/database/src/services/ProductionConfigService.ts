/**
 * Production Configuration Service
 * Manages environment-specific settings, performance optimization, and production hardening
 */

import { PrismaClient } from '@prisma/client';
import { DomainCacheService } from './DomainCacheService';
import { getFeatureFlagService } from './FeatureFlagService';
import * as crypto from 'crypto';

// Type utilities
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// Environment configuration types
export type Environment = 'development' | 'staging' | 'production' | 'test';
export type ConfigCategory = 'database' | 'cache' | 'security' | 'performance' | 'monitoring' | 'domain';

export interface ProductionConfig {
  environment: Environment;
  database: DatabaseConfig;
  cache: CacheConfig;
  security: SecurityConfig;
  performance: PerformanceConfig;
  monitoring: MonitoringConfig;
  domain: DomainConfig;
  features: FeatureConfig;
  deployment: DeploymentConfig;
}

export interface DatabaseConfig {
  connectionPool: {
    min: number;
    max: number;
    acquireTimeoutMillis: number;
    createTimeoutMillis: number;
    destroyTimeoutMillis: number;
    idleTimeoutMillis: number;
    reapIntervalMillis: number;
    createRetryIntervalMillis: number;
  };
  queryTimeout: number;
  statementTimeout: number;
  maxConnections: number;
  ssl: boolean;
  logging: boolean;
  slowQueryThreshold: number;
  readReplicas: string[];
  writeInstance: string;
  backup: {
    enabled: boolean;
    schedule: string;
    retention: number;
    encryption: boolean;
  };
}

export interface CacheConfig {
  redis: {
    host: string;
    port: number;
    password?: string;
    db: number;
    maxRetriesPerRequest: number;
    retryDelayOnFailover: number;
    enableOfflineQueue: boolean;
    maxMemoryPolicy: string;
    keyPrefix: string;
    cluster: {
      enabled: boolean;
      nodes: string[];
    };
  };
  ttl: {
    domain: number;
    permissions: number;
    user: number;
    session: number;
    shareToken: number;
  };
  compression: boolean;
  serialization: 'json' | 'msgpack';
  evictionPolicy: 'lru' | 'lfu' | 'ttl';
}

export interface SecurityConfig {
  cors: {
    enabled: boolean;
    allowedOrigins: string[];
    allowedMethods: string[];
    allowedHeaders: string[];
    credentials: boolean;
    maxAge: number;
    optionsSuccessStatus: number;
  };
  rateLimit: {
    windowMs: number;
    max: number;
    message: string;
    standardHeaders: boolean;
    legacyHeaders: boolean;
    skipSuccessfulRequests: boolean;
    skipFailedRequests: boolean;
    keyGenerator: string;
  };
  csrf: {
    enabled: boolean;
    secret: string;
    sameSite: 'strict' | 'lax' | 'none';
    secure: boolean;
  };
  helmet: {
    contentSecurityPolicy: {
      enabled: boolean;
      directives: Record<string, string[]>;
    };
    hsts: {
      enabled: boolean;
      maxAge: number;
      includeSubDomains: boolean;
      preload: boolean;
    };
    noSniff: boolean;
    xssFilter: boolean;
    referrerPolicy: string;
  };
  encryption: {
    algorithm: string;
    keyLength: number;
    ivLength: number;
    saltLength: number;
    iterations: number;
  };
  jwt: {
    secret: string;
    expiresIn: string;
    refreshExpiresIn: string;
    algorithm: string;
    issuer: string;
    audience: string;
  };
}

export interface PerformanceConfig {
  compression: {
    enabled: boolean;
    level: number;
    threshold: number;
    filter: string;
  };
  etag: {
    enabled: boolean;
    weak: boolean;
  };
  keepAlive: {
    enabled: boolean;
    timeout: number;
  };
  clustering: {
    enabled: boolean;
    workers: number;
    respawn: boolean;
    killTimeout: number;
  };
  gc: {
    enabled: boolean;
    interval: number;
    threshold: number;
  };
  limits: {
    requestSize: string;
    requestTimeout: number;
    concurrentRequests: number;
    memoryThreshold: number;
    cpuThreshold: number;
  };
}

export interface MonitoringConfig {
  logging: {
    level: string;
    format: 'json' | 'simple';
    destination: 'console' | 'file' | 'remote';
    rotation: {
      enabled: boolean;
      maxSize: string;
      maxFiles: number;
      datePattern: string;
    };
  };
  metrics: {
    enabled: boolean;
    interval: number;
    retention: number;
    aggregation: string[];
    export: {
      prometheus: boolean;
      datadog: boolean;
      newrelic: boolean;
    };
  };
  tracing: {
    enabled: boolean;
    sampleRate: number;
    jaeger: {
      endpoint: string;
      serviceName: string;
    };
  };
  alerting: {
    enabled: boolean;
    channels: string[];
    thresholds: {
      errorRate: number;
      responseTime: number;
      memoryUsage: number;
      cpuUsage: number;
      diskUsage: number;
    };
  };
  healthChecks: {
    enabled: boolean;
    interval: number;
    timeout: number;
    retries: number;
    endpoints: string[];
  };
}

export interface DomainConfig {
  verification: {
    ttl: number;
    retries: number;
    timeout: number;
    methods: string[];
  };
  ssl: {
    provider: 'letsencrypt' | 'cloudflare' | 'custom';
    autoRenewal: boolean;
    renewalThreshold: number;
    fallback: boolean;
  };
  dns: {
    propagationTimeout: number;
    verificationRetries: number;
    ttl: number;
    providers: string[];
  };
  cors: {
    dynamic: boolean;
    cacheTtl: number;
    fallbackOrigins: string[];
  };
  limits: {
    maxDomainsPerUser: number;
    maxSubdomains: number;
    customDomainRequiresVerification: boolean;
  };
}

export interface FeatureConfig {
  flags: Record<string, boolean>;
  rollout: Record<string, number>;
  experiments: Record<string, unknown>;
  deprecations: Record<string, string>;
}

export interface DeploymentConfig {
  strategy: 'rolling' | 'blue-green' | 'canary';
  healthCheck: {
    path: string;
    timeout: number;
    interval: number;
    retries: number;
  };
  rollback: {
    enabled: boolean;
    threshold: number;
    automatic: boolean;
  };
  scaling: {
    min: number;
    max: number;
    targetCPU: number;
    targetMemory: number;
  };
  gracefulShutdown: {
    timeout: number;
    signals: string[];
  };
}

export interface ConfigValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  recommendations: string[];
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  components: {
    database: ComponentHealth;
    cache: ComponentHealth;
    storage: ComponentHealth;
    external: ComponentHealth;
  };
  metrics: {
    uptime: number;
    responseTime: number;
    errorRate: number;
    throughput: number;
    memoryUsage: number;
    cpuUsage: number;
  };
  timestamp: Date;
}

export interface ComponentHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency: number;
  errorRate: number;
  lastCheck: Date;
  details?: string;
}

export class ProductionConfigService {
  private prisma: PrismaClient;
  private cacheService: DomainCacheService;
  private featureFlags = getFeatureFlagService();
  private config: ProductionConfig;
  private healthCheckInterval?: NodeJS.Timeout;

  // Environment-specific configurations
  private readonly ENVIRONMENT_CONFIGS: Record<Environment, DeepPartial<ProductionConfig>> = {
    development: {
      database: {
        connectionPool: { 
          min: 2, 
          max: 10,
          acquireTimeoutMillis: 60000,
          createTimeoutMillis: 30000,
          destroyTimeoutMillis: 5000,
          idleTimeoutMillis: 30000,
          reapIntervalMillis: 1000,
          createRetryIntervalMillis: 200,
        },
        queryTimeout: 10000,
        statementTimeout: 10000,
        maxConnections: 10,
        ssl: false,
        logging: true,
        slowQueryThreshold: 1000,
        readReplicas: [],
        writeInstance: '',
        backup: {
          enabled: false,
          schedule: '0 2 * * *',
          retention: 7,
          encryption: false,
        },
      },
      cache: {
        redis: {
          host: 'localhost',
          port: 6379,
          db: 0,
          maxRetriesPerRequest: 3,
          retryDelayOnFailover: 100,
          enableOfflineQueue: false,
          maxMemoryPolicy: 'allkeys-lru',
          keyPrefix: 'keeper:dev:',
          cluster: {
            enabled: false,
            nodes: [],
          },
        },
        ttl: { domain: 300, permissions: 180, user: 120, session: 600, shareToken: 3600 },
        compression: false,
        serialization: 'json',
        evictionPolicy: 'lru',
      },
      security: {
        cors: { 
          enabled: true,
          allowedOrigins: ['*'],
          allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
          allowedHeaders: ['Content-Type', 'Authorization', 'X-Domain-Context'],
          credentials: true,
          maxAge: 86400,
          optionsSuccessStatus: 200,
        },
        rateLimit: { 
          windowMs: 15 * 60 * 1000,
          max: 1000,
          message: 'Too many requests from this IP, please try again later.',
          standardHeaders: true,
          legacyHeaders: false,
          skipSuccessfulRequests: false,
          skipFailedRequests: false,
          keyGenerator: 'ip',
        },
        csrf: {
          enabled: false,
          secret: 'dev-csrf-secret',
          sameSite: 'lax',
          secure: false,
        },
        helmet: {
          contentSecurityPolicy: {
            enabled: false,
            directives: {},
          },
          hsts: {
            enabled: false,
            maxAge: 31536000,
            includeSubDomains: false,
            preload: false,
          },
          noSniff: true,
          xssFilter: true,
          referrerPolicy: 'no-referrer',
        },
        encryption: {
          algorithm: 'aes-256-gcm',
          keyLength: 32,
          ivLength: 16,
          saltLength: 32,
          iterations: 100000,
        },
        jwt: {
          secret: 'dev-jwt-secret',
          expiresIn: '1h',
          refreshExpiresIn: '7d',
          algorithm: 'HS256',
          issuer: 'keeper-dev',
          audience: 'keeper-dev',
        },
      },
      performance: {
        compression: { 
          enabled: false,
          level: 6,
          threshold: 1024,
          filter: 'text/*',
        },
        etag: {
          enabled: true,
          weak: false,
        },
        keepAlive: {
          enabled: true,
          timeout: 5000,
        },
        clustering: { 
          enabled: false,
          workers: 1,
          respawn: true,
          killTimeout: 5000,
        },
        gc: {
          enabled: false,
          interval: 60000,
          threshold: 80,
        },
        limits: {
          requestSize: '10mb',
          requestTimeout: 30000,
          concurrentRequests: 1000,
          memoryThreshold: 80,
          cpuThreshold: 80,
        },
      },
      monitoring: {
        logging: { 
          level: 'debug', 
          format: 'simple',
          destination: 'console',
          rotation: {
            enabled: false,
            maxSize: '10m',
            maxFiles: 5,
            datePattern: 'YYYY-MM-DD',
          },
        },
        metrics: { 
          enabled: true, 
          interval: 30000,
          retention: 86400,
          aggregation: ['avg', 'max', 'min'],
          export: {
            prometheus: false,
            datadog: false,
            newrelic: false,
          },
        },
        tracing: { 
          enabled: true, 
          sampleRate: 1.0,
          jaeger: {
            endpoint: 'http://localhost:14268/api/traces',
            serviceName: 'keeper-dev',
          },
        },
        alerting: {
          enabled: false,
          channels: ['console'],
          thresholds: {
            errorRate: 0.05,
            responseTime: 1000,
            memoryUsage: 80,
            cpuUsage: 80,
            diskUsage: 80,
          },
        },
        healthChecks: {
          enabled: true,
          interval: 30000,
          timeout: 5000,
          retries: 3,
          endpoints: ['/health'],
        },
      },
    },
    staging: {
      database: {
        connectionPool: { 
          min: 5, 
          max: 20,
          acquireTimeoutMillis: 60000,
          createTimeoutMillis: 30000,
          destroyTimeoutMillis: 5000,
          idleTimeoutMillis: 30000,
          reapIntervalMillis: 1000,
          createRetryIntervalMillis: 200,
        },
      },
      cache: {
        ttl: { domain: 600, permissions: 300, user: 300, session: 1800, shareToken: 7200 },
        compression: true,
      },
      security: {
        cors: { 
          enabled: true,
          allowedOrigins: ['https://staging.keeper.tools'],
          allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
          allowedHeaders: ['Content-Type', 'Authorization', 'X-Domain-Context'],
          credentials: true,
          maxAge: 86400,
          optionsSuccessStatus: 200,
        },
        rateLimit: { 
          windowMs: 15 * 60 * 1000,
          max: 500,
          message: 'Too many requests from this IP, please try again later.',
          standardHeaders: true,
          legacyHeaders: false,
          skipSuccessfulRequests: false,
          skipFailedRequests: false,
          keyGenerator: 'ip',
        },
      },
      performance: {
        compression: { 
          enabled: true,
          level: 6,
          threshold: 1024,
          filter: 'text/*',
        },
        clustering: { 
          enabled: false,
          workers: 1,
          respawn: true,
          killTimeout: 5000,
        },
      },
      monitoring: {
        logging: { 
          level: 'info', 
          format: 'json',
          destination: 'console',
          rotation: {
            enabled: false,
            maxSize: '10m',
            maxFiles: 5,
            datePattern: 'YYYY-MM-DD',
          },
        },
        metrics: { 
          enabled: true, 
          interval: 15000,
          retention: 86400,
          aggregation: ['avg', 'max'],
          export: {
            prometheus: true,
            datadog: false,
            newrelic: false,
          },
        },
        tracing: { 
          enabled: true, 
          sampleRate: 0.1,
          jaeger: {
            endpoint: 'http://localhost:14268/api/traces',
            serviceName: 'keeper-staging',
          },
        },
      },
    },
    production: {
      database: {
        connectionPool: { min: 10, max: 50 },
        queryTimeout: 30000,
        logging: false,
        ssl: true,
      },
      cache: {
        ttl: { domain: 1800, permissions: 600, user: 600, session: 3600, shareToken: 14400 },
        compression: true,
      },
      security: {
        cors: { allowedOrigins: ['https://keeper.tools', 'https://app.keeper.tools'] },
        rateLimit: { max: 200 },
      },
      performance: {
        compression: { enabled: true },
        clustering: { enabled: true, workers: 0 },
      },
      monitoring: {
        logging: { level: 'warn', format: 'json' },
        metrics: { enabled: true, interval: 10000 },
        tracing: { enabled: true, sampleRate: 0.01 },
      },
    },
    test: {
      database: {
        connectionPool: { min: 1, max: 5 },
        queryTimeout: 5000,
        logging: false,
        ssl: false,
      },
      cache: {
        ttl: { domain: 60, permissions: 30, user: 30, session: 120, shareToken: 300 },
        compression: false,
      },
      security: {
        cors: { allowedOrigins: ['*'] },
        rateLimit: { max: 10000 },
      },
      performance: {
        compression: { enabled: false },
        clustering: { enabled: false },
      },
      monitoring: {
        logging: { level: 'error', format: 'simple' },
        metrics: { enabled: false },
        tracing: { enabled: false },
      },
    },
  };

  constructor(prisma: PrismaClient, cacheService: DomainCacheService) {
    this.prisma = prisma;
    this.cacheService = cacheService;
    this.config = this.initializeConfig();
    this.startHealthChecks();
  }

  /**
   * Initialize configuration based on environment
   */
  private initializeConfig(): ProductionConfig {
    const environment = (process.env.NODE_ENV as Environment) || 'development';
    const baseConfig = this.getBaseConfig();
    const envConfig = this.ENVIRONMENT_CONFIGS[environment];

    return this.mergeConfigs(baseConfig, envConfig as unknown as ProductionConfig);
  }

  /**
   * Get base configuration
   */
  private getBaseConfig(): ProductionConfig {
    return {
      environment: (process.env.NODE_ENV as Environment) || 'development',
      database: {
        connectionPool: {
          min: parseInt(process.env.DB_POOL_MIN || '2'),
          max: parseInt(process.env.DB_POOL_MAX || '10'),
          acquireTimeoutMillis: 60000,
          createTimeoutMillis: 30000,
          destroyTimeoutMillis: 5000,
          idleTimeoutMillis: 30000,
          reapIntervalMillis: 1000,
          createRetryIntervalMillis: 200,
        },
        queryTimeout: parseInt(process.env.DB_QUERY_TIMEOUT || '30000'),
        statementTimeout: parseInt(process.env.DB_STATEMENT_TIMEOUT || '30000'),
        maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '50'),
        ssl: process.env.DB_SSL === 'true',
        logging: process.env.DB_LOGGING === 'true',
        slowQueryThreshold: parseInt(process.env.DB_SLOW_QUERY_THRESHOLD || '1000'),
        readReplicas: process.env.DB_READ_REPLICAS?.split(',') || [],
        writeInstance: process.env.DB_WRITE_INSTANCE || process.env.DATABASE_URL || '',
        backup: {
          enabled: process.env.DB_BACKUP_ENABLED === 'true',
          schedule: process.env.DB_BACKUP_SCHEDULE || '0 2 * * *',
          retention: parseInt(process.env.DB_BACKUP_RETENTION || '30'),
          encryption: process.env.DB_BACKUP_ENCRYPTION === 'true',
        },
      },
      cache: {
        redis: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
          password: process.env.REDIS_PASSWORD,
          db: parseInt(process.env.REDIS_DB || '0'),
          maxRetriesPerRequest: 3,
          retryDelayOnFailover: 100,
          enableOfflineQueue: false,
          maxMemoryPolicy: 'allkeys-lru',
          keyPrefix: process.env.REDIS_KEY_PREFIX || 'keeper:',
          cluster: {
            enabled: process.env.REDIS_CLUSTER_ENABLED === 'true',
            nodes: process.env.REDIS_CLUSTER_NODES?.split(',') || [],
          },
        },
        ttl: {
          domain: 1800,
          permissions: 600,
          user: 600,
          session: 3600,
          shareToken: 14400,
        },
        compression: true,
        serialization: 'json',
        evictionPolicy: 'lru',
      },
      security: {
        cors: {
          enabled: true,
          allowedOrigins: process.env.CORS_ORIGINS?.split(',') || ['*'],
          allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
          allowedHeaders: ['Content-Type', 'Authorization', 'X-Domain-Context'],
          credentials: true,
          maxAge: 86400,
          optionsSuccessStatus: 200,
        },
        rateLimit: {
          windowMs: 15 * 60 * 1000, // 15 minutes
          max: 100,
          message: 'Too many requests from this IP, please try again later.',
          standardHeaders: true,
          legacyHeaders: false,
          skipSuccessfulRequests: false,
          skipFailedRequests: false,
          keyGenerator: 'ip',
        },
        csrf: {
          enabled: process.env.CSRF_ENABLED === 'true',
          secret: process.env.CSRF_SECRET || crypto.randomBytes(32).toString('hex'),
          sameSite: 'strict',
          secure: process.env.NODE_ENV === 'production',
        },
        helmet: {
          contentSecurityPolicy: {
            enabled: true,
            directives: {
              defaultSrc: ["'self'"],
              styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
              fontSrc: ["'self'", 'https://fonts.gstatic.com'],
              imgSrc: ["'self'", 'data:', 'https:'],
              scriptSrc: ["'self'"],
              connectSrc: ["'self'"],
              frameSrc: ["'none'"],
              objectSrc: ["'none'"],
            },
          },
          hsts: {
            enabled: true,
            maxAge: 31536000,
            includeSubDomains: true,
            preload: true,
          },
          noSniff: true,
          xssFilter: true,
          referrerPolicy: 'same-origin',
        },
        encryption: {
          algorithm: 'aes-256-gcm',
          keyLength: 32,
          ivLength: 16,
          saltLength: 32,
          iterations: 100000,
        },
        jwt: {
          secret: process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex'),
          expiresIn: process.env.JWT_EXPIRES_IN || '24h',
          refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
          algorithm: 'HS256',
          issuer: process.env.JWT_ISSUER || 'keeper.tools',
          audience: process.env.JWT_AUDIENCE || 'keeper.tools',
        },
      },
      performance: {
        compression: {
          enabled: true,
          level: 6,
          threshold: 1024,
          filter: 'application/json',
        },
        etag: {
          enabled: true,
          weak: false,
        },
        keepAlive: {
          enabled: true,
          timeout: 5000,
        },
        clustering: {
          enabled: process.env.CLUSTERING_ENABLED === 'true',
          workers: parseInt(process.env.CLUSTERING_WORKERS || '0'),
          respawn: true,
          killTimeout: 30000,
        },
        gc: {
          enabled: process.env.GC_ENABLED === 'true',
          interval: 60000,
          threshold: 0.85,
        },
        limits: {
          requestSize: process.env.REQUEST_SIZE_LIMIT || '50mb',
          requestTimeout: parseInt(process.env.REQUEST_TIMEOUT || '30000'),
          concurrentRequests: parseInt(process.env.CONCURRENT_REQUESTS || '1000'),
          memoryThreshold: parseFloat(process.env.MEMORY_THRESHOLD || '0.85'),
          cpuThreshold: parseFloat(process.env.CPU_THRESHOLD || '0.80'),
        },
      },
      monitoring: {
        logging: {
          level: process.env.LOG_LEVEL || 'info',
          format: process.env.LOG_FORMAT as 'json' | 'simple' || 'json',
          destination: process.env.LOG_DESTINATION as 'console' | 'file' | 'remote' || 'console',
          rotation: {
            enabled: process.env.LOG_ROTATION_ENABLED === 'true',
            maxSize: process.env.LOG_MAX_SIZE || '100m',
            maxFiles: parseInt(process.env.LOG_MAX_FILES || '14'),
            datePattern: process.env.LOG_DATE_PATTERN || 'YYYY-MM-DD',
          },
        },
        metrics: {
          enabled: process.env.METRICS_ENABLED === 'true',
          interval: parseInt(process.env.METRICS_INTERVAL || '30000'),
          retention: parseInt(process.env.METRICS_RETENTION || '604800'), // 7 days
          aggregation: ['avg', 'min', 'max', 'p95', 'p99'],
          export: {
            prometheus: process.env.PROMETHEUS_ENABLED === 'true',
            datadog: process.env.DATADOG_ENABLED === 'true',
            newrelic: process.env.NEWRELIC_ENABLED === 'true',
          },
        },
        tracing: {
          enabled: process.env.TRACING_ENABLED === 'true',
          sampleRate: parseFloat(process.env.TRACING_SAMPLE_RATE || '0.1'),
          jaeger: {
            endpoint: process.env.JAEGER_ENDPOINT || 'http://localhost:14268/api/traces',
            serviceName: process.env.JAEGER_SERVICE_NAME || 'keeper-api',
          },
        },
        alerting: {
          enabled: process.env.ALERTING_ENABLED === 'true',
          channels: process.env.ALERT_CHANNELS?.split(',') || ['email'],
          thresholds: {
            errorRate: parseFloat(process.env.ALERT_ERROR_RATE || '0.05'),
            responseTime: parseInt(process.env.ALERT_RESPONSE_TIME || '2000'),
            memoryUsage: parseFloat(process.env.ALERT_MEMORY_USAGE || '0.85'),
            cpuUsage: parseFloat(process.env.ALERT_CPU_USAGE || '0.80'),
            diskUsage: parseFloat(process.env.ALERT_DISK_USAGE || '0.85'),
          },
        },
        healthChecks: {
          enabled: process.env.HEALTH_CHECKS_ENABLED === 'true',
          interval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000'),
          timeout: parseInt(process.env.HEALTH_CHECK_TIMEOUT || '5000'),
          retries: parseInt(process.env.HEALTH_CHECK_RETRIES || '3'),
          endpoints: process.env.HEALTH_CHECK_ENDPOINTS?.split(',') || ['/health'],
        },
      },
      domain: {
        verification: {
          ttl: parseInt(process.env.DOMAIN_VERIFICATION_TTL || '3600'),
          retries: parseInt(process.env.DOMAIN_VERIFICATION_RETRIES || '3'),
          timeout: parseInt(process.env.DOMAIN_VERIFICATION_TIMEOUT || '30000'),
          methods: process.env.DOMAIN_VERIFICATION_METHODS?.split(',') || ['DNS_TXT', 'DNS_CNAME'],
        },
        ssl: {
          provider: process.env.SSL_PROVIDER as 'letsencrypt' | 'cloudflare' | 'custom' || 'letsencrypt',
          autoRenewal: process.env.SSL_AUTO_RENEWAL === 'true',
          renewalThreshold: parseInt(process.env.SSL_RENEWAL_THRESHOLD || '30'),
          fallback: process.env.SSL_FALLBACK === 'true',
        },
        dns: {
          propagationTimeout: parseInt(process.env.DNS_PROPAGATION_TIMEOUT || '300000'),
          verificationRetries: parseInt(process.env.DNS_VERIFICATION_RETRIES || '5'),
          ttl: parseInt(process.env.DNS_TTL || '300'),
          providers: process.env.DNS_PROVIDERS?.split(',') || ['cloudflare', 'route53'],
        },
        cors: {
          dynamic: process.env.DYNAMIC_CORS === 'true',
          cacheTtl: parseInt(process.env.CORS_CACHE_TTL || '300'),
          fallbackOrigins: process.env.CORS_FALLBACK_ORIGINS?.split(',') || [],
        },
        limits: {
          maxDomainsPerUser: parseInt(process.env.MAX_DOMAINS_PER_USER || '5'),
          maxSubdomains: parseInt(process.env.MAX_SUBDOMAINS || '10'),
          customDomainRequiresVerification: process.env.CUSTOM_DOMAIN_VERIFICATION === 'true',
        },
      },
      features: {
        flags: {},
        rollout: {},
        experiments: {},
        deprecations: {},
      },
      deployment: {
        strategy: process.env.DEPLOYMENT_STRATEGY as 'rolling' | 'blue-green' | 'canary' || 'rolling',
        healthCheck: {
          path: process.env.DEPLOYMENT_HEALTH_PATH || '/health',
          timeout: parseInt(process.env.DEPLOYMENT_HEALTH_TIMEOUT || '30000'),
          interval: parseInt(process.env.DEPLOYMENT_HEALTH_INTERVAL || '10000'),
          retries: parseInt(process.env.DEPLOYMENT_HEALTH_RETRIES || '3'),
        },
        rollback: {
          enabled: process.env.DEPLOYMENT_ROLLBACK_ENABLED === 'true',
          threshold: parseFloat(process.env.DEPLOYMENT_ROLLBACK_THRESHOLD || '0.1'),
          automatic: process.env.DEPLOYMENT_AUTO_ROLLBACK === 'true',
        },
        scaling: {
          min: parseInt(process.env.DEPLOYMENT_MIN_REPLICAS || '2'),
          max: parseInt(process.env.DEPLOYMENT_MAX_REPLICAS || '10'),
          targetCPU: parseFloat(process.env.DEPLOYMENT_TARGET_CPU || '0.70'),
          targetMemory: parseFloat(process.env.DEPLOYMENT_TARGET_MEMORY || '0.80'),
        },
        gracefulShutdown: {
          timeout: parseInt(process.env.GRACEFUL_SHUTDOWN_TIMEOUT || '30000'),
          signals: process.env.GRACEFUL_SHUTDOWN_SIGNALS?.split(',') || ['SIGTERM', 'SIGINT'],
        },
      },
    };
  }

  /**
   * Get current configuration
   */
  getConfig(): ProductionConfig {
    return this.config;
  }

  /**
   * Get configuration for specific category
   */
  getConfigCategory<T extends keyof ProductionConfig>(category: T): ProductionConfig[T] {
    return this.config[category];
  }

  /**
   * Update configuration for a specific category
   */
  updateConfig<T extends keyof ProductionConfig>(
    category: T,
    updates: Partial<ProductionConfig[T]>
  ): void {
    // Fix: Properly type the configuration categories to handle spread operations
    const existingConfig = (this.config[category] as unknown) as Record<string, unknown>;
    const updatesConfig = (updates as unknown) as Record<string, unknown>;
    
    // Cast back to the proper type after merging via unknown
    this.config[category] = ({ 
      ...existingConfig, 
      ...updatesConfig 
    } as unknown) as ProductionConfig[T];
  }

  /**
   * Validate configuration
   */
  async validateConfig(): Promise<ConfigValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Validate database configuration
    if (this.config.database.connectionPool.max < this.config.database.connectionPool.min) {
      errors.push('Database max connections must be greater than min connections');
    }

    // Validate cache configuration
    if (this.config.cache.ttl.domain < 60) {
      warnings.push('Domain cache TTL is very low, may impact performance');
    }

    // Validate security configuration
    if (this.config.environment === 'production') {
      if (this.config.security.cors.allowedOrigins.includes('*')) {
        errors.push('Wildcard CORS origins not allowed in production');
      }
      
      if (!this.config.security.csrf.enabled) {
        warnings.push('CSRF protection should be enabled in production');
      }
      
      if (!this.config.security.helmet.hsts.enabled) {
        warnings.push('HSTS should be enabled in production');
      }
    }

    // Validate performance configuration
    if (this.config.performance.clustering.enabled && this.config.performance.clustering.workers === 0) {
      recommendations.push('Consider setting explicit worker count for clustering');
    }

    // Validate monitoring configuration
    if (!this.config.monitoring.metrics.enabled) {
      warnings.push('Metrics collection is disabled, limiting observability');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      recommendations,
    };
  }

  /**
   * Get system health
   */
  async getSystemHealth(): Promise<SystemHealth> {
    const [databaseHealth, cacheHealth, storageHealth] = await Promise.all([
      this.checkDatabaseHealth(),
      this.checkCacheHealth(),
      this.checkStorageHealth(),
    ]);

    const externalHealth = await this.checkExternalServicesHealth();

    // Calculate overall status
    const componentStatuses = [databaseHealth, cacheHealth, storageHealth, externalHealth];
    const unhealthyCount = componentStatuses.filter(c => c.status === 'unhealthy').length;
    const degradedCount = componentStatuses.filter(c => c.status === 'degraded').length;

    let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
    if (unhealthyCount > 0) {
      overallStatus = 'unhealthy';
    } else if (degradedCount > 0) {
      overallStatus = 'degraded';
    } else {
      overallStatus = 'healthy';
    }

    // Get system metrics
    const metrics = await this.getSystemMetrics();

    return {
      status: overallStatus,
      components: {
        database: databaseHealth,
        cache: cacheHealth,
        storage: storageHealth,
        external: externalHealth,
      },
      metrics,
      timestamp: new Date(),
    };
  }

  /**
   * Start health checks
   */
  private startHealthChecks(): void {
    if (!this.config.monitoring.healthChecks.enabled) {
      return;
    }

    this.healthCheckInterval = setInterval(async () => {
      try {
        const health = await this.getSystemHealth();
        
        // Store health data
        await this.cacheService.cacheData(
          'system:health',
          health,
          this.config.monitoring.healthChecks.interval / 1000
        );

        // Check for alerts
        await this.checkHealthAlerts(health);
      } catch (error) {
        console.error('Health check failed:', error);
      }
    }, this.config.monitoring.healthChecks.interval);
  }

  /**
   * Private helper methods
   */
  private mergeConfigs(base: ProductionConfig, override: ProductionConfig): ProductionConfig {
    const result: ProductionConfig = { ...base };
    
    // Use Object.entries to avoid index signature issues
    for (const [key, value] of Object.entries(override)) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        // Use type-safe access with proper casting
        const baseValue = ((base as unknown) as Record<string, unknown>)[key] || {};
        ((result as unknown) as Record<string, unknown>)[key] = this.mergeConfigs(
          baseValue as ProductionConfig, 
          value as ProductionConfig
        );
      } else {
        // Use type-safe assignment
        ((result as unknown) as Record<string, unknown>)[key] = value;
      }
    }
    
    return result;
  }

  private async checkDatabaseHealth(): Promise<ComponentHealth> {
    const startTime = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      const latency = Date.now() - startTime;
      
      return {
        status: latency < 100 ? 'healthy' : latency < 500 ? 'degraded' : 'unhealthy',
        latency,
        errorRate: 0,
        lastCheck: new Date(),
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        latency: Date.now() - startTime,
        errorRate: 1,
        lastCheck: new Date(),
        details: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async checkCacheHealth(): Promise<ComponentHealth> {
    const startTime = Date.now();
    try {
      const testKey = 'health:test';
      await this.cacheService.cacheData(testKey, 'test', 60);
      const result = await this.cacheService.getData(testKey);
      await this.cacheService.deleteData(testKey);
      
      const latency = Date.now() - startTime;
      const isWorking = result === 'test';
      
      return {
        status: isWorking && latency < 50 ? 'healthy' : latency < 200 ? 'degraded' : 'unhealthy',
        latency,
        errorRate: isWorking ? 0 : 1,
        lastCheck: new Date(),
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        latency: Date.now() - startTime,
        errorRate: 1,
        lastCheck: new Date(),
        details: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async checkStorageHealth(): Promise<ComponentHealth> {
    // This would check file system, S3, etc.
    // For now, return healthy
    return {
      status: 'healthy',
      latency: 0,
      errorRate: 0,
      lastCheck: new Date(),
    };
  }

  private async checkExternalServicesHealth(): Promise<ComponentHealth> {
    // This would check external APIs, webhooks, etc.
    // For now, return healthy
    return {
      status: 'healthy',
      latency: 0,
      errorRate: 0,
      lastCheck: new Date(),
    };
  }

  private async getSystemMetrics(): Promise<SystemHealth['metrics']> {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    return {
      uptime: process.uptime(),
      responseTime: 0, // Would be calculated from request metrics
      errorRate: 0, // Would be calculated from error metrics
      throughput: 0, // Would be calculated from request metrics
      memoryUsage: memoryUsage.heapUsed / memoryUsage.heapTotal,
      cpuUsage: (cpuUsage.user + cpuUsage.system) / 1000000, // Convert to seconds
    };
  }

  private async checkHealthAlerts(health: SystemHealth): Promise<void> {
    const { alerting } = this.config.monitoring;
    
    if (!alerting.enabled) {
      return;
    }

    const alerts: string[] = [];

    // Check thresholds
    if (health.metrics.errorRate > alerting.thresholds.errorRate) {
      alerts.push(`High error rate: ${health.metrics.errorRate}`);
    }

    if (health.metrics.responseTime > alerting.thresholds.responseTime) {
      alerts.push(`High response time: ${health.metrics.responseTime}ms`);
    }

    if (health.metrics.memoryUsage > alerting.thresholds.memoryUsage) {
      alerts.push(`High memory usage: ${(health.metrics.memoryUsage * 100).toFixed(1)}%`);
    }

    if (health.metrics.cpuUsage > alerting.thresholds.cpuUsage) {
      alerts.push(`High CPU usage: ${(health.metrics.cpuUsage * 100).toFixed(1)}%`);
    }

    // Send alerts if any
    if (alerts.length > 0) {
      await this.sendAlerts(alerts);
    }
  }

  private async sendAlerts(alerts: string[]): Promise<void> {
    // Implementation for sending alerts via configured channels
    console.warn('ALERTS:', alerts);
  }

  /**
   * Cleanup method
   */
  cleanup(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
  }
}

export default ProductionConfigService; 