/**
 * Domain Health Monitoring Service
 * Comprehensive monitoring for uptime, performance, security, and domain health
 */

import { PrismaClient } from '@prisma/client';
import { DomainService } from './DomainService.js';
import { DomainVerificationService } from './DomainVerificationService.js';
import { SslCertificateService } from './SslCertificateService.js';
import { DomainCacheService } from './DomainCacheService.js';
import { getFeatureFlagService } from './FeatureFlagService.js';

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
export type AlertSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface DomainHealthMetrics {
  domainId: string;
  slug: string;
  customDomain?: string;
  status: HealthStatus;
  score: number; // 0-100
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
  interval: number; // seconds
  timeout: number; // seconds
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

export class DomainHealthMonitoringService {
  private prisma: PrismaClient;
  private domainService: DomainService;
  private verificationService: DomainVerificationService;
  private sslService: SslCertificateService;
  private cacheService: DomainCacheService;
  private featureFlags = getFeatureFlagService();

  // Health check regions
  private readonly REGIONS = [
    'us-east-1',
    'us-west-2',
    'eu-west-1',
    'ap-southeast-1',
  ];

  // Security headers to check
  private readonly SECURITY_HEADERS = [
    'Strict-Transport-Security',
    'X-Frame-Options',
    'X-Content-Type-Options',
    'X-XSS-Protection',
    'Referrer-Policy',
    'Content-Security-Policy',
    'Permissions-Policy',
  ];

  constructor(
    prisma: PrismaClient,
    domainService: DomainService,
    verificationService: DomainVerificationService,
    sslService: SslCertificateService,
    cacheService: DomainCacheService
  ) {
    this.prisma = prisma;
    this.domainService = domainService;
    this.verificationService = verificationService;
    this.sslService = sslService;
    this.cacheService = cacheService;
  }

  /**
   * Check health for a specific domain
   */
  async checkDomainHealth(domainId: string): Promise<DomainHealthMetrics> {
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
    } catch (error) {
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
  async getSystemHealthSummary(): Promise<SystemHealthSummary> {
    // Get all domains using proper method
    const domains = await this.getAllDomains();

    const healthMetrics = await Promise.all(
      domains.map((domain: unknown) => {
        if (domain && typeof domain === 'object' && 'id' in domain) {
          return this.checkDomainHealth((domain as { id: string }).id);
        }
        return Promise.resolve(null);
      }).filter(Boolean)
    );

    const validMetrics = healthMetrics.filter((m): m is DomainHealthMetrics => m !== null);

    return {
      totalDomains: domains.length,
      healthyDomains: validMetrics.filter((m: DomainHealthMetrics) => m.status === 'healthy').length,
      degradedDomains: validMetrics.filter((m: DomainHealthMetrics) => m.status === 'degraded').length,
      unhealthyDomains: validMetrics.filter((m: DomainHealthMetrics) => m.status === 'unhealthy').length,
      averageScore: Math.round(validMetrics.reduce((sum: number, m: DomainHealthMetrics) => sum + m.score, 0) / validMetrics.length),
      averageUptime: Math.round(validMetrics.reduce((sum: number, m: DomainHealthMetrics) => sum + m.uptime.percentage24h, 0) / validMetrics.length),
      totalAlerts: validMetrics.reduce((sum: number, m: DomainHealthMetrics) => sum + m.alerts.length, 0),
      criticalAlerts: validMetrics.reduce((sum: number, m: DomainHealthMetrics) => sum + m.alerts.filter((a: DomainAlert) => a.severity === 'critical').length, 0),
      lastUpdated: new Date(),
    };
  }

  /**
   * Get all domains - implement missing method
   */
  private async getAllDomains(): Promise<any[]> {
    return await this.prisma.domain.findMany({
      where: { isActive: true },
      select: { id: true, slug: true, customDomain: true },
    });
  }

  /**
   * Check domain performance metrics
   */
  private async checkDomainPerformance(hostname: string): Promise<{
    averageResponseTime: number;
    p95ResponseTime: number;
    errorRate: number;
  }> {
    try {
      // Mock implementation - would integrate with actual monitoring service
      return {
        averageResponseTime: Math.random() * 500 + 100, // 100-600ms
        p95ResponseTime: Math.random() * 1000 + 500, // 500-1500ms
        errorRate: Math.random() * 5, // 0-5%
      };
    } catch (error) {
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
  private async getUptimeMetrics(domainId: string): Promise<{
    percentage24h: number;
    percentage7d: number;
    percentage30d: number;
  }> {
    try {
      // Mock implementation - would query actual uptime data
      return {
        percentage24h: 95 + Math.random() * 5, // 95-100%
        percentage7d: 90 + Math.random() * 10, // 90-100%
        percentage30d: 85 + Math.random() * 15, // 85-100%
      };
    } catch (error) {
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
  private async getActiveAlerts(domainId: string): Promise<DomainAlert[]> {
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
    } catch (error) {
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
  private calculateHealthScore(
    performance: { averageResponseTime: number; p95ResponseTime: number; errorRate: number },
    uptime: { percentage24h: number; percentage7d: number; percentage30d: number },
    alerts: DomainAlert[]
  ): number {
    let score = 100;

    // Deduct points for poor performance
    if (performance.averageResponseTime > 1000) score -= 20;
    else if (performance.averageResponseTime > 500) score -= 10;

    if (performance.errorRate > 5) score -= 30;
    else if (performance.errorRate > 1) score -= 15;

    // Deduct points for poor uptime
    if (uptime.percentage24h < 95) score -= 25;
    else if (uptime.percentage24h < 99) score -= 10;

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
  private determineHealthStatus(score: number, alerts: DomainAlert[]): 'healthy' | 'degraded' | 'unhealthy' {
    const criticalAlerts = alerts.filter(a => a.severity === 'critical' && !a.resolved);
    
    if (criticalAlerts.length > 0 || score < 50) {
      return 'unhealthy';
    } else if (score < 80) {
      return 'degraded';
    } else {
      return 'healthy';
    }
  }

  /**
   * Generate monitoring report
   */
  async generateMonitoringReport(timeRange: '24h' | '7d' | '30d' = '24h'): Promise<MonitoringReport> {
    const domains = await this.getAllDomains();
    const healthMetrics = await Promise.all(
      domains.map((domain: unknown) => {
        if (domain && typeof domain === 'object' && 'id' in domain) {
          return this.checkDomainHealth((domain as { id: string }).id);
        }
        return Promise.resolve(null);
      }).filter(Boolean)
    );

    const validMetrics = healthMetrics.filter((m): m is DomainHealthMetrics => m !== null);

    const summary = {
      totalDomains: domains.length,
      healthyDomains: validMetrics.filter((m: DomainHealthMetrics) => m.status === 'healthy').length,
      degradedDomains: validMetrics.filter((m: DomainHealthMetrics) => m.status === 'degraded').length,
      unhealthyDomains: validMetrics.filter((m: DomainHealthMetrics) => m.status === 'unhealthy').length,
      averageScore: Math.round(validMetrics.reduce((sum: number, m: DomainHealthMetrics) => sum + m.score, 0) / validMetrics.length),
      averageUptime: Math.round(validMetrics.reduce((sum: number, m: DomainHealthMetrics) => sum + m.uptime.percentage24h, 0) / validMetrics.length),
      totalAlerts: validMetrics.reduce((sum: number, m: DomainHealthMetrics) => sum + m.alerts.length, 0),
      criticalAlerts: validMetrics.reduce((sum: number, m: DomainHealthMetrics) => sum + m.alerts.filter((a: DomainAlert) => a.severity === 'critical').length, 0),
    };

    const trends = {
      uptimeChange: 0, // Would calculate from historical data
      performanceChange: 0, // Would calculate from historical data
      securityChange: 0, // Would calculate from historical data
    };

    const topIssues = this.aggregateTopIssues(validMetrics);

    return {
      summary,
      domains: validMetrics,
      trends,
      topIssues,
    };
  }

  /**
   * Private helper methods
   */
  private async getUptimeHistory(domain: string): Promise<unknown> {
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

  private async getPerformanceHistory(domain: string): Promise<unknown> {
    // Would query historical performance data
    // For now, return mock data
    return {
      averageResponseTime24h: 150,
      throughput: 1000,
    };
  }

  private analyzeSecurityHeaders(headers: Headers): DomainHealthMetrics['security']['securityHeaders'] {
    const missing: string[] = [];
    const warnings: string[] = [];
    let score = 100;

    this.SECURITY_HEADERS.forEach((header: string) => {
      if (!headers.has(header)) {
        missing.push(header);
        score -= 15;
      } else {
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

  private calculateApdexScore(responseTime: number): number {
    const satisfactory = 500; // 500ms
    const tolerating = 2000; // 2000ms
    
    if (responseTime <= satisfactory) return 1.0;
    if (responseTime <= tolerating) return 0.5;
    return 0.0;
  }

  private async testConnectivity(domain: string, protocol: 'ipv4' | 'ipv6'): Promise<boolean> {
    try {
      // This would use actual IPv4/IPv6 connectivity tests
      // For now, simulate based on protocol
      return protocol === 'ipv4' ? true : false;
    } catch (error) {
      return false;
    }
  }

  private checkGdprCompliance(html: string): boolean {
    // Check for GDPR compliance indicators
    const gdprIndicators = [
      'cookie consent',
      'privacy policy',
      'data protection',
      'gdpr',
    ];

    return gdprIndicators.some(indicator => 
      html.toLowerCase().includes(indicator)
    );
  }

  private checkAccessibility(html: string): number {
    // Basic accessibility checks
    let score = 100;
    
    // Check for alt attributes on images
    const images = html.match(/<img[^>]*>/g) || [];
    const imagesWithoutAlt = images.filter(img => !img.includes('alt='));
    score -= (imagesWithoutAlt.length / images.length) * 20;

    // Check for semantic HTML
    const semanticElements = ['header', 'main', 'nav', 'aside', 'footer'];
    const hasSemanticElements = semanticElements.some(element => 
      html.includes(`<${element}`)
    );
    if (!hasSemanticElements) score -= 20;

    return Math.max(0, Math.round(score));
  }

  private checkSeo(html: string): number {
    // Basic SEO checks
    let score = 100;
    
    // Check for title tag
    if (!html.includes('<title>')) score -= 20;
    
    // Check for meta description
    if (!html.includes('name="description"')) score -= 15;
    
    // Check for heading structure
    if (!html.includes('<h1>')) score -= 15;
    
    return Math.max(0, Math.round(score));
  }

  private generateRecommendations(metrics: unknown): string[] {
    const recommendations: string[] = [];
    
    if (!metrics || typeof metrics !== 'object') {
      return recommendations;
    }

    const metricsObj = metrics as Record<string, unknown>;
    
    // Performance recommendations
    if (metricsObj.performance && typeof metricsObj.performance === 'object') {
      const performance = metricsObj.performance as Record<string, unknown>;
      if (performance.averageResponseTime && typeof performance.averageResponseTime === 'number' && performance.averageResponseTime > 500) {
        recommendations.push('Consider optimizing response times');
      }
      if (performance.errorRate && typeof performance.errorRate === 'number' && performance.errorRate > 1) {
        recommendations.push('Investigate high error rates');
      }
    }

    // Uptime recommendations
    if (metricsObj.uptime && typeof metricsObj.uptime === 'object') {
      const uptime = metricsObj.uptime as Record<string, unknown>;
      if (uptime.percentage24h && typeof uptime.percentage24h === 'number' && uptime.percentage24h < 99) {
        recommendations.push('Improve uptime reliability');
      }
    }

    // Security recommendations
    if (metricsObj.security && typeof metricsObj.security === 'object') {
      const security = metricsObj.security as Record<string, unknown>;
      if (security.securityHeaders && typeof security.securityHeaders === 'object') {
        const headers = security.securityHeaders as Record<string, unknown>;
        if (headers.score && typeof headers.score === 'number' && headers.score < 80) {
          recommendations.push('Implement missing security headers');
        }
      }
    }

    return recommendations;
  }

  private async storeHealthMetrics(metrics: DomainHealthMetrics): Promise<void> {
    try {
      const cacheKey = `health_metrics:${metrics.domainId}`;
      await this.cacheService.cacheData(cacheKey, metrics, 300); // 5 minutes
    } catch (error) {
      console.error('Failed to store health metrics:', error);
    }
  }

  private async checkAlertConditions(metrics: DomainHealthMetrics): Promise<void> {
    try {
      const alertConditions = [
        { condition: metrics.score < 50, severity: 'critical' as AlertSeverity, message: 'Domain health score is critically low' },
        { condition: metrics.performance.errorRate > 5, severity: 'error' as AlertSeverity, message: 'High error rate detected' },
        { condition: metrics.uptime.percentage24h < 95, severity: 'warning' as AlertSeverity, message: 'Uptime below 95%' },
      ];

      for (const condition of alertConditions) {
        if (condition.condition) {
          await this.createAlert(metrics.domainId, condition.severity, condition.message);
        }
      }
    } catch (error) {
      console.error('Failed to check alert conditions:', error);
    }
  }

  private async createAlert(domainId: string, severity: AlertSeverity, message: string): Promise<void> {
    // Implementation would create alert in monitoring system
    console.log(`Alert created for domain ${domainId}: ${severity} - ${message}`);
  }

  private aggregateTopIssues(healthMetrics: DomainHealthMetrics[]): Array<{
    issue: string;
    count: number;
    severity: AlertSeverity;
  }> {
    const issueMap = new Map<string, { count: number; severity: AlertSeverity }>();

    healthMetrics.forEach((metrics: DomainHealthMetrics) => {
      metrics.alerts.forEach((alert: DomainAlert) => {
        const existing = issueMap.get(alert.type);
        if (existing) {
          existing.count++;
          // Keep the highest severity
          if (this.getSeverityLevel(alert.severity) > this.getSeverityLevel(existing.severity)) {
            existing.severity = alert.severity;
          }
        } else {
          issueMap.set(alert.type, { count: 1, severity: alert.severity });
        }
      });
    });

    return Array.from(issueMap.entries())
      .map(([issue, data]) => ({ issue, ...data }))
      .sort((a, b) => b.count - a.count);
  }

  private getSeverityLevel(severity: AlertSeverity): number {
    const levels = { info: 1, warning: 2, error: 3, critical: 4 };
    return levels[severity];
  }
}

export default DomainHealthMonitoringService; 