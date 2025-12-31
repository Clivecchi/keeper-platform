# UI Components

## 📌 Purpose
Shared UI components used across the Keeper Platform web application. These components provide consistent styling, behavior, and user experience patterns.

## 🧱 Key Files
- `ApiKeyForm.tsx` - Shared form component for API key management
- `HelpTooltip.tsx` - Tooltip component for providing contextual help

## 🔄 Data & Behavior

### ApiKeyForm Component
- **Purpose**: Reusable form for adding/editing API keys across platform and user contexts
- **Props**:
  - `provider?`: Pre-selected provider for editing
  - `existingKey?`: Existing key value for editing
  - `isEditing?`: Whether in edit mode
  - `onSubmit`: Callback for form submission
  - `onCancel`: Callback for cancellation
  - `showLabel?`: Whether to show label field (for platform keys)
  - `existingLabel?`: Existing label value
  - `isSubmitting?`: Loading state

- **Features**:
  - Provider selection dropdown
  - API key validation by provider format
  - Show/hide key toggle
  - Label field for platform keys
  - Real-time validation feedback
  - Responsive design

### HelpTooltip Component
- **Purpose**: Provides contextual help information with consistent styling
- **Features**:
  - Hover/click activation
  - Consistent question mark icon
  - Positioned tooltips
  - Mobile-friendly

## ⚠️ Notes & ToDo
- [ ] Consider adding loading states to form components
- [ ] Add keyboard navigation support for tooltips
- [ ] Implement form validation error highlighting
- [ ] Add support for custom validation rules

## 📆 Update Log

### 2025-01-24
- Added `ApiKeyForm.tsx` component for API key management
- Implemented provider-specific validation
- Added show/hide toggle for API keys
- Integrated with existing `HelpTooltip` component
- Added support for both platform and user contexts 