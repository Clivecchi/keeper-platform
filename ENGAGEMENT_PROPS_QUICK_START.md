# Engagement Props - Quick Start Guide

## 🚀 5-Minute Setup

### Step 1: Add a Prop to a Frame

Edit your frame's props array (or add via Board Studio):

```json
{
  "id": "my-action-prop",
  "type": "action.button",
  "config": {
    "label": "Run Action",
    "templateKey": "domain.board.publish"
  }
}
```

### Step 2: View the Frame

Navigate to the frame - the prop will automatically render at the bottom.

### Step 3: Interact

Click the button/toggle/form → Action executes → Check console for result!

---

## 📚 Prop Types Reference

### action.button

Simple button that executes a template.

```json
{
  "id": "my-button",
  "type": "action.button",
  "config": {
    "label": "Click Me",
    "templateKey": "domain.board.publish",
    "prefill": { "isPublic": true },
    "variant": "default",
    "size": "default"
  }
}
```

**Config Options:**
- `label` - Button text
- `templateKey` - Template slug (required)
- `prefill` - Pre-fill payload data
- `variant` - Button style: default | outline | ghost | destructive
- `size` - Button size: default | sm | lg | icon
- `onSuccess` - Callback function
- `onError` - Callback function

---

### action.toggle

Switch/toggle that executes on change.

```json
{
  "id": "my-toggle",
  "type": "action.toggle",
  "config": {
    "label": "Enable Feature",
    "templateKey": "domain.board.publish",
    "valueField": "isPublic",
    "initial": false,
    "prefill": {}
  }
}
```

**Config Options:**
- `label` - Toggle label
- `templateKey` - Template slug (required)
- `valueField` - Field name for boolean value (default: "value")
- `initial` - Initial state (default: false)
- `prefill` - Additional payload data
- `onSuccess` - Callback function
- `onError` - Callback function

---

### action.form

Dynamic form generated from template fields.

```json
{
  "id": "my-form",
  "type": "action.form",
  "config": {
    "label": "Submit Form",
    "templateKey": "domain.public.contact",
    "prefill": { "subject": "Inquiry" },
    "submitLabel": "Send",
    "cancelLabel": "Cancel",
    "resetOnSuccess": true
  }
}
```

**Config Options:**
- `label` - Form title
- `templateKey` - Template slug (required)
- `prefill` - Pre-fill form fields
- `submitLabel` - Submit button text (default: "Submit")
- `cancelLabel` - Cancel button text (optional)
- `resetOnSuccess` - Clear form after success (default: false)
- `onSuccess` - Callback function
- `onError` - Callback function
- `onCancel` - Callback function

---

### action.upload

File upload with base64 conversion.

```json
{
  "id": "my-upload",
  "type": "action.upload",
  "config": {
    "label": "Upload File",
    "templateKey": "domain.board.setCover",
    "accept": "image/*",
    "maxSizeMB": 5,
    "autoUpload": false,
    "uploadLabel": "Upload",
    "clearOnSuccess": true
  }
}
```

**Config Options:**
- `label` - Upload label
- `templateKey` - Template slug (required)
- `accept` - File types (default: "image/*")
- `maxSizeMB` - Max file size (default: 5)
- `autoUpload` - Auto-upload on select (default: false)
- `uploadLabel` - Upload button text (default: "Upload")
- `clearOnSuccess` - Clear input after success (default: true)
- `prefill` - Additional payload data
- `onSuccess` - Callback function (receives result + file)
- `onError` - Callback function

---

## 🔒 Visibility Rules

Control who sees props:

```json
{
  "visibility": {
    "roles": ["admin", "editor"],
    "viewerModes": ["editor", "member"]
  }
}
```

**Rules:**
- If `roles` specified: User must have ONE of the roles
- If `viewerModes` specified: ViewerMode must match ONE
- Both can be combined (AND logic)
- Omit for "always visible"

---

## 🎯 Available Templates

### Domain Board Management

- `domain.board.setViewerMode` - Set viewer access mode
- `domain.board.addFrame` - Add frame to board
- `domain.board.updateFrame` - Update frame properties
- `domain.board.setCover` - Upload cover image
- `domain.board.upsertPathwayNav` - Manage navigation
- `domain.board.publish` - Publish/unpublish board

### Domain Admin

