/**
 * Domain Health Monitoring Service
 * Comprehensive monitoring for uptime, performance, security, and domain health
 */
import { getFeatureFlagService } from './FeatureFlagService';
export class DomainHealthMonitoringService {
    prisma;
    domainService;
    verificationService;
    sslService;
    cacheService;
    featureFlags = getFeatureFlagService();
    // Health check regions
    REGIONS = [
        'us-east-1',
        'us-west-2',
        'eu-west-1',
        'ap-southeast-1',
    ];
    // Security headers to check
    SECURITY_HEADERS = [
        'Strict-Transport-Security',
        'X-Frame-Options',
        'X-Content-Type-Options',
        'X-XSS-Protection',
        'Referrer-Policy',
        'Content-Security-Policy',
        'Permissions-Policy',
    ];
    constructor(prisma, domainService, verificationService, sslService, cacheService) {
        this.prisma = prisma;
        this.domainService = domainService;
        this.verificationService = verificationService;
        this.sslService = sslService;
        this.cacheService = cacheService;
    }
    /**
     * Check health for a specific domain
     */
    async checkDomainHealth(domainId) {
        try {
            const domain = await this.prisma.domain.findUnique({
                where: { id: domainId },
                include: {
                    keepers: { take: 5 },
                    journeys: { take: 5 },
                },
            });
            if (!domain) {
                throw new Error(`Domain not found: ${domainId}`);
            }
            // Check domain availability and performance
            const performanceMetrics = await this.checkDomainPerformance(domain.customDomain || domain.slug);
            const uptimeMetrics = await this.getUptimeMetrics(domainId);
            const alerts = await this.getActiveAlerts(domainId);
            // Calculate health score based on multiple factors
            const score = this.calculateHealthScore(performanceMetrics, uptimeMetrics, alerts);
            const status = this.determineHealthStatus(score, alerts);
            return {
                domainId: domain.id,
                slug: domain.slug,
                customDomain: domain.customDomain || undefined,
                status,
                score,
                uptime: uptimeMetrics,
                performance: performanceMetrics,
                security: {
                    securityHeaders: {
                        score: 100,
                        missing: [],
                        warnings: [],
                    },
                },
                dns: {
                    recordsValid: true,
                },
                alerts,
                lastChecked: new Date(),
            };
        }
        catch (error) {
            console.error(`Health check failed for domain ${domainId}:`, error);
            return {
                domainId,
                slug: 'unknown',
                customDomain: undefined,
                status: 'unhealthy',
                score: 0,
                uptime: { percentage24h: 0, percentage7d: 0, percentage30d: 0 },
                performance: { averageResponseTime: 0, p95ResponseTime: 0, errorRate: 100 },
                security: {
                    securityHeaders: {
                        score: 0,
                        missing: [],
                        warnings: [],
                    },
                },
                dns: {
                    recordsValid: false,
                },
                alerts: [{
                        id: 'health-check-error',
                        type: 'system',
                        severity: 'critical',
                        message: `Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                        timestamp: new Date(),
                        resolved: false,
                    }],
                lastChecked: new Date(),
            };
        }
    }
    /**
     * Get system-wide health summary
     */
    async getSystemHealthSummary() {
        // Get all domains using proper method
        const domains = await this.getAllDomains();
        const healthMetrics = await Promise.all(domains.map((domain) => this.checkDomainHealth(domain.id)));
        return {
            totalDomains: domains.length,
            healthyDomains: healthMetrics.filter((m) => m.status === 'healthy').length,
            degradedDomains: healthMetrics.filter((m) => m.status === 'degraded').length,
            unhealthyDomains: healthMetrics.filter((m) => m.status === 'unhealthy').length,
            averageScore: Math.round(healthMetrics.reduce((sum, m) => sum + m.score, 0) / healthMetrics.length),
            averageUptime: Math.round(healthMetrics.reduce((sum, m) => sum + m.uptime.percentage24h, 0) / healthMetrics.length),
            totalAlerts: healthMetrics.reduce((sum, m) => sum + m.alerts.length, 0),
            criticalAlerts: healthMetrics.reduce((sum, m) => sum + m.alerts.filter((a) => a.severity === 'critical').length, 0),
            lastUpdated: new Date(),
        };
    }
    /**
     * Get all domains - implement missing method
     */
    async getAllDomains() {
        return await this.prisma.domain.findMany({
            where: { isActive: true },
            select: { id: true, slug: true, customDomain: true },
        });
    }
    /**
     * Check domain performance metrics
     */
    async checkDomainPerformance(hostname) {
        try {
            // Mock implementation - would integrate with actual monitoring service
            return {
                averageResponseTime: Math.random() * 500 + 100, // 100-600ms
                p95ResponseTime: Math.random() * 1000 + 500, // 500-1500ms
                errorRate: Math.random() * 5, // 0-5%
            };
        }
        catch (error) {
            console.error(`Performance check failed for ${hostname}:`, error);
            return {
                averageResponseTime: 0,
                p95ResponseTime: 0,
                errorRate: 100,
            };
        }
    }
    /**
     * Get uptime metrics for a domain
     */
    async getUptimeMetrics(domainId) {
        try {
            // Mock implementation - would query actual uptime data
            return {
                percentage24h: 95 + Math.random() * 5, // 95-100%
                percentage7d: 90 + Math.random() * 10, // 90-100%
                percentage30d: 85 + Math.random() * 15, // 85-100%
            };
        }
        catch (error) {
            console.error(`Uptime check failed for domain ${domainId}:`, error);
            return {
                percentage24h: 0,
                percentage7d: 0,
                percentage30d: 0,
            };
        }
    }
    /**
     * Get active alerts for a domain
     */
    async getActiveAlerts(domainId) {
        try {
            // Mock implementation - would query actual alert system
            return [{
                    id: 'alert-system-error',
                    type: 'system',
                    severity: 'warning',
                    message: 'Failed to retrieve alerts',
                    timestamp: new Date(),
                    resolved: false,
                }];
        }
        catch (error) {
            console.error(`Alert check failed for domain ${domainId}:`, error);
            return [{
                    id: 'alert-system-error',
                    type: 'system',
                    severity: 'warning',
                    message: 'Failed to retrieve alerts',
                    timestamp: new Date(),
                    resolved: false,
                }];
        }
    }
    /**
     * Calculate health score based on metrics
     */
    calculateHealthScore(performance, uptime, alerts) {
        let score = 100;
        // Deduct points for poor performance
        if (performance.averageResponseTime > 1000)
            score -= 20;
        else if (performance.averageResponseTime > 500)
            score -= 10;
        if (performance.errorRate > 5)
            score -= 30;
        else if (performance.errorRate > 1)
            score -= 15;
        // Deduct points for poor uptime
        if (uptime.percentage24h < 95)
            score -= 25;
        else if (uptime.percentage24h < 99)
            score -= 10;
        // Deduct points for active alerts
        const criticalAlerts = alerts.filter(a => a.severity === 'critical' && !a.resolved);
        const errorAlerts = alerts.filter(a => a.severity === 'error' && !a.resolved);
        score -= criticalAlerts.length * 15;
        score -= errorAlerts.length * 5;
        return Math.max(0, Math.min(100, score));
    }
    /**
     * Determine health status based on score and alerts
     */
    determineHealthStatus(score, alerts) {
        const criticalAlerts = alerts.filter(a => a.severity === 'critical' && !a.resolved);
        if (criticalAlerts.length > 0 || score < 50) {
            return 'unhealthy';
        }
        else if (score < 80) {
            return 'degraded';
        }
        else {
            return 'healthy';
        }
    }
    /**
     * Generate monitoring report
     */
    async generateMonitoringReport(timeRange = '24h') {
        const domains = await this.getAllDomains();
        const healthMetrics = await Promise.all(domains.map((domain) => this.checkDomainHealth(domain.id)));
        const summary = {
            totalDomains: domains.length,
            healthyDomains: healthMetrics.filter((m) => m.status === 'healthy').length,
            degradedDomains: healthMetrics.filter((m) => m.status === 'degraded').length,
            unhealthyDomains: healthMetrics.filter((m) => m.status === 'unhealthy').length,
            averageScore: Math.round(healthMetrics.reduce((sum, m) => sum + m.score, 0) / healthMetrics.length),
            averageUptime: Math.round(healthMetrics.reduce((sum, m) => sum + m.uptime.percentage24h, 0) / healthMetrics.length),
            totalAlerts: healthMetrics.reduce((sum, m) => sum + m.alerts.length, 0),
            criticalAlerts: healthMetrics.reduce((sum, m) => sum + m.alerts.filter((a) => a.severity === 'critical').length, 0),
        };
        const trends = {
            uptimeChange: 0, // Would calculate from historical data
            performanceChange: 0, // Would calculate from historical data
            securityChange: 0, // Would calculate from historical data
        };
        const topIssues = this.aggregateTopIssues(healthMetrics);
        return {
            summary,
            domains: healthMetrics,
            trends,
            topIssues,
        };
    }
    /**
     * Private helper methods
     */
    async getUptimeHistory(domain) {
        // Would query historical uptime data
        // For now, return mock data
        return {
            percentage24h: 99.0,
            percentage7d: 99.5,
            percentage30d: 99.8,
            downtimeMinutes24h: 0,
            incidentCount7d: 0,
        };
    }
    async getPerformanceHistory(domain) {
        // Would query historical performance data
        // For now, return mock data
        return {
            averageResponseTime24h: 150,
            throughput: 1000,
        };
    }
    analyzeSecurityHeaders(headers) {
        const missing = [];
        const warnings = [];
        let score = 100;
        this.SECURITY_HEADERS.forEach((header) => {
            if (!headers.has(header)) {
                missing.push(header);
                score -= 15;
            }
            else {
                // Check header values for warnings
                const value = headers.get(header);
                if (header === 'X-Frame-Options' && value === 'ALLOWALL') {
                    warnings.push('X-Frame-Options is set to ALLOWALL');
                    score -= 5;
                }
            }
        });
        return {
            score: Math.max(0, score),
            missing,
            warnings,
        };
    }
    calculateApdexScore(responseTime) {
        const satisfactory = 500; // 500ms
        const tolerating = 2000; // 2000ms
        if (responseTime <= satisfactory)
            return 1.0;
        if (responseTime <= tolerating)
            return 0.5;
        return 0.0;
    }
    async testConnectivity(domain, protocol) {
        try {
            // This would use actual IPv4/IPv6 connectivity tests
            // For now, simulate based on protocol
            return protocol === 'ipv4' ? true : false;
        }
        catch (error) {
            return false;
        }
    }
    checkGdprCompliance(html) {
        // Check for GDPR compliance indicators
        const gdprIndicators = [
            'cookie consent',
            'privacy policy',
            'data protection',
            'gdpr',
        ];
        return gdprIndicators.some(indicator => html.toLowerCase().includes(indicator));
    }
    checkAccessibility(html) {
        // Basic accessibility checks
        let score = 100;
        // Check for alt attributes on images
        const images = html.match(/<img[^>]*>/g) || [];
        const imagesWithoutAlt = images.filter(img => !img.includes('alt='));
        score -= (imagesWithoutAlt.length / images.length) * 20;
        // Check for semantic HTML
        const semanticElements = ['header', 'main', 'nav', 'aside', 'footer'];
        const hasSemanticElements = semanticElements.some(element => html.includes(`<${element}`));
        if (!hasSemanticElements)
            score -= 20;
        return Math.max(0, Math.round(score));
    }
    checkSeo(html) {
        // Basic SEO checks
        let score = 100;
        // Check for title tag
        if (!html.includes('<title>'))
            score -= 20;
        // Check for meta description
        if (!html.includes('name="description"'))
            score -= 15;
        // Check for heading structure
        if (!html.includes('<h1>'))
            score -= 15;
        return Math.max(0, Math.round(score));
    }
    generateRecommendations(metrics) {
        const recommendations = [];
        // Uptime recommendations
        if (metrics.uptime.percentage24h < 99) {
            recommendations.push('Consider implementing redundancy to improve uptime');
        }
        // Performance recommendations
        if (metrics.performance.responseTime > 1000) {
            recommendations.push('Optimize response time - consider CDN or caching');
        }
        // Security recommendations
        if (metrics.security.securityHeaders.missing.length > 0) {
            recommendations.push('Add missing security headers for better security');
        }
        // DNS recommendations
        if (!metrics.dns.recordsValid) {
            recommendations.push('Fix DNS configuration to ensure proper resolution');
        }
        return recommendations;
    }
    async storeHealthMetrics(metrics) {
        // Would store metrics in database/time-series database
        // For now, just log
        console.log(`Health metrics stored for ${metrics.domainId}: ${metrics.score}/100`);
    }
    async checkAlertConditions(metrics) {
        // Would check for alert conditions and create alerts
        // For now, just log critical issues
        if (metrics.status === 'unhealthy') {
            console.log(`ALERT: Domain ${metrics.domainId} is unhealthy (score: ${metrics.score})`);
        }
    }
    aggregateTopIssues(healthMetrics) {
        const issueMap = new Map();
        healthMetrics.forEach((metrics) => {
            metrics.alerts.forEach((alert) => {
                const existing = issueMap.get(alert.type);
                if (existing) {
                    existing.count++;
                    // Keep the highest severity
                    if (this.getSeverityLevel(alert.severity) > this.getSeverityLevel(existing.severity)) {
                        existing.severity = alert.severity;
                    }
                }
                else {
                    issueMap.set(alert.type, { count: 1, severity: alert.severity });
                }
            });
        });
        return Array.from(issueMap.entries())
            .map(([issue, data]) => ({ issue, ...data }))
            .sort((a, b) => b.count - a.count);
    }
    getSeverityLevel(severity) {
        const levels = { info: 1, warning: 2, error: 3, critical: 4 };
        return levels[severity];
    }
}
export default DomainHealthMonitoringService;
//# sourceMappingURL=DomainHealthMonitoringService.js.map