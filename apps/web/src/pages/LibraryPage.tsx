import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  FolderOpenIcon,
  DocumentArrowUpIcon,
  DocumentTextIcon,
  DocumentIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  PlusIcon,
  CloudArrowUpIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';

type DocumentType = 'pdf' | 'json' | 'markdown' | 'text' | 'other';

interface Document {
  id: string;
  name: string;
  type: DocumentType;
  size: number;
  uploadedAt: string;
  url?: string;
  blobKey?: string;
  description?: string;
  tags?: string[];
  content?: string; // For text-based documents
}

interface UploadState {
  isUploading: boolean;
  progress: number;
  error: string | null;
  success: boolean;
}

const LibraryPage: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<DocumentType | 'all'>('all');
  const [uploadState, setUploadState] = useState<UploadState>({
    isUploading: false,
    progress: 0,
    error: null,
    success: false
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editingDocument, setEditingDocument] = useState<Document | null>(null);
  const [isViewing, setIsViewing] = useState(false);
  const [viewingDocument, setViewingDocument] = useState<Document | null>(null);
  const [documentContent, setDocumentContent] = useState<string>('');

  // Supported file types
  const supportedTypes: Record<string, DocumentType> = {
    'application/pdf': 'pdf',
    'application/json': 'json',
    'text/markdown': 'markdown',
    'text/plain': 'text',
    'text/html': 'other',
    'application/xml': 'other',
    'text/csv': 'other',
    'application/rtf': 'other'
  };

  useEffect(() => {
    // Initialize with empty array - no mock data that interferes with CRUD
    console.log('Library: Initializing with empty document list');
  }, []);



  const getDocumentIcon = (type: DocumentType) => {
    switch (type) {
      case 'pdf': return <DocumentIcon className="w-5 h-5 text-red-500" />;
      case 'json': return <DocumentTextIcon className="w-5 h-5 text-yellow-500" />;
      case 'markdown': return <DocumentTextIcon className="w-5 h-5 text-blue-500" />;
      case 'text': return <DocumentTextIcon className="w-5 h-5 text-gray-500" />;
      default: return <DocumentIcon className="w-5 h-5 text-gray-400" />;
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const maxSize = 50 * 1024 * 1024; // 50MB limit

    // Validate file size
    if (file.size > maxSize) {
      setUploadState({
        isUploading: false,
        progress: 0,
        error: 'File size exceeds 50MB limit',
        success: false
      });
      return;
    }

    // Validate file type
    const fileType = supportedTypes[file.type as keyof typeof supportedTypes];
    if (!fileType) {
      setUploadState({
        isUploading: false,
        progress: 0,
        error: 'Unsupported file type. Please upload PDF, JSON, Markdown, or text files.',
        success: false
      });
      return;
    }

    setUploadState({
      isUploading: true,
      progress: 0,
      error: null,
      success: false
    });

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadState(prev => ({
          ...prev,
          progress: Math.min(prev.progress + 10, 90)
        }));
      }, 200);

      // Here you would implement the actual Vercel Blob upload
      // For now, we'll simulate the upload
      await new Promise(resolve => setTimeout(resolve, 2000));

      clearInterval(progressInterval);

      // Create new document entry
      const newDocument: Document = {
        id: Date.now().toString(),
        name: file.name,
        type: fileType,
        size: file.size,
        uploadedAt: new Date().toISOString(),
        url: URL.createObjectURL(file), // Temporary URL for demo
        blobKey: `blob_${Date.now()}`, // Would be actual blob key
        description: '',
        tags: []
      };

      setDocuments(prev => [newDocument, ...prev]);
      setUploadState({
        isUploading: false,
        progress: 100,
        error: null,
        success: true
      });

      // Reset success state after 3 seconds
      setTimeout(() => {
        setUploadState(prev => ({ ...prev, success: false, progress: 0 }));
      }, 3000);

    } catch (error) {
      setUploadState({
        isUploading: false,
        progress: 0,
        error: 'Upload failed. Please try again.',
        success: false
      });
    }

    // Reset file input
    event.target.value = '';
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      // Create a synthetic event to reuse the upload logic
      const event = {
        target: { files, value: '' }
      } as React.ChangeEvent<HTMLInputElement>;
      handleFileUpload(event);
    }
  };

  const handleDeleteDocument = (documentId: string) => {
    if (window.confirm('Are you sure you want to delete this document?')) {
      setDocuments(prev => prev.filter(doc => doc.id !== documentId));
    }
  };

  const handleEditDocument = (document: Document) => {
    setEditingDocument({ ...document });
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    if (editingDocument) {
      setDocuments(prev => 
        prev.map(doc => 
          doc.id === editingDocument.id ? editingDocument : doc
        )
      );
      setIsEditing(false);
      setEditingDocument(null);
    }
  };

  const handleViewDocument = async (document: Document) => {
    setViewingDocument(document);
    setIsViewing(true);

    // For text-based documents, try to fetch the content
    if (document.type === 'text' || document.type === 'json' || document.type === 'markdown') {
      try {
        // In a real implementation, you would fetch the content from the blob using document.blobKey
        // For now, we'll simulate document-specific content based on the actual document
        let content = '';
        
        switch (document.type) {
          case 'json':
            if (document.name.includes('config')) {
              content = JSON.stringify({ 
                "keeper_id": "keeper_123",
                "memory_pattern": "SOLE",
                "engagement_templates": ["reflection", "dialogue"],
                "settings": {
                  "auto_save": true,
                  "theme": "keeper_classic"
                }
              }, null, 2);
            } else {
              content = JSON.stringify({ 
                "document": document.name,
                "type": "json",
                "size": document.size,
                "uploaded": document.uploadedAt,
                "tags": document.tags || []
              }, null, 2);
            }
            break;
          case 'markdown':
            if (document.name.includes('engagement')) {
              content = `# Engagement Templates

${document.description || 'Documentation for engagement template patterns'}

## Available Templates

### SOLE Dialogue Template
- **Purpose**: Self-Organizing Learning Environment conversations
- **Structure**: Prompt → Reflection → Pattern Recognition → Integration

### Reflection Journal Template
- **Purpose**: Guided personal reflection
- **Structure**: Question → Deep Dive → Insights → Action Items

## Usage

These templates can be customized for specific keeper interactions.

**File**: ${document.name}
**Size**: ${formatFileSize(document.size)}
**Tags**: ${document.tags?.join(', ') || 'None'}`;
            } else {
              content = `# ${document.name.replace('.md', '')}

${document.description || 'This is a markdown document in your library.'}

## Document Information
- **File**: ${document.name}
- **Size**: ${formatFileSize(document.size)}
- **Uploaded**: ${formatDate(document.uploadedAt)}
- **Tags**: ${document.tags?.join(', ') || 'None'}

## Content

This document would contain your actual markdown content. In a real implementation, this would be fetched from Vercel Blob storage using the document's blob key.`;
            }
            break;
          case 'text':
            content = `Document: ${document.name}
Size: ${formatFileSize(document.size)}
Uploaded: ${formatDate(document.uploadedAt)}
Description: ${document.description || 'No description available'}
Tags: ${document.tags?.join(', ') || 'None'}

--- CONTENT ---

This is the actual text content of your document "${document.name}".

In a production environment, this content would be fetched from Vercel Blob storage using the document's blob key: ${document.blobKey}

The document viewer supports various file types including:
- Plain text files (.txt)
- JSON configuration files (.json) 
- Markdown documents (.md)
- PDF files (with inline viewer)

This content is currently simulated for demonstration purposes.`;
            break;
        }
        
        setDocumentContent(content);
      } catch (error) {
        console.error('Error fetching document content:', error);
        setDocumentContent('Error loading document content');
      }
    } else {
      setDocumentContent(''); // No text content for PDFs
    }
  };

  const handleCloseViewer = () => {
    setIsViewing(false);
    setViewingDocument(null);
    setDocumentContent('');
  };

  const handleDownloadDocument = (doc: Document) => {
    // In a real implementation, this would download from Vercel Blob storage
    // For demo purposes, we'll create downloadable content based on document type
    
    let content = '';
    let mimeType = '';
    const filename = doc.name;

    switch (doc.type) {
      case 'json':
        if (doc.name.includes('config')) {
          content = JSON.stringify({
            "keeper_id": "keeper_123",
            "memory_pattern": "SOLE",
            "engagement_templates": ["reflection", "dialogue"],
            "settings": {
              "auto_save": true,
              "theme": "keeper_classic"
            }
          }, null, 2);
        } else {
          content = JSON.stringify({
            "document": doc.name,
            "type": "json",
            "size": doc.size,
            "uploaded": doc.uploadedAt,
            "tags": doc.tags || []
          }, null, 2);
        }
        mimeType = 'application/json';
        break;
        
      case 'markdown':
        content = `# ${doc.name.replace('.md', '')}

${doc.description || 'This is a markdown document in your library.'}

## Document Information
- **File**: ${doc.name}
- **Size**: ${formatFileSize(doc.size)}
- **Uploaded**: ${formatDate(doc.uploadedAt)}
- **Tags**: ${doc.tags?.join(', ') || 'None'}

## Content

This document would contain your actual markdown content. In a real implementation, this would be fetched from Vercel Blob storage using the document's blob key: ${doc.blobKey}`;
        mimeType = 'text/markdown';
        break;
        
      case 'text':
        content = `Document: ${doc.name}
Size: ${formatFileSize(doc.size)}
Uploaded: ${formatDate(doc.uploadedAt)}
Description: ${doc.description || 'No description available'}
Tags: ${doc.tags?.join(', ') || 'None'}

--- CONTENT ---

This is the actual text content of your document "${doc.name}".

In a production environment, this content would be fetched from Vercel Blob storage using the document's blob key: ${doc.blobKey}

This content is currently simulated for demonstration purposes.`;
        mimeType = 'text/plain';
        break;
        
      case 'pdf':
        // For PDFs, we'll show an info message since we can't generate actual PDF content
        alert('PDF download is not available for demo documents. In a production environment, this would download the actual PDF from Vercel Blob storage.');
        return;
        
      default:
        content = `Document: ${doc.name}\nType: ${doc.type}\nThis is demo content.`;
        mimeType = 'text/plain';
    }

    // Create and trigger download
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = filterType === 'all' || doc.type === filterType;
    return matchesSearch && matchesType;
  });

  const renderUploadArea = () => (
    <div 
      className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-primary/50 transition-colors"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <input
        type="file"
        id="file-upload"
        className="hidden"
        accept=".pdf,.json,.md,.txt,.html,.xml,.csv,.rtf"
        onChange={handleFileUpload}
        disabled={uploadState.isUploading}
      />
      
      {uploadState.isUploading ? (
        <div className="space-y-4">
          <CloudArrowUpIcon className="w-12 h-12 mx-auto text-primary" />
          <div>
            <p className="text-sm font-medium text-foreground">Uploading...</p>
            <div className="w-full bg-muted rounded-full h-2 mt-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadState.progress}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">{uploadState.progress}% complete</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <FolderOpenIcon className="w-12 h-12 mx-auto text-muted-foreground" />
          <div>
            <p className="text-sm font-medium text-foreground">
              Drop files here or{' '}
              <label htmlFor="file-upload" className="text-primary cursor-pointer hover:underline">
                browse
              </label>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Supports PDF, JSON, Markdown, Text, and other text-oriented documents (max 50MB)
            </p>
          </div>
        </div>
      )}

      {uploadState.error && (
        <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
          <div className="flex items-center gap-2">
            <ExclamationTriangleIcon className="w-4 h-4 text-destructive" />
            <p className="text-sm text-destructive">{uploadState.error}</p>
          </div>
        </div>
      )}

      {uploadState.success && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
          <div className="flex items-center gap-2">
            <CheckCircleIcon className="w-4 h-4 text-green-600" />
            <p className="text-sm text-green-800">File uploaded successfully!</p>
          </div>
        </div>
      )}


    </div>
  );

  const renderDocumentCard = (document: Document) => (
    <motion.div
      key={document.id}
      className="p-4 border rounded-lg transition-all hover:shadow-md border-border hover:border-primary/50"
      whileHover={{ scale: 1.01 }}
    >
      <div className="flex items-start gap-3">
        {getDocumentIcon(document.type)}
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-foreground truncate">{document.name}</h3>
          {document.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{document.description}</p>
          )}
          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
            <span>{formatFileSize(document.size)}</span>
            <span>{formatDate(document.uploadedAt)}</span>
            <span className="capitalize">{document.type}</span>
          </div>
          {document.tags && document.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {document.tags.slice(0, 3).map((tag, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full"
                >
                  {tag}
                </span>
              ))}
              {document.tags.length > 3 && (
                <span className="text-xs text-muted-foreground">+{document.tags.length - 3} more</span>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleViewDocument(document);
            }}
            className="p-2 hover:bg-muted rounded-md transition-colors"
            title="View document"
          >
            <EyeIcon className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleEditDocument(document);
            }}
            className="p-2 hover:bg-muted rounded-md transition-colors"
            title="Edit document"
          >
            <PencilIcon className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteDocument(document.id);
            }}
            className="p-2 hover:bg-muted rounded-md transition-colors text-destructive"
            title="Delete document"
          >
            <TrashIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );



  return (
    <motion.div
      className="h-full flex flex-col"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <div className="p-6 border-b">
        <h1 className="text-3xl font-bold text-foreground mb-2">Document Library</h1>
        <p className="text-muted-foreground">
          Upload and manage your documents with Vercel Blob storage
        </p>
      </div>

      {/* Upload Area */}
      <div className="p-6 border-b">
        {renderUploadArea()}
      </div>

      {/* Controls */}
      <div className="p-6 border-b">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search documents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as DocumentType | 'all')}
            className="px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All Types</option>
            <option value="pdf">PDF</option>
            <option value="json">JSON</option>
            <option value="markdown">Markdown</option>
            <option value="text">Text</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="space-y-4">
          {filteredDocuments.map(document => renderDocumentCard(document))}
          {filteredDocuments.length === 0 && (
            <div className="text-center py-12">
              <DocumentIcon className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">No documents found</p>
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {isEditing && editingDocument && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background border border-border rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Edit Document</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Name
                </label>
                <input
                  type="text"
                  value={editingDocument.name}
                  onChange={(e) => setEditingDocument({...editingDocument, name: e.target.value})}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Description
                </label>
                <textarea
                  value={editingDocument.description || ''}
                  onChange={(e) => setEditingDocument({...editingDocument, description: e.target.value})}
                  rows={3}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Tags (comma separated)
                </label>
                <input
                  type="text"
                  value={editingDocument.tags?.join(', ') || ''}
                  onChange={(e) => setEditingDocument({
                    ...editingDocument, 
                    tags: e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag)
                  })}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={handleSaveEdit}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditingDocument(null);
                }}
                className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Viewer Modal */}
      {isViewing && viewingDocument && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background border border-border rounded-lg w-full max-w-4xl h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">{viewingDocument.name}</h3>
              <button
                onClick={handleCloseViewer}
                className="p-2 hover:bg-muted rounded-md transition-colors"
              >
                <XCircleIcon className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-hidden">
              {viewingDocument.type === 'pdf' ? (
                <div className="h-full flex flex-col">
                  <div className="flex-1">
                    <iframe
                      src={viewingDocument.url || 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'}
                      className="w-full h-full border-0"
                      title={`PDF viewer for ${viewingDocument.name}`}
                    />
                  </div>
                  <div className="p-2 bg-muted/30 text-xs text-muted-foreground border-t">
                    <p>
                      <strong>{viewingDocument.name}</strong> ({formatFileSize(viewingDocument.size)}) - 
                      Using sample PDF for demo. In production, this would load from Vercel Blob storage.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="h-full p-4 overflow-auto bg-background">
                  <div className="bg-card border border-border rounded-lg p-4 h-full">
                    <div className="flex items-center justify-between mb-4 pb-2 border-b border-border">
                      <span className="text-sm font-medium text-foreground">
                        {viewingDocument.type.toUpperCase()} Content
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatFileSize(viewingDocument.size)}
                      </span>
                    </div>
                    
                    {viewingDocument.type === 'json' ? (
                      <pre className="text-sm font-mono overflow-auto bg-slate-900 text-green-400 p-4 rounded border">
                        {documentContent}
                      </pre>
                    ) : (
                      <div className="text-sm whitespace-pre-wrap bg-white text-slate-900 p-4 rounded border border-slate-300">
                        {documentContent}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-4 border-t flex gap-2">
              <button
                onClick={() => handleDownloadDocument(viewingDocument)}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                <ArrowDownTrayIcon className="w-4 h-4" />
                Download
              </button>
              <button
                onClick={() => {
                  handleCloseViewer();
                  handleEditDocument(viewingDocument);
                }}
                className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
              >
                <PencilIcon className="w-4 h-4" />
                Edit Info
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default LibraryPage; 