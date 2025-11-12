/**
 * PropRenderer - Renders individual props based on their type
 * Maps prop.type to appropriate display component
 */

import React from 'react';
import { ManifestoCard, type ManifestoProps } from '../patterns/ManifestoCard';
import { EditableProp } from './EditableProp';

interface PropConfig {
  name?: string;
  label?: string;
  dataSource?: string;
  level?: 'h1' | 'h2' | 'h3';
  variant?: string;
  tone?: string;
  content?: string;
  url?: string;  // For image props
  alt?: string;  // For image alt text
  engagementTemplate?: string;
  visibility?: 'public' | 'admin';
  fields?: any[];
  [key: string]: any;
}

interface Prop {
  id: string;
  type: string;
  config: PropConfig;
  value?: any;
  orderIndex: number;
}

interface PropRendererProps {
  prop: Prop;
  domain?: any;
  onEngagementAction?: (templateSlug: string, context: any) => void;
  isEditMode?: boolean;
  onPropUpdate?: (propId: string, newValue: any) => void;
}

export function PropRenderer({ prop, domain, onEngagementAction, isEditMode = false, onPropUpdate }: PropRendererProps) {
  const { type, config, value } = prop;

  const handleUpdate = (propId: string, newValue: any) => {
    if (onPropUpdate) {
      onPropUpdate(propId, newValue);
    }
  };

  switch (type) {
    case 'heading':
      return (
        <EditableProp
          propId={prop.id}
          propType="heading"
          currentValue={value || config.content || config.name}
          isEditMode={isEditMode}
          onUpdate={handleUpdate}
        >
          <HeadingProp config={config} value={value} />
        </EditableProp>
      );
    
    case 'text':
      return (
        <EditableProp
          propId={prop.id}
          propType="text"
          currentValue={value || config.content}
          isEditMode={isEditMode}
          onUpdate={handleUpdate}
        >
          <TextProp config={config} value={value} />
        </EditableProp>
      );
    
    case 'image':
      return (
        <EditableProp
          propId={prop.id}
          propType="image"
          currentValue={config.url || value}
          isEditMode={isEditMode}
          onUpdate={handleUpdate}
        >
          <ImageProp config={config} value={value} />
        </EditableProp>
      );
    
    case 'gallery':
      return <GalleryProp config={config} value={value} />;
    
    case 'quote':
      return <QuoteProp config={config} value={value} />;
    
    case 'button':
      return (
        <EditableProp
          propId={prop.id}
          propType="button"
          currentValue={{ label: config.label || config.name, url: config.url }}
          isEditMode={isEditMode}
          onUpdate={handleUpdate}
        >
          <ButtonProp 
            config={config} 
            domain={domain}
            onEngagementAction={onEngagementAction}
          />
        </EditableProp>
      );
    
    case 'form':
      return (
        <FormProp 
          config={config} 
          domain={domain}
          onEngagementAction={onEngagementAction}
        />
      );
    
    case 'ai-assistant':
      return <AIAssistantProp config={config} value={value} />;
    
    case 'manifesto':
      return <ManifestoProp config={config} value={value} />;
    
    default:
      return (
        <div className="p-2 bg-gray-100 rounded text-sm text-gray-600">
          Unknown prop type: {type}
        </div>
      );
  }
}

// ============================================================================
// INDIVIDUAL PROP COMPONENTS
// ============================================================================

function HeadingProp({ config, value }: { config: PropConfig; value: any }) {
  const text = value || config.content || config.name || 'Untitled';
  const level = config.level || 'h2';
  
  const baseClasses = 'font-bold text-gray-900';
  const levelClasses = {
    h1: 'text-4xl md:text-5xl mb-4',
    h2: 'text-2xl md:text-3xl mb-3',
    h3: 'text-xl md:text-2xl mb-2',
  };
  
  const className = `${baseClasses} ${levelClasses[level]}`;
  
  if (level === 'h1') return <h1 className={className}>{text}</h1>;
  if (level === 'h3') return <h3 className={className}>{text}</h3>;
  return <h2 className={className}>{text}</h2>;
}

function TextProp({ config, value }: { config: PropConfig; value: any }) {
  const text = value || config.content || '';
  const tone = config.tone || 'normal';
  
  const toneClasses = {
    soft: 'text-gray-600 italic',
    subtle: 'text-gray-500 text-sm',
    status: 'text-blue-700 font-medium',
    normal: 'text-gray-800',
  };
  
  return (
    <p className={`${toneClasses[tone as keyof typeof toneClasses] || toneClasses.normal} mb-2`}>
      {text}
    </p>
  );
}

function ImageProp({ config, value }: { config: PropConfig; value: any }) {
  // Handle both simple string URLs and media object format from MediaUploader
  let src: string;
  if (typeof value === 'string') {
    src = value;
  } else if (value && typeof value === 'object' && value.url) {
    // MediaUploader format: { type: 'image', url: '...', width: ..., height: ... }
    src = value.url;
  } else if (config.url) {
    // ImagePropEditor saves to config.url
    src = config.url;
  } else if (config.content) {
    src = config.content;
  } else {
    src = '/placeholder.svg';
  }
  
  const alt = config.name || config.alt || 'Image';
  const variant = config.variant || 'normal';
  
  console.log('[ImageProp] Rendering image:', { src, hasValue: !!value, hasConfigUrl: !!config.url, hasConfigContent: !!config.content });
  
  if (variant === 'full-bleed') {
    return (
      <div className="w-full -mx-4 mb-4">
        <img 
          src={src} 
          alt={alt} 
          className="w-full h-64 object-cover"
          onError={(e) => {
            console.error('Image load error:', src);
            e.currentTarget.style.display = 'none';
          }}
        />
      </div>
    );
  }
  
  return (
    <img 
      src={src} 
      alt={alt} 
      className="w-full rounded-lg mb-4"
      onError={(e) => {
        console.error('Image load error:', src);
        e.currentTarget.style.display = 'none';
      }}
    />
  );
}