- `domain.admin.update` - Update domain info
- `domain.admin.verify` - Verify custom domain
- `domain.admin.addCustomDomain` - Add custom domain
- `domain.admin.editApiKey` - Edit API keys
- `domain.admin.assignAgent` - Assign primary agent

### Public

- `domain.public.contact` - Contact form

---

## 💡 Pro Tips

### 1. Context Auto-Injection

Props automatically receive:
- `boardId` from frame
- `frameId` from frame

No need to specify in config!

### 2. Prefill Data

Use `prefill` to provide default values:

```json
{
  "config": {
    "prefill": {
      "pattern": "dialogic",
      "visibility": "admin"
    }
  }
}
```

### 3. Callbacks

Handle success/error in your frame:

```typescript
const prop = {
  config: {
    onSuccess: (result) => {
      console.log('Success!', result);
      // Refresh frame, show toast, etc.
    },
    onError: (error) => {
      console.error('Failed!', error);
      // Show error message
    }
  }
};
```

### 4. Dry Run Testing

All templates support `dryRun` mode. The adapter doesn't expose this in UI yet, but it's available in the API!

---

## 🧪 Testing

### Browser Console Test

```javascript
// Open your browser console on a page with action props
// The props should log their actions

// Manual template fetch test:
fetch('/api/engagement/templates/domain.board.publish', {
  credentials: 'include'
})
  .then(r => r.json())
  .then(console.log);
```

### Verify Prop Renders

1. Add prop to frame
2. Check frame has `props` array with your prop
3. Verify prop `type` starts with `action.`
4. Check `templateKey` is valid
5. Verify visibility rules (roles, viewerMode)

### Verify Submit Works

1. Click/toggle/submit prop
2. Open Network tab
3. Find POST/PATCH request to API
4. Check request includes `requestId`
5. Verify response (should be 200 OK)
6. Check console for success log

---

## 🚨 Troubleshooting

### Prop Doesn't Render

**Check:**
- ✅ Prop has `type: "action.*"`
- ✅ Prop has `config.templateKey`
- ✅ User has required role (visibility rules)
- ✅ ViewerMode matches (visibility rules)
- ✅ Frame props is an array

### Submit Fails

**Check:**
- ✅ Template exists (fetch `/api/engagement/templates/:key`)
- ✅ User is authenticated
- ✅ boardId/frameId are valid UUIDs
- ✅ Required fields are filled (for forms)
- ✅ Network tab shows request details

### Template Not Found

**Check:**
- ✅ Template seeded in database
- ✅ Slug matches exactly (case-sensitive)
- ✅ API endpoint responding

### No Roles/ViewerMode

**Issue:** `useViewerContext` returns empty roles

**Fix:** Ensure user is authenticated. For MVP, authenticated users get `member` role automatically. Enhance later with actual permission checks.

---

## 📖 Examples Collection

### Example: Simple Publish Toggle

```json
{
  "id": "publish",
  "type": "action.toggle",
  "config": {
    "label": "Public",
    "templateKey": "domain.board.publish",
    "valueField": "isPublic",
    "initial": false
  },
  "visibility": { "roles": ["admin"] }
}
```

### Example: Contact Form

```json
{
  "id": "contact",
  "type": "action.form",
  "config": {
    "label": "Contact Us",
    "templateKey": "domain.public.contact",
    "submitLabel": "Send Message"
  }
}
```

### Example: Add Frame Button

```json
{
  "id": "add-frame",
  "type": "action.button",
  "config": {
    "label": "+ Add Frame",
    "templateKey": "domain.board.addFrame",
    "prefill": {
      "pattern": "dialogic",
      "name": "New Frame"
    }
  },
  "visibility": { "roles": ["admin", "editor"] }
}
```

### Example: Upload Cover

```json
{
  "id": "cover-upload",
  "type": "action.upload",
  "config": {
    "label": "Board Cover",
    "templateKey": "domain.board.setCover",
    "accept": "image/png,image/jpeg",
    "maxSizeMB": 10,
    "autoUpload": true
  },
  "visibility": { "roles": ["admin"] }
}
```

---

**Ready to build!** 🚀  
Start with a simple button prop and expand from there.

For full documentation, see:
- [Implementation Guide](./ENGAGEMENT_TEMPLATE_ADAPTER_IMPLEMENTATION.md)
- [Domain Board Management](./DOMAIN_BOARD_MANAGEMENT_IMPLEMENTATION.md)

