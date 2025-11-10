/**
 * Action Upload Renderer
 * ======================
 * Renders a file upload that executes an engagement template
 */

import { useState, useRef } from 'react';
import { Button } from '@/features/board-studio/v0/components/ui/button';
import { Input } from '@/features/board-studio/v0/components/ui/input';
import { Label } from '@/features/board-studio/v0/components/ui/label';
import { generateRequestId } from '@/lib/uid/requestId';
import { EngagementTemplate, SubmitOptions } from '@/lib/engagement/types';

interface ActionUploadProps {
  prop: any;
  getTemplate: () => Promise<EngagementTemplate>;
  submit: (template: EngagementTemplate, payload: Record<string, any>, opts?: SubmitOptions) => Promise<any>;
  context: { boardId?: string; frameId?: string };
}

export function ActionUpload({ prop, getTemplate, submit, context }: ActionUploadProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const acceptedTypes = prop.config?.accept || 'image/*';
  const maxSizeMB = prop.config?.maxSizeMB || 5;
  const label = prop.config?.label || 'Upload File';

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    // Check file size
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > maxSizeMB) {
      setError(`File too large. Maximum size is ${maxSizeMB}MB`);
      return;
    }

    // Show preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setPreview(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
    }

    // Auto-upload if configured
    if (prop.config?.autoUpload) {
      await handleUpload(file);
    }
  }

  async function handleUpload(file?: File) {
    const actualFile = file || fileInputRef.current?.files?.[0];
    if (!actualFile) {
      setError('No file selected');
      return;
    }

    setPending(true);
    setError(null);

    try {
      const template = await getTemplate();
      
      // Convert file to base64
      const base64 = await fileToBase64(actualFile);
      
      const payload = {
        ...context,
        ...prop.config?.prefill,
        mime: actualFile.type,
        name: actualFile.name,
        bytesBase64: base64,
      };

      const result = await submit(template, payload, {
        requestId: generateRequestId(),
      });

      console.log('[ActionUpload] Success:', result);
      
      // Call optional onSuccess callback
      if (prop.config?.onSuccess) {
        prop.config.onSuccess(result, actualFile);
      }

      // Clear input if configured
      if (prop.config?.clearOnSuccess && fileInputRef.current) {
        fileInputRef.current.value = '';
        setPreview(null);
      }
    } catch (err: any) {
      setError(err.message || 'Upload failed');
      console.error('[ActionUpload] Error:', err);
      
      // Call optional onError callback
      if (prop.config?.onError) {
        prop.config.onError(err);
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={`upload-${prop.id}`}>{label}</Label>
        <Input
          id={`upload-${prop.id}`}
          ref={fileInputRef}
          type="file"
          accept={acceptedTypes}
          onChange={onFileChange}
          disabled={pending}
        />
        <p className="text-xs text-muted-foreground">
          Max size: {maxSizeMB}MB
        </p>
      </div>

      {preview && (
        <div className="rounded border p-2">
          <img
            src={preview}
            alt="Preview"
            className="max-w-full max-h-48 object-contain"
          />
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      {!prop.config?.autoUpload && (
        <Button
          onClick={() => handleUpload()}
          disabled={pending || !fileInputRef.current?.files?.[0]}
        >
          {pending ? 'Uploading...' : (prop.config?.uploadLabel || 'Upload')}
        </Button>
      )}
    </div>
  );
}

/**
 * Convert File to base64 string
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Extract base64 data (remove data:image/png;base64, prefix)
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

