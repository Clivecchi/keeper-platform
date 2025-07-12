/**
 * Domain Health Monitoring Service
 * Comprehensive monitoring for uptime, performance, security, and domain health
 */
import { PrismaClient } from '@prisma/client';
import { DomainService } from './DomainService';
import { DomainVerificationService } from './DomainVerificationService';
import { SslCertificateService } from './SslCertificateService';
import { DomainCacheService } from './DomainCacheService';
export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
export type AlertSeverity = 'info' | 'warning' | 'error' | 'critical';
export interface DomainHealthMetrics {
    domainId: string;
    slug: string;
    customDomain?: string;
    status: HealthStatus;
    score: number;
    uptime: {
        percentage24h: number;
        percentage7d: number;
        percentage30d: number;
    };
    performance: {
        averageResponseTime: number;
        p95ResponseTime: number;
        errorRate: number;
    };
    security: {
        securityHeaders: {
            score: number;
            missing: string[];
            warnings: string[];
        };
    };
    dns: {
        recordsValid: boolean;
    };
    alerts: DomainAlert[];
    lastChecked: Date;
}
export interface DomainAlert {
    id: string;
    type: string;
    severity: AlertSeverity;
    message: string;
    timestamp: Date;
    resolved: boolean;
    resolvedAt?: Date;
}
export interface SystemHealthSummary {
    totalDomains: number;
    healthyDomains: number;
    degradedDomains: number;
    unhealthyDomains: number;
    averageScore: number;
    averageUptime: number;
    totalAlerts: number;
    criticalAlerts: number;
    lastUpdated: Date;
}
export interface HealthCheckConfig {
    interval: number;
    timeout: number;
    retries: number;
    expectedStatus: number[];
    expectedHeaders: Record<string, string>;
    expectedContent?: string;
    regions: string[];
    notifications: {
        email: string[];
        webhook?: string;
        slack?: string;
    };
}
export interface MonitoringReport {
    summary: {
        totalDomains: number;
        healthyDomains: number;
        degradedDomains: number;
        unhealthyDomains: number;
        averageScore: number;
        averageUptime: number;
        totalAlerts: number;
        criticalAlerts: number;
    };
    domains: DomainHealthMetrics[];
    trends: {
        uptimeChange: number;
        performanceChange: number;
        securityChange: number;
    };
    topIssues: Array<{
        issue: string;
        count: number;
        severity: AlertSeverity;
    }>;
}
export declare class DomainHealthMonitoringService {
    private prisma;
    private domainService;
    private verificationService;
    private sslService;
    private cacheService;
    private featureFlags;
    private readonly REGIONS;
    private readonly SECURITY_HEADERS;
    constructor(prisma: PrismaClient, domainService: DomainService, verificationService: DomainVerificationService, sslService: SslCertificateService, cacheService: DomainCacheService);
    /**
     * Check health for a specific domain
     */
    checkDomainHealth(domainId: string): Promise<DomainHealthMetrics>;
    /**
     * Get system-wide health summary
     */
    getSystemHealthSummary(): Promise<SystemHealthSummary>;
    /**
     * Get all domains - implement missing method
     */
    private getAllDomains;
    /**
     * Check domain performance metrics
     */
    private checkDomainPerformance;
    /**
     * Get uptime metrics for a domain
     */
    private getUptimeMetrics;
    /**
     * Get active alerts for a domain
     */
    private getActiveAlerts;
    /**
     * Calculate health score based on metrics
     */
    private calculateHealthScore;
    /**
     * Determine health status based on score and alerts
     */
    private determineHealthStatus;
    /**
     * Generate monitoring report
     */
    generateMonitoringReport(timeRange?: '24h' | '7d' | '30d'): Promise<MonitoringReport>;
    /**
     * Private helper methods
     */
    private getUptimeHistory;
    private getPerformanceHistory;
    private analyzeSecurityHeaders;
    private calculateApdexScore;
    private testConnectivity;
    private checkGdprCompliance;
    private checkAccessibility;
    private checkSeo;
    private generateRecommendations;
    private storeHealthMetrics;
    private checkAlertConditions;
    private aggregateTopIssues;
    private getSeverityLevel;
}
export default DomainHealthMonitoringService;
//# sourceMappingURL=DomainHealthMonitoringService.d.ts.map