/**
 * Monitoring and Observability Service
 * Comprehensive monitoring, metrics collection, alerting, and performance tracking
 */

import { PrismaClient } from '@prisma/client';
import { DomainCacheService } from './DomainCacheService';
import { ProductionConfigService } from './ProductionConfigService';
import * as prometheus from 'prom-client';

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
  duration: number; // seconds
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
  position: { x: number; y: number; w: number; h: number };
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

export class MonitoringService {
  private prisma: PrismaClient;
  private cacheService: DomainCacheService;
  private configService: ProductionConfigService;
  private promRegistry: prometheus.Registry;
  private metrics: Map<string, prometheus.Metric> = new Map();
  private alertRules: Map<string, AlertRule> = new Map();
  private activeAlerts: Map<string, Alert> = new Map();
  private metricsBuffer: Metric[] = [];
  private logBuffer: LogEntry[] = [];

  // Prometheus metrics
  private httpRequestDuration: prometheus.Histogram;
  private httpRequestTotal: prometheus.Counter;
  private activeConnections: prometheus.Gauge;
  private errorRate: prometheus.Counter;
  private domainRequests: prometheus.Counter;
  private cacheHitRate: prometheus.Histogram;
  private dbQueryDuration: prometheus.Histogram;

  // Collection intervals
  private metricsInterval?: NodeJS.Timeout;
  private alertCheckInterval?: NodeJS.Timeout;
  private reportInterval?: NodeJS.Timeout;

