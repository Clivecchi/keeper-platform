/**
 * Monitoring and Observability Service
 * Comprehensive monitoring, metrics collection, alerting, and performance tracking
 */
import { PrismaClient } from '@prisma/client';
import { DomainCacheService } from './DomainCacheService';
import { ProductionConfigService } from './ProductionConfigService';
export type MetricType = 'counter' | 'gauge' | 'histogram' | 'summary';
export type AlertSeverity = 'info' | 'warning' | 'error' | 'critical';
export type AlertChannel = 'email' | 'slack' | 'webhook' | 'sms' | 'pagerduty';
export interface Metric {
    name: string;
    type: MetricType;
    description: string;
    labels?: Record<string, string>;
    value: number;
    timestamp: Date;
    tags?: Record<string, string>;
}
export interface PerformanceMetrics {
    responseTime: {
        avg: number;
        p50: number;
        p95: number;
        p99: number;
        max: number;
    };
    throughput: {
        requestsPerSecond: number;
        requestsPerMinute: number;
        totalRequests: number;
    };
    errorRate: {
        percentage: number;
        total: number;
        byType: Record<string, number>;
    };
    availability: {
        uptime: number;
        uptimePercentage: number;
        lastDowntime?: Date;
    };
}
export interface SystemMetrics {
    cpu: {
        usage: number;
        loadAverage: number[];
        processes: number;
    };
    memory: {
        used: number;
        available: number;
        percentage: number;
        heapUsed: number;
        heapTotal: number;
    };
    disk: {
        used: number;
        available: number;
        percentage: number;
        readOps: number;
        writeOps: number;
    };
    network: {
        bytesIn: number;
        bytesOut: number;
        connectionsActive: number;
        connectionsTotal: number;
    };
}
export interface DomainMetrics {
    domainId: string;
    requests: number;
    users: number;
    shares: number;
    collaborations: number;
    storage: number;
    bandwidth: number;
    errors: number;
    responseTime: number;
    timestamp: Date;
}
export interface Alert {
    id: string;
    severity: AlertSeverity;
    title: string;
    description: string;
    source: string;
    timestamp: Date;
    resolved?: Date;
    resolvedBy?: string;
    metadata?: Record<string, unknown>;
    channels: AlertChannel[];
    escalationLevel: number;
    acknowledged?: Date;
    acknowledgedBy?: string;
}
export interface AlertRule {
    id: string;
    name: string;
    description: string;
    metric: string;
    operator: 'gt' | 'lt' | 'eq' | 'ne' | 'gte' | 'lte';
    threshold: number;
    duration: number;
    severity: AlertSeverity;
    channels: AlertChannel[];
    enabled: boolean;
    tags?: Record<string, string>;
    escalation?: {
        levels: Array<{
            delay: number;
            channels: AlertChannel[];
            severity: AlertSeverity;
        }>;
    };
}
export interface Dashboard {
    id: string;
    name: string;
    description: string;
    widgets: DashboardWidget[];
    layout: DashboardLayout;
    public: boolean;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface DashboardWidget {
    id: string;
    type: 'chart' | 'metric' | 'table' | 'alert' | 'log';
    title: string;
    query: string;
    timeRange: string;
    refreshInterval: number;
    config: Record<string, unknown>;
    position: {
        x: number;
        y: number;
        w: number;
        h: number;
    };
}
export interface DashboardLayout {
    columns: number;
    rows: number;
    gridSize: number;
}
export interface LogEntry {
    id: string;
    timestamp: Date;
    level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
    message: string;
    source: string;
    userId?: string;
    domainId?: string;
    requestId?: string;
    metadata?: Record<string, unknown>;
    stackTrace?: string;
}
export interface TraceSpan {
    traceId: string;
    spanId: string;
    parentSpanId?: string;
    operationName: string;
    startTime: Date;
    endTime?: Date;
    duration?: number;
    tags: Record<string, unknown>;
    logs: Array<{
        timestamp: Date;
        fields: Record<string, unknown>;
    }>;
    status: {
        code: number;
        message?: string;
    };
}
export interface MonitoringReport {
    period: {
        start: Date;
        end: Date;
    };
    summary: {
        totalRequests: number;
        avgResponseTime: number;
        errorRate: number;
        uptime: number;
        uniqueUsers: number;
        uniqueDomains: number;
    };
    performance: PerformanceMetrics;
    system: SystemMetrics;
    domains: DomainMetrics[];
    alerts: Alert[];
    incidents: Array<{
        id: string;
        title: string;
        severity: AlertSeverity;
        startTime: Date;
        endTime?: Date;
        affectedServices: string[];
        resolution?: string;
    }>;
    recommendations: string[];
}
export declare class MonitoringService {
    private prisma;
    private cacheService;
    private configService;
    private promRegistry;
    private metrics;
    private alertRules;
    private activeAlerts;
    private metricsBuffer;
    private logBuffer;
    private httpRequestDuration;
    private httpRequestTotal;
    private activeConnections;
    private errorRate;
    private domainRequests;
    private cacheHitRate;
    private dbQueryDuration;
    private metricsInterval?;
    private alertCheckInterval?;
    private reportInterval?;
    constructor(prisma: PrismaClient, cacheService: DomainCacheService, configService: ProductionConfigService);
    /**
     * Record HTTP request metric
     */
    recordHttpRequest(method: string, route: string, statusCode: number, duration: number, domainId?: string): void;
    /**
     * Record database query metric
     */
    recordDbQuery(operation: string, table: string, duration: number): void;
    /**
     * Record cache metric
     */
    recordCacheOperation(type: string, hit: boolean): void;
    /**
     * Record domain-specific metric
     */
    recordDomainMetric(domainId: string, metric: string, value: number): void;
    /**
     * Record custom metric
     */
    recordMetric(metric: Metric): void;
    /**
     * Log entry
     */
    log(level: LogEntry['level'], message: string, source: string, metadata?: Record<string, unknown>, userId?: string, domainId?: string, requestId?: string): void;
    /**
     * Start trace
     */
    startTrace(operationName: string, parentSpanId?: string): TraceSpan;
    /**
     * Finish trace
     */
    finishTrace(span: TraceSpan, error?: Error): void;
    /**
     * Create alert
     */
    createAlert(alertData: Omit<Alert, 'id' | 'timestamp' | 'escalationLevel'>): Promise<string>;
    /**
     * Resolve alert
     */
    resolveAlert(alertId: string, resolvedBy: string, resolution?: string): Promise<void>;
    /**
     * Get performance metrics
     */
    getPerformanceMetrics(timeRange?: string): Promise<PerformanceMetrics>;
    /**
     * Get system metrics
     */
    getSystemMetrics(): Promise<SystemMetrics>;
    /**
     * Get domain metrics
     */
    getDomainMetrics(domainId: string, timeRange?: string): Promise<DomainMetrics>;
    /**
     * Generate monitoring report
     */
    generateReport(startDate: Date, endDate: Date, includeRecommendations?: boolean): Promise<MonitoringReport>;
    /**
     * Get Prometheus metrics
     */
    getPrometheusMetrics(): Promise<string>;
    /**
     * Private helper methods
     */
    private startMetricsCollection;
    private startAlertChecking;
    private loadAlertRules;
    private checkAlertTriggers;
    private evaluateAlertRule;
    private checkAlerts;
    private escalateAlert;
    private sendAlertNotifications;
    private sendAlertResolutionNotification;
    private flushMetrics;
    private getTopDomains;
    private generateRecommendations;
    private parseTimeRange;
    /**
     * Cleanup method
     */
    cleanup(): void;
}
export default MonitoringService;
//# sourceMappingURL=MonitoringService.d.ts.map