# Admin Pages

## 📌 Purpose
System administration pages for platform-level management, separate from domain-level management.

## 🧱 Key Files
- `DomainsPage.tsx` - Platform domain management
- `RolesPage.tsx` - Platform role management  
- `UserManagementPage.tsx` - Platform user management

## 🔄 Data & Behavior

### DomainsPage
- Lists all domains across the platform
- Shows domain owners, status, and basic stats
- Platform-level domain administration

### RolesPage  
- Manages platform-level roles (Super Admin, Admin, etc.)
- Assigns/removes roles from users
- Tracks permission implementation status

### UserManagementPage
- Lists all platform users
- Shows user roles and join dates
- Platform-level user administration
- **Separate from domain-level user management**

## ⚠️ Notes & ToDo
- [ ] Add user detail views
- [ ] Implement user search/filtering
- [ ] Add bulk user operations
- [ ] Integrate with domain user management
- [ ] Add user activity tracking

## 🔗 Navigation Structure

### Platform Admin (System Admin)
- **User Management** - Platform users and roles
- **Domain Management** - Platform domain oversight  
- **Role Management** - Platform role assignment

### Domain Admin (Root Dashboard)
- **Domain Settings** - Personal domain configuration
- **Domain Users** - Domain-level user management
- **Domain Permissions** - Domain-level permissions

## 📆 Update Log

### 2025-01-21
- Added UserManagementPage for platform user administration
- Clarified separation between platform and domain user management
- Updated navigation structure documentation 