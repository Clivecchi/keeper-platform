export type DomainScope = 'user' | 'admin';

export interface Domain {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  customDomain?: string | null;
  customDomainVerified?: boolean;
  ownerId: string;
  ownerName?: string;
  status: string;
  createdAt?: string;
  isPrimary?: boolean;
}

export interface DomainFormData {
  name: string;
  slug: string;
  description?: string;
  customDomain?: string;
}

export interface DomainDetailFormProps {
  domain: Domain | null;
  scope: DomainScope;
  onSave: (formData: DomainFormData) => Promise<void>;
  onDelete?: () => Promise<void>;
  onClose?: () => void;
  isCreate?: boolean;
} 