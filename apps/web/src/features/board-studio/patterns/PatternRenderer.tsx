/**
 * Pattern Renderer - Phase 2 Implementation
 * Renders frames according to their engagement patterns in Preview mode
 */

import React from 'react';
const __DEBUG_STUDIO__ = import.meta.env.VITE_STUDIO_DEBUG === '1';
import SettingsRenderer from '../settings/SettingsRenderer';
import MediaUploader from '../../../components/studio/MediaUploader';
import PropManager from '../../../components/props/PropManager';
import { PathwayNav } from '../../../components/patterns/PathwayNav';
import { ManifestoCard } from '../../../components/patterns/ManifestoCard';
import { 
  ChevronLeftIcon, 
  ChevronRightIcon,
  CheckCircleIcon,
  UserCircleIcon,
  CpuChipIcon,
  PhotoIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';

// =============================================================================
// TYPES
// =============================================================================

export interface FrameData {
  id: string;
  name: string;
  pattern: string;
  frameType: string;
  layoutKind: string;
  layoutData: Record<string, any>;
  props: Record<string, any>;
  role?: string;
}

interface PatternRendererProps {
  frame: FrameData;
  mode: 'edit' | 'layout' | 'preview' | 'assist' | 'studio';
  boardName?: string;
  boardDescription?: string;
  boardData?: any; // Full board data for Settings frame
  frames?: Array<{ id: string; name: string; role?: string }>;
  onFrameUpdate?: (frameId: string, updates: Partial<FrameData>) => void;
  onBoardUpdate?: (updates: any) => Promise<void>;
}

// =============================================================================
// PATTERN COMPONENTS
// =============================================================================

const FocusPattern: React.FC<{ 
  frame: FrameData; 
  boardName?: string; 
  boardDescription?: string;
  mode?: string;
  onFrameUpdate?: (frameId: string, updates: Partial<FrameData>) => void;
}> = ({ 
  frame, 
  boardName, 
  boardDescription,
  mode,
  onFrameUpdate
}) => {
  const { props } = frame;
  
  // Handle Cover frame special case
  if (frame.role === 'cover') {
    const title = props.title === '__BOARD_NAME__' ? boardName : props.title;
    const subtitle = props.subtitle === '__BOARD_DESC__' ? boardDescription : props.subtitle;
    
    // Edit/Studio mode - show media configuration
    if (mode === 'edit' || mode === 'studio') {
      return (
        <div className="w-full max-w-4xl mx-auto space-y-6">
          {/* Preview */}
          <div className="w-full h-64 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center relative overflow-hidden">
            {props.media?.url ? (
              <div className="absolute inset-0">
                {props.media.type === 'video' ? (
                  <video 
                    src={props.media.url} 
                    className="w-full h-full object-cover"
                    muted
                    loop
                  />
                ) : (
                  <img 
                    src={props.media.url} 
                    alt={title || 'Cover image'} 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                )}
                <div className="absolute inset-0 bg-black bg-opacity-40" />
              </div>
            ) : null}
            <div className={`text-center text-white relative z-10 ${props.alignment === 'left' ? 'text-left' : 'text-center'}`}>
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mb-3 mx-auto">
                <PhotoIcon className="w-6 h-6" />
              </div>
              <h1 className="text-xl font-bold mb-2">{title || 'Untitled Board'}</h1>
              <p className="text-blue-100 text-sm">{subtitle || 'Cover preview'}</p>
            </div>
          </div>
          
          {/* Media Configuration */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Cover Media Settings</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Media Type
                </label>
                <select
                  value={props.media?.type || 'image'}
                  onChange={(e) => {
                    const newProps = {
                      ...props,
                      media: { ...props.media, type: e.target.value }
                    };
                    onFrameUpdate?.(frame.id, { props: newProps });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="image">Image</option>
                  <option value="video">Video</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Media Upload
                </label>
                <MediaUploader
                  value={props.media}
                  onChange={(media) => {
                    const newProps = {
                      ...props,
                      media
                    };
                    onFrameUpdate?.(frame.id, { props: newProps });
                  }}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Alignment
                </label>
                <select
                  value={props.alignment || 'center'}
                  onChange={(e) => {
                    const newProps = {
                      ...props,
                      alignment: e.target.value
                    };
                    onFrameUpdate?.(frame.id, { props: newProps });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="center">Center</option>
                  <option value="left">Left</option>
                </select>
              </div>
              
              <div className="pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-600">
                  <strong>Title:</strong> {title} 
                  {props.title === '__BOARD_NAME__' && (
                    <span className="text-blue-600 ml-2">(Linked to Board name)</span>
                  )}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  <strong>Subtitle:</strong> {subtitle || 'No subtitle'}
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }
    
    // Preview mode - full cover display
    return (
      <div className="w-full max-w-4xl mx-auto">
        <div className="w-full h-96 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center relative overflow-hidden">
          {props.media?.url && (
            <div className="absolute inset-0">
              {props.media.type === 'video' ? (
                <video 
                  src={props.media.url} 
                  className="w-full h-full object-cover"
                  autoPlay
                  muted
                  loop
                />
              ) : (
                <img 
                  src={props.media.url} 
                  alt={title || 'Cover image'} 
                  className="w-full h-full object-cover"
                />
              )}
              <div className="absolute inset-0 bg-black bg-opacity-40" />
            </div>
          )}
          <div className={`text-center text-white relative z-10 ${props.alignment === 'left' ? 'text-left' : 'text-center'}`}>
            <div className="w-16 h-16 bg-white/20 rounded-lg flex items-center justify-center mb-4 mx-auto">
              <PhotoIcon className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold mb-2">{title || 'Untitled Board'}</h1>
            <p className="text-blue-100">{subtitle || 'Discover the journey behind our latest innovation'}</p>
            {props.cta && (
              <button className="mt-4 px-6 py-2 bg-white text-blue-600 rounded-lg font-medium hover:bg-blue-50 transition-colors">
                {props.cta.label || 'Learn More'}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }
  
  // Regular focus pattern
  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="bg-white rounded-lg border border-gray-200 p-8 shadow-sm">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-4">{frame.name}</h3>
          <div className="text-gray-600 mb-6">
            <DocumentTextIcon className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p>Focus content will be rendered here based on frame configuration.</p>
          </div>
          {props.showActions && (
            <div className="flex justify-center space-x-4">
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Primary Action
              </button>
              <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                Secondary Action
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const FormPattern: React.FC<{ 
  frame: FrameData; 
  mode: string;
  boardData?: any;
  frames?: Array<{ id: string; name: string; role?: string }>;
  onBoardUpdate?: (updates: any) => Promise<void>;
}> = ({ frame, mode, boardData, frames, onBoardUpdate }) => {
  if (frame.role === 'settings' && boardData) {
    return (
      <SettingsRenderer
        board={boardData}
        frames={frames}
        mode={(mode === 'edit' || mode === 'studio') ? 'edit' : 'preview'}
        onSave={onBoardUpdate}
      />
    );
  }
  
  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">{frame.name}</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Sample Field</label>
            <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg" disabled />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Another Field</label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-lg" disabled>
              <option>Option 1</option>
              <option>Option 2</option>
            </select>
          </div>
          <div className="text-sm text-gray-500 italic">Form preview mode</div>
        </div>
      </div>
    </div>
  );
};

const DialogicPattern: React.FC<{ frame: FrameData }> = ({ frame }) => {
  const { props } = frame;
  
  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-4 border-b border-gray-200">
          <h3 className="font-medium text-gray-900">{props.title || frame.name}</h3>
          <p className="text-sm text-gray-500">AI conversation interface</p>
        </div>
        
        <div className="h-64 p-4 space-y-4 overflow-y-auto">
          <div className="flex items-start space-x-3">
            <CpuChipIcon className="w-6 h-6 text-blue-500 flex-shrink-0 mt-1" />
            <div className="bg-blue-50 rounded-lg p-3 max-w-xs">
              <p className="text-sm text-gray-900">
                Hello! I'm here to help you with this board. What would you like to know?
              </p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3 justify-end">
            <div className="bg-gray-100 rounded-lg p-3 max-w-xs">
              <p className="text-sm text-gray-900">
                Can you help me understand how this works?
              </p>
            </div>
            <UserCircleIcon className="w-6 h-6 text-gray-400 flex-shrink-0 mt-1" />
          </div>
          
          <div className="flex items-start space-x-3">
            <CpuChipIcon className="w-6 h-6 text-blue-500 flex-shrink-0 mt-1" />
            <div className="bg-blue-50 rounded-lg p-3 max-w-xs">
              <p className="text-sm text-gray-900">
                Of course! This is a dialogic frame where you can have conversations with AI agents.
              </p>
            </div>
          </div>
        </div>
        
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center space-x-2">
            <input 
              type="text" 
              placeholder={props.placeholder || "Type your message..."}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled
            />
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50" disabled>
              Send
            </button>
          </div>
          <div className="text-xs text-gray-500 mt-2">Preview mode - conversation disabled</div>
        </div>
      </div>
    </div>
  );
};

const WizardPattern: React.FC<{ frame: FrameData }> = ({ frame }) => {
  const { props } = frame;
  const steps = props.steps || [
    { id: 'step1', label: 'Step 1', completed: false },
    { id: 'step2', label: 'Step 2', completed: false },
    { id: 'step3', label: 'Step 3', completed: false }
  ];
  const currentStep = 0;
  
  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-6">{props.title || frame.name}</h3>
        
        {/* Step indicator */}
        <div className="flex items-center justify-between mb-8">
          {steps.map((step: any, index: number) => (
            <div key={step.id} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                index <= currentStep 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-600'
              }`}>
                {step.completed ? (
                  <CheckCircleIcon className="w-5 h-5" />
                ) : (
                  index + 1
                )}
              </div>
              <span className="ml-2 text-sm font-medium text-gray-900">{step.label}</span>
              {index < steps.length - 1 && (
                <div className={`w-16 h-px mx-4 ${
                  index < currentStep ? 'bg-blue-600' : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>
        
        {/* Step content */}
        <div className="mb-8">
          <div className="text-center py-12 text-gray-500">
            <DocumentTextIcon className="w-12 h-12 mx-auto mb-4" />
            <p>Step {currentStep + 1} content would appear here</p>
            <p className="text-sm mt-2">Wizard navigation in preview mode</p>
          </div>
        </div>
        
        {/* Navigation */}
        <div className="flex justify-between">
          <button 
            className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-50"
            disabled={currentStep === 0}
          >
            <ChevronLeftIcon className="w-4 h-4 mr-2" />
            Previous
          </button>
          <button 
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            disabled
          >
            Next
            <ChevronRightIcon className="w-4 h-4 ml-2" />
          </button>
        </div>
      </div>
    </div>
  );
};

const GalleryPattern: React.FC<{ frame: FrameData }> = ({ frame }) => {
  const { props } = frame;
  const items = props.items || [];
  
  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-6">{props.title || frame.name}</h3>
        
        {items.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((item: any, index: number) => (
              <div key={index} className="bg-gray-50 rounded-lg p-4">
                {item.src && (
                  <img 
                    src={item.src} 
                    alt={item.title || `Item ${index + 1}`}
                    className="w-full h-32 object-cover rounded-lg mb-3"
                  />
                )}
                <h4 className="font-medium text-gray-900">{item.title || `Item ${index + 1}`}</h4>
                {item.description && (
                  <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <PhotoIcon className="w-12 h-12 mx-auto mb-4" />
            <p>Gallery items will appear here</p>
            <p className="text-sm mt-2">Add items in Edit mode to populate the gallery</p>
          </div>
        )}
      </div>
    </div>
  );
};

const PathwayNavPattern: React.FC<{ frame: FrameData }> = ({ frame }) => {
  const { props } = frame;
  
  return (
    <div className="w-full">
      <PathwayNav {...props} />
    </div>
  );
};

const ManifestoPattern: React.FC<{ frame: FrameData }> = ({ frame }) => {
  // Extract manifesto config from props
  // Props can be an array with a manifesto type prop, or a direct config object
  let manifestoConfig = frame.props;
  
  if (Array.isArray(frame.props)) {
    const manifestoProp = frame.props.find((p: any) => p.type === 'manifesto');
    if (manifestoProp?.config) {
      manifestoConfig = manifestoProp.config;
    }
  } else if (frame.props?.config) {
    manifestoConfig = frame.props.config;
  }
  
  if (__DEBUG_STUDIO__) console.log('📜 ManifestoPattern: Rendering', {
    frameId: frame.id,
    manifestoConfig
  });
  
  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <ManifestoCard {...manifestoConfig} />
    </div>
  );
};

const CanvasPattern: React.FC<{ frame: FrameData }> = ({ frame }) => {
  if (__DEBUG_STUDIO__) console.log('🎨 CanvasPattern: Rendering frame', {
    frameId: frame.id,
    frameName: frame.name,
    frameProps: frame.props,
    propsType: typeof frame.props,
    propsIsArray: Array.isArray(frame.props),
    propsKeys: frame.props ? Object.keys(frame.props) : null
  });
  
  // Convert backend props object to array format
  let propsArray = [];
  if (frame.props) {
    if (Array.isArray(frame.props)) {
      propsArray = frame.props;
    } else if (typeof frame.props === 'object') {
      propsArray = Object.values(frame.props).filter((prop): prop is any => 
        prop && typeof prop === 'object' && 'id' in prop && 'type' in prop
      );
    }
  }
  
  if (__DEBUG_STUDIO__) console.log('🎨 CanvasPattern: Processed props array', {
    originalProps: frame.props,
    propsArrayLength: propsArray.length,
    propsArray: propsArray,
    propTypes: propsArray.map(p => p.type),
    propIds: propsArray.map(p => p.id)
  });
  
  // Sort props by orderIndex
  const sortedProps = propsArray.sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
  
  const renderProp = (prop: any) => {
    if (__DEBUG_STUDIO__) console.log('🎯 CanvasPattern: Rendering prop', {
      propId: prop.id,
      propType: prop.type,
      propConfig: prop.config,
      hasConfig: !!prop.config
    });
    
    switch (prop.type) {
      case 'text':
        return (
          <div key={prop.id} className="mb-4">
            <p className="text-gray-900" style={{ fontSize: prop.config.fontSize === 'large' ? '18px' : prop.config.fontSize === 'small' ? '14px' : '16px', fontWeight: prop.config.bold ? 'bold' : 'normal' }}>
              {prop.config.content || 'Empty text block'}
            </p>
          </div>
        );
      case 'heading':
        {
          const lvl = Math.min(6, Math.max(1, Number(prop.config.level ?? 2)));
          const HeadingTag: React.ElementType = `h${lvl}` as unknown as React.ElementType;
          return (
            <div key={prop.id} className="mb-4">
              {React.createElement(
                HeadingTag,
                { className: 'text-gray-900 font-bold', style: { textAlign: prop.config.alignment ?? 'left' } },
                prop.config.content || 'Empty heading'
              )}
            </div>
          );
        }
      case 'button':
        return (
          <div key={prop.id} className="mb-4">
            <button 
              className={`px-4 py-2 rounded-lg ${
                prop.config.variant === 'secondary' 
                  ? 'bg-gray-200 text-gray-800 hover:bg-gray-300' 
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {prop.config.label || 'Button'}
            </button>
          </div>
        );
      case 'quote':
        return (
          <div key={prop.id} className="mb-4 border-l-4 border-blue-500 pl-4 italic">
            <p className="text-gray-700">"{prop.config.content || 'Empty quote'}"</p>
            {prop.config.author && (
              <p className="text-sm text-gray-500 mt-2">— {prop.config.author}</p>
            )}
          </div>
        );
      case 'image':
        return (
          <div key={prop.id} className="mb-4">
            {prop.config.url ? (
              <img 
                src={prop.config.url} 
                alt={prop.config.alt || 'Image'} 
                className="rounded-lg max-w-full h-auto"
              />
            ) : (
              <div className="w-full h-32 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500">
                No image source
              </div>
            )}
          </div>
        );
      case 'ai-assistant':
        return (
          <div key={prop.id} className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm">
                🤖
              </div>
              <div>
                <p className="text-blue-900">{prop.config.greeting || 'Hello! How can I help you?'}</p>
              </div>
            </div>
          </div>
        );
      case 'form':
        return (
          <div key={prop.id} className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-3">{prop.config.name || 'Form'}</h3>
            <div className="space-y-3">
              {prop.config.fields && prop.config.fields.length > 0 ? (
                prop.config.fields.map((field: any, index: number) => (
                  <div key={index}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {field.label || `Field ${index + 1}`}
                    </label>
                    {field.type === 'textarea' ? (
                      <textarea
                        placeholder={field.placeholder || ''}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        rows={3}
                        disabled
                      />
                    ) : (
                      <input
                        type={field.type || 'text'}
                        placeholder={field.placeholder || ''}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        disabled
                      />
                    )}
                  </div>
                ))
              ) : (
                <div className="text-gray-500 text-sm">No form fields configured</div>
              )}
              <button 
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                disabled
              >
                {prop.config.submitLabel || 'Submit'}
              </button>
            </div>
          </div>
        );
      case 'gallery':
        return (
          <div key={prop.id} className="mb-4">
            <h3 className="text-lg font-medium text-gray-900 mb-3">{prop.config.name || 'Image Gallery'}</h3>
            {prop.config.images && prop.config.images.length > 0 ? (
              <div className={`grid gap-2 ${
                prop.config.layout === 'grid' 
                  ? `grid-cols-${prop.config.columns || 3}` 
                  : 'grid-cols-1'
              }`}>
                {prop.config.images.map((image: any, index: number) => (
                  <div key={index} className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                    <img 
                      src={image.url || image} 
                      alt={image.alt || `Gallery image ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <div className="text-gray-400 mb-2">📷</div>
                <p className="text-gray-500 text-sm">No images in gallery</p>
                <p className="text-xs text-gray-400 mt-1">
                  Layout: {prop.config.layout || 'grid'} • Columns: {prop.config.columns || 3}
                </p>
              </div>
            )}
          </div>
        );
      default:
        return (
          <div key={prop.id} className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="text-sm text-gray-600">
              {prop.type}: {JSON.stringify(prop.config).substring(0, 100)}...
            </div>
          </div>
        );
    }
  };
  
  if (__DEBUG_STUDIO__) console.log('🎨 CanvasPattern: Final render', {
    sortedPropsLength: sortedProps.length,
    sortedProps: sortedProps.map(p => ({id: p.id, type: p.type}))
  });

  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        {sortedProps.length > 0 ? (
          <div className="space-y-4">
            {sortedProps.map(renderProp)}
          </div>
        ) : (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
            <div className="text-gray-500">
              <div className="grid grid-cols-8 gap-2 mb-6 opacity-50">
                {Array.from({ length: 32 }).map((_, i) => (
                  <div key={i} className="h-2 bg-gray-200 rounded" />
                ))}
              </div>
              <p>Canvas layout - no props added yet</p>
              <p className="text-sm mt-2">Switch to Edit mode to add props</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// =============================================================================
// MAIN RENDERER
// =============================================================================

const PatternRenderer: React.FC<PatternRendererProps> = ({ 
  frame, 
  mode, 
  boardName, 
  boardDescription,
  boardData,
  frames,
  onFrameUpdate,
  onBoardUpdate
}) => {
  // Debug logging to understand what's happening
  if (__DEBUG_STUDIO__) console.log('🎨 PatternRenderer: Rendering frame', {
    frameId: frame.id,
    frameName: frame.name,
    frameRole: frame.role,
    framePattern: frame.pattern,
    mode: mode,
    hasProps: !!frame.props,
    propsKeys: frame.props ? Object.keys(frame.props) : [],
    propsContent: frame.props
  });
  
  // Specific debug for Preview mode
  if (mode === 'preview') {
    if (__DEBUG_STUDIO__) console.log('🔍 PatternRenderer: PREVIEW MODE detected', {
      frameRole: frame.role,
      framePattern: frame.pattern,
      willUseFocusPattern: frame.role === 'cover',
      willUseCanvasPattern: frame.role !== 'cover' && frame.pattern === 'canvas'
    });
  }
  // In Studio, Edit, and Layout modes, show PropManager for prop editing and drag-drop
  if (mode === 'edit' || mode === 'layout' || mode === 'studio') {
    return (
      <div className="w-full max-w-4xl mx-auto">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          {/* Canvas space is purely for props - no frame metadata */}
          <PropManager
            frameId={frame.id}
            initialProps={(() => {
              // Convert backend props object to array format expected by PropManager
              let props = [];
              if (frame.props) {
                if (Array.isArray(frame.props)) {
                  // Already an array (new format)
                  props = frame.props;
                } else if (typeof frame.props === 'object' && frame.props.props && Array.isArray(frame.props.props)) {
                  // Nested props array (intermediate format)
                  props = frame.props.props;
                } else if (typeof frame.props === 'object') {
                  // Backend object format - convert to array (this is the issue!)
                  props = Object.values(frame.props).filter((prop): prop is any => 
                    prop && typeof prop === 'object' && 'id' in prop && 'type' in prop
                  );
                } else {
                  props = [];
                }
              }
              
              console.log('🔧 PatternRenderer: Passing initialProps to PropManager', {
                frameId: frame.id,
                frameProps: frame.props,
                framePropsType: typeof frame.props,
                framePropsIsArray: Array.isArray(frame.props),
                processedProps: props,
                propsCount: props.length
              });
              return props;
            })()}
            isActive={true}
            framePattern={frame.pattern}
            showDraftToggle={mode === 'edit' || mode === 'studio'}
            isDraggable={mode === 'layout' || mode === 'studio'}
            isEditMode={mode === 'edit' || mode === 'layout' || mode === 'studio'}
            onPropsUpdate={async (frameId, props) => {
              console.log('🔄 PatternRenderer: onPropsUpdate called', { 
                frameId, 
                props, 
                hasOnFrameUpdate: !!onFrameUpdate 
              });
              
              if (onFrameUpdate) {
                try {
                  // Convert props array back to object format for backend
                  const propsObject: Record<string, unknown> = {};
                  props.forEach((prop, index) => {
                    propsObject[prop.id || `prop_${index}`] = prop;
                  });
                  
                  console.log('📡 PatternRenderer: Calling onFrameUpdate with object format...', {
                    originalPropsArray: props,
                    convertedPropsObject: propsObject
                  });
                  
                  await onFrameUpdate(frameId, { 
                    props: propsObject 
                  });
                  console.log('✅ PatternRenderer: onFrameUpdate completed successfully');
                } catch (error) {
                  console.error('❌ PatternRenderer: onFrameUpdate failed:', error);
                  throw error;
                }
              } else {
                console.warn('⚠️ PatternRenderer: No onFrameUpdate callback provided');
              }
            }}
          />
        </div>
      </div>
    );
  }
  
  // In Preview mode, render according to pattern
  // Special handling for cover frames - always use FocusPattern
  if (frame.role === 'cover') {
    return <FocusPattern frame={frame} boardName={boardName} boardDescription={boardDescription} mode={mode} onFrameUpdate={onFrameUpdate} />;
  }
  
  // For content frames, render based on pattern
  switch (frame.pattern) {
    case 'focus':
      // Only use FocusPattern for non-cover frames if explicitly set
      return <FocusPattern frame={frame} boardName={boardName} boardDescription={boardDescription} mode={mode} onFrameUpdate={onFrameUpdate} />;
    case 'form':
      return <FormPattern frame={frame} mode={mode} boardData={boardData} frames={frames} onBoardUpdate={onBoardUpdate} />;
    case 'dialogic':
      return <DialogicPattern frame={frame} />;
    case 'wizard':
      return <WizardPattern frame={frame} />;
    case 'gallery':
      return <GalleryPattern frame={frame} />;
    case 'PathwayNav':
      if (__DEBUG_STUDIO__) console.log('🎯 PatternRenderer: Using PathwayNavPattern');
      return <PathwayNavPattern frame={frame} />;
    case 'manifesto':
      if (__DEBUG_STUDIO__) console.log('🎯 PatternRenderer: Using ManifestoPattern');
      return <ManifestoPattern frame={frame} />;
    case 'canvas':
      if (__DEBUG_STUDIO__) console.log('🎯 PatternRenderer: Using CanvasPattern for canvas pattern');
      return <CanvasPattern frame={frame} />;
    default:
      if (__DEBUG_STUDIO__) console.log('🎯 PatternRenderer: Using CanvasPattern as default for pattern:', frame.pattern);
      // For content frames, default to CanvasPattern to show props
      return <CanvasPattern frame={frame} />;
  }
};

export default PatternRenderer;
