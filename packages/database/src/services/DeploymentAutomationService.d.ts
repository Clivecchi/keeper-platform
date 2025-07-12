/**
 * Deployment Automation Service
 * Handles CI/CD, zero-downtime deployments, rollbacks, and production deployment orchestration
 */
import { PrismaClient } from '@prisma/client';
import { ProductionConfigService } from './ProductionConfigService';
import { MonitoringService } from './MonitoringService';
import { DomainCacheService } from './DomainCacheService';
export type DeploymentStatus = 'pending' | 'running' | 'success' | 'failed' | 'rolled_back';
export type DeploymentStrategy = 'rolling' | 'blue-green' | 'canary';
export type EnvironmentType = 'development' | 'staging' | 'production';
export interface DeploymentConfig {
    strategy: DeploymentStrategy;
    environment: EnvironmentType;
    version: string;
    branch: string;
    commit: string;
    buildId: string;
    healthCheck: {
        enabled: boolean;
        path: string;
        timeout: number;
        retries: number;
        interval: number;
    };
    rollback: {
        enabled: boolean;
        threshold: number;
        automatic: boolean;
        timeout: number;
    };
    scaling: {
        minInstances: number;
        maxInstances: number;
        targetCPU: number;
        targetMemory: number;
    };
    notifications: {
        channels: string[];
        onSuccess: boolean;
        onFailure: boolean;
        onRollback: boolean;
    };
}
export interface Deployment {
    id: string;
    version: string;
    branch: string;
    commit: string;
    buildId: string;
    status: DeploymentStatus;
    strategy: DeploymentStrategy;
    environment: EnvironmentType;
    config: DeploymentConfig;
    startTime: Date;
    endTime?: Date;
    duration?: number;
    deployedBy: string;
    artifacts: DeploymentArtifact[];
    steps: DeploymentStep[];
    healthChecks: HealthCheck[];
    rollbackInfo?: RollbackInfo;
    metadata?: Record<string, any>;
}
export interface DeploymentArtifact {
    id: string;
    name: string;
    type: 'docker' | 'archive' | 'binary' | 'config';
    url: string;
    checksum: string;
    size: number;
    createdAt: Date;
}
export interface DeploymentStep {
    id: string;
    name: string;
    description: string;
    status: 'pending' | 'running' | 'success' | 'failed' | 'skipped';
    startTime?: Date;
    endTime?: Date;
    duration?: number;
    output?: string;
    error?: string;
    retryCount: number;
    maxRetries: number;
}
export interface HealthCheck {
    id: string;
    timestamp: Date;
    status: 'healthy' | 'unhealthy' | 'unknown';
    responseTime: number;
    checks: Array<{
        name: string;
        status: 'pass' | 'fail' | 'warn';
        message?: string;
        duration: number;
    }>;
}
export interface RollbackInfo {
    triggeredBy: 'manual' | 'automatic';
    reason: string;
    previousVersion: string;
    rollbackTime: Date;
    rollbackDuration: number;
    success: boolean;
}
export interface DeploymentPipeline {
    id: string;
    name: string;
    description: string;
    stages: PipelineStage[];
    triggers: PipelineTrigger[];
    environment: EnvironmentType;
    enabled: boolean;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface PipelineStage {
    id: string;
    name: string;
    description: string;
    type: 'build' | 'test' | 'deploy' | 'validate' | 'notify';
    dependencies: string[];
    config: Record<string, any>;
    timeout: number;
    retryPolicy: {
        maxRetries: number;
        backoffStrategy: 'linear' | 'exponential';
        baseDelay: number;
    };
    conditions: Array<{
        type: 'always' | 'on_success' | 'on_failure' | 'manual';
        expression?: string;
    }>;
}
export interface PipelineTrigger {
    id: string;
    type: 'webhook' | 'schedule' | 'manual' | 'branch' | 'tag';
    config: Record<string, any>;
    enabled: boolean;
}
export interface BuildInfo {
    id: string;
    version: string;
    commit: string;
    branch: string;
    buildTime: Date;
    buildDuration: number;
    buildStatus: 'success' | 'failed';
    buildLogs: string;
    testResults?: TestResults;
    artifacts: DeploymentArtifact[];
    environment: Record<string, string>;
}
export interface TestResults {
    passed: number;
    failed: number;
    skipped: number;
    total: number;
    coverage: {
        lines: number;
        functions: number;
        branches: number;
        statements: number;
    };
    suites: Array<{
        name: string;
        tests: number;
        failures: number;
        errors: number;
        time: number;
    }>;
}
export interface DeploymentMetrics {
    totalDeployments: number;
    successfulDeployments: number;
    failedDeployments: number;
    rollbacks: number;
    averageDeploymentTime: number;
    leadTime: number;
    deploymentFrequency: number;
    meanTimeToRecovery: number;
    changeFailureRate: number;
}
export interface InfrastructureState {
    instances: Array<{
        id: string;
        status: 'running' | 'stopped' | 'starting' | 'stopping';
        version: string;
        health: 'healthy' | 'unhealthy' | 'unknown';
        cpu: number;
        memory: number;
        lastUpdate: Date;
    }>;
    loadBalancer: {
        status: 'active' | 'inactive';
        activeTargets: number;
        totalTargets: number;
        trafficDistribution: Record<string, number>;
    };
    database: {
        status: 'available' | 'unavailable';
        connections: number;
        replication: {
            status: 'healthy' | 'lagging' | 'failed';
            lag: number;
        };
    };
}
export declare class DeploymentAutomationService {
    private prisma;
    private configService;
    private monitoringService;
    private cacheService;
    private deployments;
    private pipelines;
    private activeDeployments;
    constructor(prisma: PrismaClient, configService: ProductionConfigService, monitoringService: MonitoringService, cacheService: DomainCacheService);
    /**
     * Create a new deployment
     */
    createDeployment(config: DeploymentConfig, deployedBy: string, artifacts: DeploymentArtifact[]): Promise<string>;
    /**
     * Start deployment
     */
    startDeployment(deploymentId: string): Promise<void>;
    /**
     * Rollback deployment
     */
    rollbackDeployment(deploymentId: string, triggeredBy: 'manual' | 'automatic', reason: string): Promise<void>;
    /**
     * Get deployment status
     */
    getDeploymentStatus(deploymentId: string): Promise<Deployment | null>;
    /**
     * Get deployment history
     */
    getDeploymentHistory(environment: EnvironmentType, limit?: number): Promise<Deployment[]>;
    /**
     * Get deployment metrics
     */
    getDeploymentMetrics(environment: EnvironmentType, timeRange?: string): Promise<DeploymentMetrics>;
    /**
     * Get infrastructure state
     */
    getInfrastructureState(): Promise<InfrastructureState>;
    /**
     * Create deployment pipeline
     */
    createPipeline(name: string, description: string, stages: PipelineStage[], triggers: PipelineTrigger[], environment: EnvironmentType, createdBy: string): Promise<string>;
    /**
     * Execute pipeline
     */
    executePipeline(pipelineId: string, context: Record<string, any>): Promise<string>;
    /**
     * Generate deployment configuration files
     */
    generateDeploymentConfig(environment: EnvironmentType, version: string): Promise<Record<string, string>>;
    /**
     * Private helper methods
     */
    private generateDeploymentSteps;
    private executeRollingDeployment;
    private executeBlueGreenDeployment;
    private executeCanaryDeployment;
    private executeDeploymentStep;
    private simulateStepExecution;
    private executeRollback;
    private getPreviousVersion;
    private sendDeploymentNotification;
    private executeStage;
    private generateKubernetesConfig;
    private generateDockerConfig;
    private generateNginxConfig;
    private loadPipelines;
}
export default DeploymentAutomationService;
//# sourceMappingURL=DeploymentAutomationService.d.ts.map