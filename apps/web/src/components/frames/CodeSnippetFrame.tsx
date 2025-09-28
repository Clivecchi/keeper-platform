/**
 * Code Snippet Frame
 * ==================
 * 
 * Frame component for displaying code with syntax highlighting and interactive features.
 * Reserved for CodeBoard usage and development workflows.
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  CodeBracketIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  EyeIcon,
  PencilIcon,
  PlayIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { BaseFrameProps } from '../../types/frame';
import { useFrame } from '../../context/FrameContext';

interface CodeSnippetData {
  language: string;
  code: string;
  title?: string;
  description?: string;
  filename?: string;
  lineNumbers?: boolean;
  editable?: boolean;
  executable?: boolean;
}

interface CodeSnippetFrameProps extends BaseFrameProps {
  codeData?: CodeSnippetData;
  theme?: 'light' | 'dark';
  maxHeight?: number;
}

const CodeSnippetFrame: React.FC<CodeSnippetFrameProps> = ({
  frameInstance,
  className = '',
  onInteraction,
  isPreview = false,
  codeData,
  theme = 'light',
  maxHeight = 400,
}) => {
  const { handleFrameInteraction } = useFrame();
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedCode, setEditedCode] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  // Default code data if none provided
  const defaultCodeData: CodeSnippetData = {
    language: 'typescript',
    title: 'Sample TypeScript Code',
    filename: 'example.ts',
    code: `// Example TypeScript function
interface User {
  id: string;
  name: string;
  email: string;
}

const createUser = async (userData: Partial<User>): Promise<User> => {
  const newUser: User = {
    id: generateId(),
    name: userData.name || 'Anonymous',
    email: userData.email || '',
  };
  
  return await saveUser(newUser);
};

export { createUser, User };`,
    lineNumbers: true,
    editable: true,
    executable: false,
  };

  const code = codeData || defaultCodeData;
  const displayCode = isEditing ? editedCode : code.code;
  const lines = displayCode.split('\n');
  const shouldTruncate = lines.length > 15 && !isExpanded;
  const visibleLines = shouldTruncate ? lines.slice(0, 15) : lines;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code.code);
      setCopied(true);
      
      handleFrameInteraction({
        type: 'click',
        frameId: frameInstance.id,
        data: { action: 'copy_code', language: code.language },
        timestamp: new Date(),
      });

      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy code:', error);
    }
  };

  const handleEdit = () => {
    if (isEditing) {
      // Save changes
      handleFrameInteraction({
        type: 'submit',
        frameId: frameInstance.id,
        data: { action: 'save_code', code: editedCode },
        timestamp: new Date(),
      });
    } else {
      // Start editing
      setEditedCode(code.code);
      handleFrameInteraction({
        type: 'click',
        frameId: frameInstance.id,
        data: { action: 'edit_code' },
        timestamp: new Date(),
      });
    }
    setIsEditing(!isEditing);
  };

  const handleRun = () => {
    handleFrameInteraction({
      type: 'click',
      frameId: frameInstance.id,
      data: { action: 'execute_code', language: code.language },
      timestamp: new Date(),
    });
    
    // TODO: Implement code execution logic
    console.log('Executing code:', code.code);
  };

  const getLanguageColor = (language: string) => {
    const colors: Record<string, string> = {
      javascript: 'bg-yellow-100 text-yellow-800',
      typescript: 'bg-blue-100 text-blue-800',
      python: 'bg-green-100 text-green-800',
      java: 'bg-red-100 text-red-800',
      css: 'bg-purple-100 text-purple-800',
      html: 'bg-orange-100 text-orange-800',
      json: 'bg-gray-100 text-gray-800',
    };
    const safe = (language ?? '').toString().toLowerCase();
    return colors[safe] || 'bg-gray-100 text-gray-800';
  };

  if (isPreview) {
    return (
      <div className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center space-x-2 mb-2">
          <CodeBracketIcon className="w-5 h-5 text-gray-600" />
          <h3 className="font-medium text-gray-900">Code Snippet</h3>
        </div>
        <p className="text-sm text-gray-600">
          Interactive code display with syntax highlighting.
        </p>
        <div className="mt-3 bg-gray-900 rounded p-2 text-green-400 text-xs font-mono">
          <span className="opacity-50">1</span> <span className="text-blue-400">const</span> example = <span className="text-yellow-400">"Hello World"</span>;
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <CodeBracketIcon className="w-5 h-5 text-gray-600" />
            <div>
              <h3 className="font-medium text-gray-900">
                {code.title || code.filename || 'Code Snippet'}
              </h3>
              {code.description && (
                <p className="text-sm text-gray-600">{code.description}</p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Language Badge */}
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getLanguageColor(code.language)}`}>
              {code.language}
            </span>

            {/* Actions */}
            <div className="flex items-center space-x-1">
              <button
                onClick={handleCopy}
                className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                title="Copy code"
              >
                {copied ? (
                  <CheckIcon className="w-4 h-4 text-green-600" />
                ) : (
                  <ClipboardDocumentIcon className="w-4 h-4" />
                )}
              </button>

              {code.editable && (
                <button
                  onClick={handleEdit}
                  className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                  title={isEditing ? 'Save changes' : 'Edit code'}
                >
                  <PencilIcon className="w-4 h-4" />
                </button>
              )}

              {code.executable && (
                <button
                  onClick={handleRun}
                  className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                  title="Run code"
                >
                  <PlayIcon className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Code Content */}
      <div 
        className={`relative ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}
        style={{ maxHeight: isExpanded ? 'none' : `${maxHeight}px` }}
      >
        {isEditing ? (
          <textarea
            value={editedCode}
            onChange={(e) => setEditedCode(e.target.value)}
            className="w-full h-full p-4 font-mono text-sm resize-none focus:outline-none bg-transparent"
            style={{ minHeight: '200px' }}
          />
        ) : (
          <div className="overflow-auto">
            <pre className={`p-4 text-sm font-mono ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>
              {code.lineNumbers ? (
                <div className="flex">
                  {/* Line Numbers */}
                  <div className={`pr-4 select-none ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                    {visibleLines.map((_, index) => (
                      <div key={index} className="text-right">
                        {index + 1}
                      </div>
                    ))}
                  </div>
                  
                  {/* Code */}
                  <div className="flex-1">
                    {visibleLines.map((line, index) => (
                      <div key={index}>
                        {line || '\u00A0'}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <code>
                  {visibleLines.join('\n')}
                </code>
              )}
            </pre>
          </div>
        )}

        {/* Expand/Collapse Button */}
        {shouldTruncate && !isEditing && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-gray-50 to-transparent h-12 flex items-end justify-center pb-2">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="px-3 py-1 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-50 transition-colors shadow-sm"
            >
              <EyeIcon className="w-4 h-4 inline mr-1" />
              Show {lines.length - 15} more lines
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      {(code.filename || copied) && (
        <div className="bg-gray-50 px-4 py-2 border-t border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            {code.filename && (
              <>
                <InformationCircleIcon className="w-4 h-4" />
                <span>{code.filename}</span>
              </>
            )}
          </div>
          
          {copied && (
            <motion.span
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-sm text-green-600 flex items-center space-x-1"
            >
              <CheckIcon className="w-4 h-4" />
              <span>Copied!</span>
            </motion.span>
          )}
        </div>
      )}
    </div>
  );
};

export default CodeSnippetFrame;
