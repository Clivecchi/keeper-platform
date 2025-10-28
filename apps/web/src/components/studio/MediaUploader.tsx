/**
 * Media Uploader Component - Vercel Blob Integration
 * Drag-drop + file picker with actual file uploads to Vercel Blob
 */

import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PhotoIcon,
  VideoCameraIcon,
  CloudArrowUpIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { apiFetch } from '../../lib/api';

// =============================================================================
// TYPES
// =============================================================================

interface MediaData {
  type: 'image' | 'video';
  url: string;
  width?: number;
  height?: number;
  posterUrl?: string;
  key?: string;
}

interface MediaUploaderProps {
  value?: MediaData | null;
  onChange: (media: MediaData | null) => void;
  disabled?: boolean;
}

interface UploadState {
  status: 'idle' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
}

// =============================================================================
// UTILITIES
// =============================================================================

const ACCEPTED_TYPES = {
  'image/png': '.png',
  'image/jpg': '.jpg', 
  'image/jpeg': '.jpeg',
  'image/webp': '.webp',
  'video/mp4': '.mp4'
};

const MAX_SIZE = 25 * 1024 * 1024; // 25MB

function getFileType(file: File): 'image' | 'video' {
  return file.type.startsWith('image/') ? 'image' : 'video';
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function validateFile(file: File): string | null {
  if (!Object.keys(ACCEPTED_TYPES).includes(file.type)) {
    return `File type ${file.type} not supported. Please use PNG, JPG, WEBP, or MP4.`;
  }
  
  if (file.size > MAX_SIZE) {
    return `File size ${formatFileSize(file.size)} exceeds maximum of ${formatFileSize(MAX_SIZE)}.`;
  }
  
  return null;
}

// =============================================================================
// COMPONENT
// =============================================================================

const MediaUploader: React.FC<MediaUploaderProps> = ({ value, onChange, disabled }) => {
  const [uploadState, setUploadState] = useState<UploadState>({ status: 'idle', progress: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = useCallback(async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setUploadState({ status: 'error', progress: 0, error: validationError });
      return;
    }

    setUploadState({ status: 'uploading', progress: 0 });

    try {
      // Step 1: Get signed upload URL
      const signResponse = await apiFetch('/api/uploads/sign', {
        method: 'POST',
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
          size: file.size
        })
      });

      if (!signResponse.success) {
        throw new Error(signResponse.error || 'Failed to get upload URL');
      }

      const { url, fields, key } = signResponse.data;
      setUploadState(prev => ({ ...prev, progress: 25 }));

      // Step 2: Convert file to base64
      const fileBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // Remove data:image/png;base64, prefix
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      setUploadState(prev => ({ ...prev, progress: 50 }));

      // Step 3: Upload to Vercel Blob via our API
      const uploadResponse = await apiFetch(url, {
        method: 'POST',
        body: JSON.stringify({
          ...fields,
          file: fileBase64,
          size: file.size
        })
      });

      if (!uploadResponse.success) {
        throw new Error(uploadResponse.error || 'Upload failed');
      }

      setUploadState(prev => ({ ...prev, progress: 75 }));

      // Step 4: Create media data object with Vercel Blob URL
      const mediaData: MediaData = {
        type: getFileType(file),
        url: uploadResponse.data.url,
        key: uploadResponse.data.key
      };

      // For images, try to get dimensions
      if (mediaData.type === 'image') {
        try {
          const img = new Image();
          img.onload = () => {
            mediaData.width = img.width;
            mediaData.height = img.height;
            onChange(mediaData);
          };
          img.src = mediaData.url;
        } catch {
          // If we can't load dimensions, just proceed without them
          onChange(mediaData);
        }
      } else {
        onChange(mediaData);
      }

      setUploadState({ status: 'success', progress: 100 });
      setTimeout(() => setUploadState({ status: 'idle', progress: 0 }), 2000);
    } catch (error) {
      console.error('Upload error:', error);
      setUploadState({ 
        status: 'error', 
        progress: 0, 
        error: error instanceof Error ? error.message : 'Upload failed' 
      });
    }
  }, [onChange]);

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    handleUpload(files[0]);
  }, [handleUpload]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect, disabled]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleRemove = useCallback(async () => {
    if (!value?.key) {
      onChange(null);
      return;
    }

    try {
      await apiFetch(`/api/uploads/${value.key}`, { method: 'DELETE' });
    } catch (error) {
      console.warn('Failed to delete upload:', error);
    }
    
    onChange(null);
  }, [value, onChange]);

  const handleReplace = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // If we have a value, show the media preview with controls
  if (value) {
    return (
      <div className="space-y-4">
        <div className="relative bg-gray-50 rounded-lg overflow-hidden">
          {value.type === 'video' ? (
            <video
              src={value.url}
              className="w-full h-32 object-cover"
              controls={false}
              muted
            />
          ) : (
            <img
              src={value.url}
              alt="Uploaded media"
              className="w-full h-32 object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          )}
          
          <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center opacity-0 hover:opacity-100">
            <div className="flex space-x-2">
              <button
                onClick={handleReplace}
                disabled={disabled}
                className="px-3 py-1 bg-white text-gray-900 rounded text-sm font-medium hover:bg-gray-100 disabled:opacity-50"
              >
                Replace
              </button>
              <button
                onClick={handleRemove}
                disabled={disabled}
                className="px-3 py-1 bg-red-600 text-white rounded text-sm font-medium hover:bg-red-700 disabled:opacity-50"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
        
        <div className="text-sm text-gray-600 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {value.type === 'video' ? (
              <VideoCameraIcon className="w-4 h-4" />
            ) : (
              <PhotoIcon className="w-4 h-4" />
            )}
            <span>{value.type === 'video' ? 'Video' : 'Image'} uploaded</span>
          </div>
          {value.width && value.height && (
            <span className="text-gray-500">{value.width} × {value.height}</span>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept={Object.keys(ACCEPTED_TYPES).join(',')}
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
          disabled={disabled}
        />
      </div>
    );
  }

  // Upload area
  return (
    <div className="space-y-4">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !disabled && fileInputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all duration-200
          ${isDragging 
            ? 'border-blue-400 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}
        `}
      >
        <AnimatePresence>
          {uploadState.status === 'uploading' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center"
            >
              <div className="text-center">
                <ArrowPathIcon className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-900">Uploading...</p>
                <div className="w-32 bg-gray-200 rounded-full h-2 mt-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadState.progress}%` }}
                  />
                </div>
                <p className="text-xs text-gray-600 mt-1">{uploadState.progress}%</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-3">
          <div className="flex justify-center">
            <CloudArrowUpIcon className="w-12 h-12 text-gray-400" />
          </div>
          
          <div>
            <p className="text-base font-medium text-gray-900">
              Drop your media here, or <span className="text-blue-600">browse</span>
            </p>
            <p className="text-sm text-gray-600 mt-1">
              PNG, JPG, WEBP, MP4 up to {formatFileSize(MAX_SIZE)}
            </p>
          </div>
        </div>
      </div>

      {uploadState.status === 'error' && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-lg"
        >
          <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm">{uploadState.error}</p>
        </motion.div>
      )}

      {uploadState.status === 'success' && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center space-x-2 text-green-600 bg-green-50 p-3 rounded-lg"
        >
          <CheckCircleIcon className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm">Upload successful!</p>
        </motion.div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={Object.keys(ACCEPTED_TYPES).join(',')}
        onChange={(e) => handleFileSelect(e.target.files)}
        className="hidden"
        disabled={disabled}
      />
    </div>
  );
};

export default MediaUploader;
