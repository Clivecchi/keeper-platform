// SSL Certificate types
export type CertificateProvider = 'letsencrypt' | 'cloudflare' | 'vercel' | 'custom';
export type CertificateStatus = 'pending' | 'valid' | 'expired' | 'revoked' | 'error' | 'failed' | 'active';

export interface CertificateInfo {
  id: string;
  domainId: string;
  customDomain: string;
  provider: CertificateProvider;
  status: CertificateStatus;
  validFrom: Date;
  validUntil: Date;
  commonName?: string;
  expiresAt?: Date;
  renewalAt?: Date;
  issuer?: string;
  serialNumber?: string;
  fingerprintSha256?: string;
  renewalFailureCount?: number;
  domain?: string; // For compatibility with legacy code
  issuedAt?: Date;
  lastRenewalAttempt?: Date;
  metadata: {
    challengeType?: 'http-01' | 'dns-01' | 'tls-alpn-01';
    validationMethod?: string;
    keyAlgorithm?: 'RSA-2048' | 'RSA-4096' | 'ECDSA-P256' | 'ECDSA-P384';
    certificateChain?: string[];
    error?: string;
    lastRenewalAttempt?: Date;
    issuedAt?: Date;
  };
}

export interface CertificateRequest {
  domainId: string; // Add missing domainId field
  customDomain: string;
  provider: CertificateProvider;
  challengeType?: 'http-01' | 'dns-01' | 'tls-alpn-01';
  keyAlgorithm?: 'RSA-2048' | 'RSA-4096' | 'ECDSA-P256' | 'ECDSA-P384';
  autoRenewal?: boolean; // Use autoRenewal instead of autoRenew
  notificationEmail?: string; // Add missing field
} 