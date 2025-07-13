/**
 * Monitoring and Observability Service
 * Comprehensive monitoring, metrics collection, alerting, and performance tracking
 */
import * as prometheus from 'prom-client';
export class MonitoringService {
    constructor(prisma, cacheService, configService) {
        this.metrics = new Map();
        this.alertRules = new Map();
        this.activeAlerts = new Map();
        this.metricsBuffer = [];
        this.logBuffer = [];
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
    recordHttpRequest(method, route, statusCode, duration, domainId) {
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
    recordDbQuery(operation, table, duration) {
        this.dbQueryDuration.observe({ operation, table }, duration);
    }
    /**
     * Record cache metric
     */
    recordCacheOperation(type, hit) {
        this.cacheHitRate.observe({ cache_type: type }, hit ? 1 : 0);
    }
    /**
     * Record domain-specific metric
     */
    recordDomainMetric(domainId, metric, value) {
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
    recordMetric(metric) {
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
    log(level, message, source, metadata, userId, domainId, requestId) {
        const logEntry = {
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
    startTrace(operationName, parentSpanId) {
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
    finishTrace(span, error) {
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
        const stringifiedTags = Object.entries(span.tags).reduce((acc, [k, v]) => {
            acc[k] = String(v);
            return acc;
        }, {});
        this.recordMetric({
            name: 'trace_duration',
            type: 'histogram',
            description: 'Trace duration',
            labels: { operation: span.operationName },
            value: span.duration,
            timestamp: span.endTime,
            tags: stringifiedTags,
        });
    }
    /**
     * Create alert
     */
    async createAlert(alertData) {
        const alert = {
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
    async resolveAlert(alertId, resolvedBy, resolution) {
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
    async getPerformanceMetrics(timeRange = '1h') {
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
    async getSystemMetrics() {
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
    async getDomainMetrics(domainId, timeRange = '1h') {
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
    async generateReport(startDate, endDate, includeRecommendations = true) {
        const [performance, system, alerts] = await Promise.all([
            this.getPerformanceMetrics('24h'),
            this.getSystemMetrics(),
            Array.from(this.activeAlerts.values()),
        ]);
        // Get domain metrics for top domains
        const topDomains = await this.getTopDomains(10);
        const domainMetrics = await Promise.all(topDomains.map(domain => this.getDomainMetrics(domain.id)));
        const report = {
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
    async getPrometheusMetrics() {
        return this.promRegistry.metrics();
    }
    /**
     * Private helper methods
     */
    startMetricsCollection() {
        const config = this.configService.getConfigCategory('monitoring');
        if (!config.metrics.enabled) {
            return;
        }
        this.metricsInterval = setInterval(async () => {
            await this.flushMetrics();
        }, config.metrics.interval);
    }
    startAlertChecking() {
        const config = this.configService.getConfigCategory('monitoring');
        if (!config.alerting.enabled) {
            return;
        }
        this.alertCheckInterval = setInterval(async () => {
            await this.checkAlerts();
        }, 30000); // Check every 30 seconds
    }
    async loadAlertRules() {
        // Load alert rules from configuration or database
        const defaultRules = [
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
    checkAlertTriggers(metric) {
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
    evaluateAlertRule(rule, value) {
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
    async checkAlerts() {
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
    async escalateAlert(alert) {
        // Send escalated alert
        await this.sendAlertNotifications(alert);
        this.log('warn', `Alert escalated: ${alert.title}`, 'monitoring', {
            alertId: alert.id,
            escalationLevel: alert.escalationLevel,
        });
    }
    async sendAlertNotifications(alert) {
        // Implementation would send to configured channels
        console.log(`ALERT [${alert.severity.toUpperCase()}]: ${alert.title} - ${alert.description}`);
    }
    async sendAlertResolutionNotification(alert) {
        // Implementation would send resolution notification
        console.log(`RESOLVED: ${alert.title}`);
    }
    async flushMetrics() {
        if (this.metricsBuffer.length === 0) {
            return;
        }
        // Store metrics in database or external system
        const metrics = [...this.metricsBuffer];
        this.metricsBuffer = [];
        // Store in cache for short-term access
        await this.cacheService.cacheData('metrics:recent', metrics, 300 // 5 minutes
        );
    }
    async getTopDomains(limit) {
        // This would query actual domain usage data
        return [
            { id: 'domain-1', name: 'example.com' },
            { id: 'domain-2', name: 'test.com' },
        ];
    }
    async generateRecommendations() {
        const recommendations = [];
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
    parseTimeRange(timeRange) {
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
    cleanup() {
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
//# sourceMappingURL=MonitoringService.js.map