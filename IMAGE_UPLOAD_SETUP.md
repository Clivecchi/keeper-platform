# Image Upload with Vercel Blob Storage

## Overview

The Keeper Platform now supports direct image and video uploads to Vercel Blob Storage. This feature is used throughout the platform, particularly in Board Studio for cover images and media assets.

## Features

- ✅ Drag-and-drop file upload
- ✅ File type validation (PNG, JPG, WEBP, MP4)
- ✅ File size validation (up to 25MB)
- ✅ Progress tracking
- ✅ Image preview with dimensions
- ✅ Replace/remove uploaded media
- ✅ Secure user-scoped storage paths
- ✅ Public CDN URLs via Vercel Blob

## Setup Instructions

### 1. Create a Vercel Blob Store

1. Go to [Vercel Dashboard → Storage](https://vercel.com/dashboard/stores)
2. Click "Create Database" or "Create Store"
3. Select **Blob** as the store type
4. Choose a name for your store (e.g., "keeper-media")
5. Select your preferred region
6. Click "Create"

### 2. Get Your Blob Token

After creating the store:

1. Go to your store's settings
2. Copy the **Read/Write Token**
3. Add it to your environment variables

### 3. Configure Environment Variables

Add the following to your `.env` file:

```bash
# Vercel Blob Storage token for media uploads
# Generate at: https://vercel.com/dashboard/stores
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_XXXXXXXXXXXXXXXXX"
```

**Important Notes:**
- Never commit this token to Git
- Use different tokens for development and production
- The token has read/write permissions, so keep it secure
- Store tokens in your deployment platform's environment variables

### 4. Deploy Environment Variable

#### Vercel Deployment
1. Go to your project settings on Vercel
2. Navigate to **Environment Variables**
3. Add `BLOB_READ_WRITE_TOKEN` with your token
4. Select the appropriate environments (Production, Preview, Development)
5. Save and redeploy

#### Railway Deployment
1. Go to your project on Railway
2. Navigate to **Variables**
3. Add `BLOB_READ_WRITE_TOKEN` with your token
4. The service will automatically restart

#### Local Development
Add the token to your local `.env` file:
```bash
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_XXXXXXXXXXXXXXXXX"
```

## Usage

### In Board Studio

The image uploader is automatically available in the Cover frame:

1. Open Board Studio
2. Select the Cover frame
3. Click the media upload area or drag-drop an image/video
4. The file uploads to Vercel Blob and displays immediately

### Programmatic Usage

```typescript
import { apiFetch } from '@/lib/api';

// Step 1: Request signed upload
const signResponse = await apiFetch('/api/uploads/sign', {
  method: 'POST',
  body: JSON.stringify({
    filename: 'example.png',
    contentType: 'image/png',
    size: 1024000 // bytes
  })
});

// Step 2: Convert file to base64
const fileBase64 = await fileToBase64(file);

// Step 3: Upload to Vercel Blob
const uploadResponse = await apiFetch(signResponse.data.url, {
  method: 'POST',
  body: JSON.stringify({
    ...signResponse.data.fields,
    file: fileBase64
  })
});

// Step 4: Use the public URL
const publicUrl = uploadResponse.data.url;
```

## API Endpoints

### POST /api/uploads/sign

Prepares upload metadata and returns the upload endpoint.

**Request:**
```json
{
  "filename": "photo.jpg",
  "contentType": "image/jpeg",
  "size": 1048576
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "url": "http://localhost:3001/api/uploads/direct",
    "method": "POST",
    "fields": {
      "key": "uploads/{userId}/{timestamp}-{random}.jpg",
      "Content-Type": "image/jpeg",
      "x-user-id": "user-123",
      "x-filename": "photo.jpg"
    },
    "key": "uploads/{userId}/{timestamp}-{random}.jpg",
    "expiresAt": "2025-10-28T12:00:00Z"
  }
}
```

### POST /api/uploads/direct

Uploads file to Vercel Blob storage.

**Request:**
```json
{
  "key": "uploads/{userId}/{timestamp}-{random}.jpg",
  "file": "base64-encoded-file-data",
  "contentType": "image/jpeg",
  "size": 1048576
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "url": "https://xxxxxx.public.blob.vercel-storage.com/uploads/...",
    "key": "uploads/{userId}/{timestamp}-{random}.jpg",
    "size": 1048576,
    "contentType": "image/jpeg"
  }
}
```

### DELETE /api/uploads/:key

Deletes a file from Vercel Blob storage.

**Response:**
```json
{
  "success": true,
  "data": {
    "key": "uploads/{userId}/{timestamp}-{random}.jpg",
    "deleted": true
  }
}
```

## File Organization

Uploaded files are organized by user ID:

```
uploads/
  └── {userId}/
      ├── 1730123456789-abc123.jpg
      ├── 1730123456790-def456.png
      └── 1730123456791-ghi789.mp4
```

**Security:**
- Each user can only upload to their own folder
- Each user can only delete their own files
- File keys are validated server-side
- Public read access for displaying content

## Supported File Types

- **Images:** PNG, JPG, JPEG, WEBP
- **Videos:** MP4

Maximum file size: **25MB**

## Error Handling

The system handles various error scenarios:

### Missing Token
```json
{
  "success": false,
  "error": "Storage not configured. Please set BLOB_READ_WRITE_TOKEN environment variable."
}
```

### File Too Large
```json
{
  "success": false,
  "error": "File size 30MB exceeds maximum of 25MB."
}
```

### Invalid File Type
```json
{
  "success": false,
  "error": "File type image/gif not supported. Please use PNG, JPG, WEBP, or MP4."
}
```

### Unauthorized Upload
```json
{
  "success": false,
  "error": "Access denied"
}
```

## Component: MediaUploader

Location: `apps/web/src/components/studio/MediaUploader.tsx`

**Props:**
```typescript
interface MediaUploaderProps {
  value?: MediaData | null;
  onChange: (media: MediaData | null) => void;
  disabled?: boolean;
}

interface MediaData {
  type: 'image' | 'video';
  url: string;
  width?: number;
  height?: number;
  posterUrl?: string;
  key?: string;
}
```

**Example:**
```tsx
import MediaUploader from '@/components/studio/MediaUploader';

function MyCoverFrame() {
  const [media, setMedia] = useState<MediaData | null>(null);

  return (
    <MediaUploader
      value={media}
      onChange={setMedia}
    />
  );
}
```

## Troubleshooting

### Uploads fail with "Storage not configured"
- Verify `BLOB_READ_WRITE_TOKEN` is set in your environment
- Check the token is valid and has read/write permissions
- Restart your server after adding the environment variable

### Uploads succeed but return placeholder URLs
- You're using the old implementation
- Make sure you've pulled the latest code with Vercel Blob integration
- Check that `@vercel/blob` package is installed in `apps/api`

### Files upload but can't be deleted
- Verify the token has write permissions (not just read)
- Check the file key format matches `uploads/{userId}/*`
- Ensure you're authenticated as the user who uploaded the file

### CORS errors when displaying images
- Vercel Blob URLs are automatically CORS-enabled
- If you see CORS errors, check you're using the public URL from the response
- Verify the blob is set to `public` access (default behavior)

## Production Checklist

- [ ] `BLOB_READ_WRITE_TOKEN` added to production environment
- [ ] Token is different from development token
- [ ] Token is stored securely (not in Git)
- [ ] Tested upload flow in production
- [ ] Tested delete flow in production
- [ ] Verified public URLs are accessible
- [ ] Checked image dimensions are captured correctly
- [ ] Confirmed video uploads work (if needed)

## Future Enhancements

Potential improvements for the upload system:

- [ ] Image optimization/resizing on upload
- [ ] Automatic thumbnail generation
- [ ] Multi-file upload support
- [ ] Upload queue for large files
- [ ] Client-side image cropping/editing
- [ ] Progress callbacks for large uploads
- [ ] Upload retry logic
- [ ] Bandwidth usage tracking
- [ ] Storage quota management
- [ ] CDN caching headers

