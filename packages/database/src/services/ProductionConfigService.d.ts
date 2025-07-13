/**
 * Production Configuration Service
 * Manages environment-specific settings, performance optimization, and production hardening
 */
import { PrismaClient } from '@prisma/client';
import { DomainCacheService } from './DomainCacheService';
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
export declare class ProductionConfigService {
    private prisma;
    private cacheService;
    private featureFlags;
    private config;
    private healthCheckInterval?;
    private readonly ENVIRONMENT_CONFIGS;
    constructor(prisma: PrismaClient, cacheService: DomainCacheService);
    /**
     * Initialize configuration based on environment
     */
    private initializeConfig;
    /**
     * Get base configuration
     */
    private getBaseConfig;
    /**
     * Get current configuration
     */
    getConfig(): ProductionConfig;
    /**
     * Get configuration for specific category
     */
    getConfigCategory<T extends keyof ProductionConfig>(category: T): ProductionConfig[T];
    /**
     * Update configuration for a specific category
     */
    updateConfig<T extends keyof ProductionConfig>(category: T, updates: Partial<ProductionConfig[T]>): void;
    /**
     * Validate configuration
     */
    validateConfig(): Promise<ConfigValidationResult>;
    /**
     * Get system health
     */
    getSystemHealth(): Promise<SystemHealth>;
    /**
     * Start health checks
     */
    private startHealthChecks;
    /**
     * Private helper methods
     */
    private mergeConfigs;
    private checkDatabaseHealth;
    private checkCacheHealth;
    private checkStorageHealth;
    private checkExternalServicesHealth;
    private getSystemMetrics;
    private checkHealthAlerts;
    private sendAlerts;
    /**
     * Cleanup method
     */
    cleanup(): void;
}
export default ProductionConfigService;
//# sourceMappingURL=ProductionConfigService.d.ts.map