  constructor(
    prisma: PrismaClient,
    cacheService: DomainCacheService,
    configService: ProductionConfigService
  ) {
    this.prisma = prisma;
    this.cacheService = cacheService;
    this.configService = configService;
    this.promRegistry = new prometheus.Registry();
    
    // Initialize Prometheus metrics
    this.httpRequestDuration = new prometheus.Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
    });

    this.httpRequestTotal = new prometheus.Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
    });

    this.activeConnections = new prometheus.Gauge({
      name: 'active_connections',
      help: 'Number of active connections',
    });

    this.errorRate = new prometheus.Counter({
      name: 'errors_total',
      help: 'Total number of errors',
      labelNames: ['type', 'severity'],
    });

    this.domainRequests = new prometheus.Counter({
      name: 'domain_requests_total',
      help: 'Total number of domain requests',
      labelNames: ['domain_id', 'status'],
    });

    this.cacheHitRate = new prometheus.Histogram({
      name: 'cache_hit_rate',
      help: 'Cache hit rate percentage',
      labelNames: ['cache_type'],
    });

    this.dbQueryDuration = new prometheus.Histogram({
      name: 'database_query_duration_seconds',
      help: 'Duration of database queries in seconds',
      labelNames: ['operation', 'table'],
    });

    // Register metrics
    prometheus.register.registerMetric(this.httpRequestDuration);
    prometheus.register.registerMetric(this.httpRequestTotal);
    prometheus.register.registerMetric(this.activeConnections);
    prometheus.register.registerMetric(this.errorRate);
    prometheus.register.registerMetric(this.domainRequests);
    prometheus.register.registerMetric(this.cacheHitRate);
    prometheus.register.registerMetric(this.dbQueryDuration);

    this.startMetricsCollection();
    this.startAlertChecking();
    this.loadAlertRules();
  }

  /**
   * Record HTTP request metric
   */
  recordHttpRequest(
    method: string,
    route: string,
    statusCode: number,
    duration: number,
    domainId?: string
  ): void {
    const labels = {
      method,
      route,
      status_code: statusCode.toString(),
      domain: domainId || 'unknown',
    };

    this.httpRequestDuration.observe(labels, duration);
    this.httpRequestTotal.inc(labels);

    // Record domain-specific metric
    if (domainId) {
      this.recordDomainMetric(domainId, 'request', 1);
    }

    // Record error if status code indicates error
    if (statusCode >= 400) {
      this.errorRate.inc({
        type: statusCode >= 500 ? 'server_error' : 'client_error',
        source: 'http',
        domain: domainId || 'unknown',
      });
    }
  }

  /**
   * Record database query metric
   */
  recordDbQuery(operation: string, table: string, duration: number): void {
    this.dbQueryDuration.observe({ operation, table }, duration);
  }

  /**
   * Record cache metric
   */
  recordCacheOperation(type: string, hit: boolean): void {
    this.cacheHitRate.observe({ cache_type: type }, hit ? 1 : 0);
  }

  /**
   * Record domain-specific metric
   */
  recordDomainMetric(domainId: string, metric: string, value: number): void {
    this.metricsBuffer.push({
      name: `domain_${metric}`,
      type: 'counter',
      description: `Domain ${metric} metric`,
      labels: { domain_id: domainId },
      value,
      timestamp: new Date(),
    });
  }

  /**
   * Record custom metric
   */
  recordMetric(metric: Metric): void {
    this.metricsBuffer.push({
      ...metric,
      timestamp: new Date(),
    });

    // Check for alert triggers
    this.checkAlertTriggers(metric);
  }

  /**
   * Log entry
   */
  log(
    level: LogEntry['level'],
    message: string,
    source: string,
    metadata?: Record<string, unknown>,
    userId?: string,
    domainId?: string,
    requestId?: string
  ): void {
    const logEntry: LogEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      level,
      message,
      source,
      userId,
      domainId,
      requestId,
      metadata,
    };

    this.logBuffer.push(logEntry);

    // Console output for immediate feedback
    const logLevel = level.toUpperCase();
    const contextInfo = [
      userId && `user:${userId}`,
      domainId && `domain:${domainId}`,
      requestId && `req:${requestId}`,
    ].filter(Boolean).join(' ');

    console.log(`[${logLevel}] ${source}: ${message} ${contextInfo}`);

    // Create alert for errors
    if (level === 'error' || level === 'fatal') {
      this.createAlert({
        severity: level === 'fatal' ? 'critical' : 'error',
        title: `${level.toUpperCase()} in ${source}`,
        description: message,
        source,
        metadata: { ...metadata, userId, domainId, requestId },
        channels: ['email'],
      });
    }
  }

  /**
   * Start trace
   */
  startTrace(operationName: string, parentSpanId?: string): TraceSpan {
    const traceId = parentSpanId ? parentSpanId.split(':')[0] : crypto.randomUUID();
    const spanId = crypto.randomUUID();

    return {
      traceId,
      spanId,
      parentSpanId,
      operationName,
      startTime: new Date(),
      tags: {},
      logs: [],
      status: { code: 0 },
    };
  }

  /**
   * Finish trace
   */
  finishTrace(span: TraceSpan, error?: Error): void {
    span.endTime = new Date();
    span.duration = span.endTime.getTime() - span.startTime.getTime();

    if (error) {
      span.status = { code: 1, message: error.message };
      span.tags.error = true;
      span.logs.push({
        timestamp: new Date(),
        fields: { error: error.message, stack: error.stack },
      });
    }

    // Store trace data
    // Convert tags to Record<string, string>
    const stringifiedTags: Record<string, string> = Object.entries(span.tags).reduce((acc, [k, v]) => {
      acc[k] = String(v);
      return acc;
    }, {} as Record<string, string>);
    this.recordMetric({
      name: 'trace_duration',
      type: 'histogram',
      description: 'Trace duration',
      labels: { operation: span.operationName },
      value: span.duration!,
      timestamp: span.endTime,
      tags: stringifiedTags,
    });
  }

  /**
   * Create alert
   */
  async createAlert(alertData: Omit<Alert, 'id' | 'timestamp' | 'escalationLevel'>): Promise<string> {
    const alert: Alert = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      escalationLevel: 0,
      ...alertData,
    };

    this.activeAlerts.set(alert.id, alert);

    // Send alert notifications
    await this.sendAlertNotifications(alert);

    // Log alert creation
    this.log('warn', `Alert created: ${alert.title}`, 'monitoring', {
      alertId: alert.id,
      severity: alert.severity,
    });

    return alert.id;
  }

  /**
   * Resolve alert
   */
  async resolveAlert(alertId: string, resolvedBy: string, resolution?: string): Promise<void> {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) {
      throw new Error('Alert not found');
    }

    alert.resolved = new Date();
    alert.resolvedBy = resolvedBy;
    if (resolution) {
      alert.metadata = { ...alert.metadata, resolution };
    }

    this.activeAlerts.delete(alertId);

    // Send resolution notification
    await this.sendAlertResolutionNotification(alert);

    // Log alert resolution
    this.log('info', `Alert resolved: ${alert.title}`, 'monitoring', {
      alertId,
      resolvedBy,
      resolution,
    });
  }

  /**
   * Get performance metrics
   */
  async getPerformanceMetrics(timeRange: string = '1h'): Promise<PerformanceMetrics> {
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - this.parseTimeRange(timeRange));

    // This would query stored metrics data
    // For now, return mock data
    return {
      responseTime: {
        avg: 150,
        p50: 120,
        p95: 300,
        p99: 500,
        max: 1000,
      },
      throughput: {
        requestsPerSecond: 50,
        requestsPerMinute: 3000,
        totalRequests: 180000,
      },
      errorRate: {
        percentage: 2.5,
        total: 4500,
        byType: {
          '4xx': 3000,
          '5xx': 1500,
        },
      },
      availability: {
        uptime: process.uptime(),
        uptimePercentage: 99.9,
      },
    };
  }

  /**
   * Get system metrics
   */
  async getSystemMetrics(): Promise<SystemMetrics> {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    return {
      cpu: {
        usage: (cpuUsage.user + cpuUsage.system) / 1000000,
        loadAverage: [0.5, 0.3, 0.2], // Would use os.loadavg()
        processes: 1,
      },
      memory: {
        used: memoryUsage.heapUsed,
        available: memoryUsage.heapTotal - memoryUsage.heapUsed,
        percentage: memoryUsage.heapUsed / memoryUsage.heapTotal,
        heapUsed: memoryUsage.heapUsed,
        heapTotal: memoryUsage.heapTotal,
      },
      disk: {
        used: 0,
        available: 0,
        percentage: 0,
        readOps: 0,
        writeOps: 0,
      },
      network: {
        bytesIn: 0,
        bytesOut: 0,
        connectionsActive: 0,
        connectionsTotal: 0,
      },
    };
  }

  /**
   * Get domain metrics
   */
  async getDomainMetrics(domainId: string, timeRange: string = '1h'): Promise<DomainMetrics> {
    // This would query stored domain-specific metrics
    // For now, return mock data
    return {
      domainId,
      requests: 1000,
      users: 50,
      shares: 25,
      collaborations: 5,
      storage: 1024 * 1024 * 100, // 100MB
      bandwidth: 1024 * 1024 * 500, // 500MB
      errors: 10,
      responseTime: 120,
      timestamp: new Date(),
    };
  }

  /**
   * Generate monitoring report
   */
  async generateReport(
    startDate: Date,
    endDate: Date,
    includeRecommendations: boolean = true
  ): Promise<MonitoringReport> {
    const [performance, system, alerts] = await Promise.all([
      this.getPerformanceMetrics('24h'),
      this.getSystemMetrics(),
      Array.from(this.activeAlerts.values()),
    ]);

    // Get domain metrics for top domains
    const topDomains = await this.getTopDomains(10);
    const domainMetrics = await Promise.all(
      topDomains.map(domain => this.getDomainMetrics(domain.id))
    );

    const report: MonitoringReport = {
      period: { start: startDate, end: endDate },
      summary: {
        totalRequests: performance.throughput.totalRequests,
        avgResponseTime: performance.responseTime.avg,
        errorRate: performance.errorRate.percentage,
        uptime: performance.availability.uptime,
        uniqueUsers: 1500,
        uniqueDomains: topDomains.length,
      },
      performance,
      system,
      domains: domainMetrics,
      alerts,
      incidents: [], // Would query incident data
      recommendations: includeRecommendations ? await this.generateRecommendations() : [],
    };

    return report;
  }

  /**
   * Get Prometheus metrics
   */
  async getPrometheusMetrics(): Promise<string> {
    return this.promRegistry.metrics();
  }

  /**
   * Private helper methods
   */
  private startMetricsCollection(): void {
    const config = this.configService.getConfigCategory('monitoring');
    
    if (!config.metrics.enabled) {
      return;
    }

    this.metricsInterval = setInterval(async () => {
      await this.flushMetrics();
    }, config.metrics.interval);
  }

  private startAlertChecking(): void {
    const config = this.configService.getConfigCategory('monitoring');
    
    if (!config.alerting.enabled) {
      return;
    }

    this.alertCheckInterval = setInterval(async () => {
      await this.checkAlerts();
    }, 30000); // Check every 30 seconds
  }

  private async loadAlertRules(): Promise<void> {
    // Load alert rules from configuration or database
    const defaultRules: AlertRule[] = [
      {
        id: 'high-error-rate',
        name: 'High Error Rate',
        description: 'Error rate exceeds threshold',
        metric: 'error_rate',
        operator: 'gt',
        threshold: 5.0,
        duration: 300,
        severity: 'warning',
        channels: ['email'],
        enabled: true,
      },
      {
        id: 'high-response-time',
        name: 'High Response Time',
        description: 'Average response time exceeds threshold',
        metric: 'response_time',
        operator: 'gt',
        threshold: 2000,
        duration: 300,
        severity: 'warning',
        channels: ['email'],
        enabled: true,
      },
      {
        id: 'low-disk-space',
        name: 'Low Disk Space',
        description: 'Disk usage exceeds threshold',
        metric: 'disk_usage',
        operator: 'gt',
        threshold: 85.0,
        duration: 60,
        severity: 'critical',
        channels: ['email', 'slack'],
        enabled: true,
      },
    ];

    defaultRules.forEach(rule => {
      this.alertRules.set(rule.id, rule);
    });
  }

  private checkAlertTriggers(metric: Metric): void {
    for (const rule of this.alertRules.values()) {
      if (rule.metric === metric.name && rule.enabled) {
        const triggered = this.evaluateAlertRule(rule, metric.value);
        if (triggered) {
          this.createAlert({
            severity: rule.severity,
            title: rule.name,
            description: `${rule.description}: ${metric.value}`,
            source: 'monitoring',
            channels: rule.channels,
            metadata: { rule: rule.id, metric: metric.name, value: metric.value },
          });
        }
      }
    }
  }

  private evaluateAlertRule(rule: AlertRule, value: number): boolean {
    switch (rule.operator) {
      case 'gt': return value > rule.threshold;
      case 'lt': return value < rule.threshold;
      case 'eq': return value === rule.threshold;
      case 'ne': return value !== rule.threshold;
      case 'gte': return value >= rule.threshold;
      case 'lte': return value <= rule.threshold;
      default: return false;
    }
  }

  private async checkAlerts(): Promise<void> {
    // Check for alert escalation
    for (const alert of this.activeAlerts.values()) {
      if (alert.escalationLevel === 0) {
        const timeSinceCreated = Date.now() - alert.timestamp.getTime();
        if (timeSinceCreated > 300000) { // 5 minutes
          alert.escalationLevel = 1;
          await this.escalateAlert(alert);
        }
      }
    }
  }

  private async escalateAlert(alert: Alert): Promise<void> {
    // Send escalated alert
    await this.sendAlertNotifications(alert);
    
    this.log('warn', `Alert escalated: ${alert.title}`, 'monitoring', {
      alertId: alert.id,
      escalationLevel: alert.escalationLevel,
    });
  }

  private async sendAlertNotifications(alert: Alert): Promise<void> {
    // Implementation would send to configured channels
    console.log(`ALERT [${alert.severity.toUpperCase()}]: ${alert.title} - ${alert.description}`);
  }

  private async sendAlertResolutionNotification(alert: Alert): Promise<void> {
    // Implementation would send resolution notification
    console.log(`RESOLVED: ${alert.title}`);
  }

  private async flushMetrics(): Promise<void> {
    if (this.metricsBuffer.length === 0) {
      return;
    }

    // Store metrics in database or external system
    const metrics = [...this.metricsBuffer];
    this.metricsBuffer = [];

    // Store in cache for short-term access
    await this.cacheService.cacheData(
      'metrics:recent',
      metrics,
      300 // 5 minutes
    );
  }

  private async getTopDomains(limit: number): Promise<Array<{ id: string; name: string }>> {
    // This would query actual domain usage data
    return [
      { id: 'domain-1', name: 'example.com' },
      { id: 'domain-2', name: 'test.com' },
    ];
  }

  private async generateRecommendations(): Promise<string[]> {
    const recommendations: string[] = [];
    const performance = await this.getPerformanceMetrics();
    const system = await this.getSystemMetrics();

    // Performance recommendations
    if (performance.responseTime.avg > 500) {
      recommendations.push('Consider optimizing database queries or adding caching');
    }

    if (performance.errorRate.percentage > 5) {
      recommendations.push('Error rate is high, review error logs and fix issues');
    }

    // System recommendations
    if (system.memory.percentage > 0.8) {
      recommendations.push('Memory usage is high, consider scaling up or optimizing memory usage');
    }

    if (system.cpu.usage > 0.8) {
      recommendations.push('CPU usage is high, consider scaling out or optimizing CPU-intensive operations');
    }

    return recommendations;
  }

  private parseTimeRange(timeRange: string): number {
    const unit = timeRange.slice(-1);
    const value = parseInt(timeRange.slice(0, -1));

    switch (unit) {
      case 'm': return value * 60 * 1000; // minutes
      case 'h': return value * 60 * 60 * 1000; // hours
      case 'd': return value * 24 * 60 * 60 * 1000; // days
      default: return 60 * 60 * 1000; // default 1 hour
    }
  }

  /**
   * Cleanup method
   */
  cleanup(): void {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }
    if (this.alertCheckInterval) {
      clearInterval(this.alertCheckInterval);
    }
    if (this.reportInterval) {
      clearInterval(this.reportInterval);
    }
  }
}

export default MonitoringService; 