function GalleryProp({ config, value }: { config: PropConfig; value: any }) {
  const items = Array.isArray(value) ? value : [];
  const layout = config.layout || 'cards';
  
  if (items.length === 0) {
    return (
      <div className="text-gray-500 text-sm italic mb-4">
        No items to display
      </div>
    );
  }
  
  if (layout === 'avatars+labels') {
    return (
      <div className="flex flex-wrap gap-4 mb-4">
        {items.map((item, idx) => (
          <div key={idx} className="flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-gray-300 mb-1" />
            <span className="text-xs text-gray-700">{item.name || item.title || 'Member'}</span>
          </div>
        ))}
      </div>
    );
  }
  
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
      {items.map((item, idx) => (
        <div key={idx} className="border rounded-lg p-3 hover:shadow-md transition-shadow">
          <h4 className="font-medium text-sm mb-1">{item.title || item.name || `Item ${idx + 1}`}</h4>
          {item.description && (
            <p className="text-xs text-gray-600">{item.description}</p>
          )}
        </div>
      ))}
    </div>
  );
}

function QuoteProp({ config, value }: { config: PropConfig; value: any }) {
  const text = value || config.content || '';
  const variant = config.variant || 'normal';
  
  const variantClasses = {
    accent: 'border-l-4 border-blue-500 bg-blue-50',
    normal: 'border-l-4 border-gray-300 bg-gray-50',
  };
  
  return (
    <blockquote className={`${variantClasses[variant as keyof typeof variantClasses] || variantClasses.normal} pl-4 py-3 italic text-gray-700 mb-4`}>
      {text}
    </blockquote>
  );
}

function ButtonProp({ 
  config, 
  domain, 
  onEngagementAction 
}: { 
  config: PropConfig; 
  domain: any;
  onEngagementAction?: (templateSlug: string, context: any) => void;
}) {
  const label = config.label || config.name || 'Action';
  const templateSlug = config.engagementTemplate;
  
  if (!templateSlug) {
    return (
      <button className="px-4 py-2 bg-gray-300 text-gray-500 rounded cursor-not-allowed mb-4">
        {label} (No template)
      </button>
    );
  }
  
  const handleClick = () => {
    if (onEngagementAction && domain) {
      const context = {
        domainId: domain.id,
        entityType: 'domain',
        entityId: domain.id,
      };
      onEngagementAction(templateSlug, context);
    }
  };
  
  return (
    <button
      onClick={handleClick}
      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors mb-4"
    >
      {label}
    </button>
  );
}

function FormProp({ 
  config, 
  domain,
  onEngagementAction 
}: { 
  config: PropConfig; 
  domain: any;
  onEngagementAction?: (templateSlug: string, context: any) => void;
}) {
  const label = config.label || config.name || 'Form';
  const templateSlug = config.engagementTemplate;
  
  if (!templateSlug) {
    return (
      <div className="p-4 border rounded bg-gray-50 mb-4">
        <p className="text-sm text-gray-600">{label} (No template configured)</p>
      </div>
    );
  }
  
  const handleClick = () => {
    if (onEngagementAction && domain) {
      const context = {
        domainId: domain.id,
        entityType: 'domain',
        entityId: domain.id,
      };
      onEngagementAction(templateSlug, context);
    }
  };
  
  return (
    <div className="p-4 border rounded bg-white mb-4">
      <h4 className="font-medium text-gray-900 mb-2">{label}</h4>
      {config.fields && config.fields.length > 0 && (
        <p className="text-sm text-gray-600 mb-3">
          {config.fields.length} field{config.fields.length !== 1 ? 's' : ''}
        </p>
      )}
      <button
        onClick={handleClick}
        className="px-3 py-1.5 bg-gray-800 text-white rounded text-sm hover:bg-gray-900 transition-colors"
      >
        Open {label}
      </button>
    </div>
  );
}

function AIAssistantProp({ config, value }: { config: PropConfig; value: any }) {
  const agentData = value;
  const name = agentData?.name || 'No agent assigned';
  const purpose = agentData?.purpose || config.content || '';
  
  return (
    <div className="p-4 border rounded bg-gradient-to-br from-purple-50 to-blue-50 mb-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-full bg-purple-300 flex items-center justify-center text-purple-700 font-bold">
          AI
        </div>
        <div>
          <h4 className="font-medium text-gray-900">{name}</h4>
          {purpose && <p className="text-xs text-gray-600">{purpose}</p>}
        </div>
      </div>
    </div>
  );
}

function ManifestoProp({ config, value }: { config: PropConfig; value: any }) {
  // Extract manifesto data from config or value
  const manifestoData: ManifestoProps = {
    title: config.title || value?.title || 'Manifesto',
    kicker: config.kicker || value?.kicker,
    quote: config.quote || value?.quote || '',
    content: config.content || value?.content,
    cta: config.cta || value?.cta,
    themeVariant: (config.themeVariant || value?.themeVariant || 'system') as ManifestoProps['themeVariant'],
  };
  
  return <ManifestoCard {...manifestoData} />;
}

