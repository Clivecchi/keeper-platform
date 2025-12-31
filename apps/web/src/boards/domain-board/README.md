# Domain Board

## 📌 Purpose
This board provides a comprehensive interface for domain management and setup using the wizard engagement mode. It guides users through domain configuration with specialized frames for different aspects of domain management.

## 🧱 Key Files
- `domain-board.tsx` - Main DomainBoard component
- `README.md` - This documentation file

## 🔄 Data & Behavior

### Board Configuration
- **Type**: `domain_board`
- **Layout**: `wizard` - Step-by-step progression through domain setup
- **Engagement Mode**: `wizard` - Guided workflow for domain configuration
- **Theme**: Green color scheme (primary: #059669, accent: #047857)

### Frame Structure
The DomainBoard consists of 4 specialized frames rendered in wizard sequence:

| Frame ID | Frame Type | Component | Purpose |
|----------|------------|-----------|---------|
| `domain-card` | `preview` | `DomainCardFrame` | Domain overview with status and branding |
| `setup-steps` | `process_frame` | `SetupStepsFrame` | Step-by-step setup progress tracking |
| `member-list` | `config_panel` | `MemberListFrame` | Team member and permission management |
| `custom-domain` | `config_panel` | `CustomDomainFrame` | DNS configuration and SSL setup |

### Specialized Frame Components

#### DomainCardFrame
- **Purpose**: Shows domain overview, status, and basic metrics
- **Features**: 
  - Domain logo and branding display
  - Status indicators (active, pending, error)
  - Member count and activity tracking
  - Setup progress visualization
  - Custom domain redirect display

#### SetupStepsFrame
- **Purpose**: Tracks and guides through domain setup process
- **Features**:
  - 4-step setup workflow with progress tracking
  - Interactive step actions with status indicators
  - Estimated completion times
  - Visual progress bar and step navigation

#### MemberListFrame
- **Purpose**: Manages team members and permissions
- **Features**:
  - Member invitation with role assignment
  - Role-based permission system (owner, admin, member, viewer)
  - Member status tracking (active, invited, inactive)
  - Permission overview and role management

#### CustomDomainFrame
- **Purpose**: Configures custom domain settings and DNS
- **Features**:
  - Custom domain input and validation
  - DNS record configuration with copy-to-clipboard
  - SSL certificate management
  - Domain verification workflow
  - Security settings (HTTPS redirect, HSTS)

## 🎨 Styling & Theming
- **Primary Color**: Green (#059669) - represents growth and domains
- **Background**: Light green (#F0FDF4) for subtle brand alignment
- **Border Colors**: Green variants for consistency
- **Status Colors**: Standard semantic colors (green, yellow, red)

## 🚀 Usage Examples

### Basic Usage
```tsx
import { DomainBoard } from '@/boards/domain-board';

<DomainBoard
  domainId="my-domain"
  onDomainUpdate={handleUpdate}
  showControls={true}
/>
```

### With Search Parameters
```tsx
// URL: /studio/domain-board?domainId=example-domain
// Component automatically picks up domainId from URL
<DomainBoard />
```

### Custom Configuration
```tsx
<DomainBoard
  domainId="custom-domain"
  onDomainUpdate={(domainId, updates) => {
    console.log('Domain updated:', domainId, updates);
    // Handle API call to save changes
  }}
  showControls={false}
  className="custom-styling"
/>
```

## 🔧 Integration Points

### Frame System Integration
- Uses `BoardRenderer` with wizard layout
- Leverages `FrameRenderer` with domain-specific frame overrides
- Integrates with `BoardContext` and `FrameContext` for state management

### Mock Data Support
- Domain information with status and metrics
- Member list with roles and permissions
- DNS records with verification status
- Setup progress tracking

### API Integration Points
Domain operations that will connect to backend APIs:
- `domain_update` - Save domain configuration changes
- `member_invite` - Send team member invitations
- `member_remove` - Remove team members
- `domain_verify` - Verify custom domain ownership
- `custom_domain_save` - Save DNS and SSL configuration

## 🔄 Wizard Flow
The board guides users through a 4-step wizard:

1. **Domain Overview** - Review domain status and basic information
2. **Setup Progress** - Complete required configuration steps
3. **Team Management** - Invite and manage team members
4. **Custom Domain** - Configure DNS and SSL settings

Each step can be accessed independently, but the wizard mode encourages linear progression.

## ⚙️ Configuration Options

### Environment Variables
- Domain validation endpoints
- DNS verification services
- SSL certificate providers

### Theme Customization
```tsx
const customTheme = {
  primaryColor: '#059669',
  backgroundColor: '#F0FDF4',
  accentColor: '#047857',
  borderColor: '#BBF7D0',
};
```

## 📊 Analytics & Tracking
The board tracks user interactions for analytics:
- Step completion rates
- Time spent on each frame
- Member invitation success rates
- Domain verification attempts
- Custom domain configuration completion

## 🔐 Security Considerations
- Domain ownership verification required
- Role-based access control for member management
- SSL certificate validation
- DNS record security checks

## ⚠️ Notes & ToDo
- [ ] Connect to actual domain management APIs
- [ ] Implement real DNS verification
- [ ] Add SSL certificate provisioning
- [ ] Create domain template system
- [ ] Add bulk member import functionality
- [ ] Implement domain analytics dashboard
- [ ] Add domain transfer capabilities

## 📆 Update Log
- 2025-01-XX: Created DomainBoard with wizard engagement mode
- Implemented 4 specialized frame components for domain management
- Added mock data support for development and testing
- Integrated with existing Frame and Board system architecture
