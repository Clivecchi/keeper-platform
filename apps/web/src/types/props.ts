export type LinkedCardEntityType =
  | 'journey'
  | 'keeper'
  | 'moment'
  | 'draft'
  | 'board'
  | 'frame'
  | 'theme'
  | 'domain'
  | 'agent';

export interface LinkedCardPreview {
  image?: string;
  date?: string;
  snippet?: string;
}

export interface LinkedCardProps {
  entityType: LinkedCardEntityType;
  entityId: string;
  title: string;
  subtitle?: string;
  description?: string;
  href: string;
  icon?: string;
  color?: string;
  preview?: LinkedCardPreview;
}

