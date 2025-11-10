/**
 * Viewer Context Hook
 * ===================
 * Provides viewer role and viewerMode for visibility checks
 */

import { useContext, useMemo } from 'react';
import { AuthContext } from '../context/AuthContext';
import { ViewerMode } from '../lib/engagement/types';

interface ViewerContext {
  roles: string[];
  viewerMode: ViewerMode;
  isAuthenticated: boolean;
  userId: string | null;
}

/**
 * Hook to get current viewer context (roles, viewerMode)
 * Used by ActionPropRenderer to enforce visibility rules
 */
export function useViewerContext(): ViewerContext {
  const authContext = useContext(AuthContext);

  return useMemo(() => {
    const isAuthenticated = !!authContext?.isAuthenticated;
    const userId = authContext?.user?.id || null;

    // Determine roles from auth context
    // TODO: Fetch actual roles from user permissions/domain permissions
    // For now, we'll derive basic roles from authentication state
    const roles: string[] = [];
    
    if (isAuthenticated) {
      roles.push('member');
      
      // TODO: Check domain permissions to determine if user is admin/editor
      // This would require domain context and permission checking
      // For MVP, we'll mark authenticated users as having member role
      // and you can enhance this later with actual permission checks
      
      // Example enhancement:
      // if (userHasDomainPermission(domainId, userId, 'admin')) roles.push('admin');
      // if (userHasDomainPermission(domainId, userId, 'editor')) roles.push('editor');
    } else {
      roles.push('public');
    }

    // Determine viewer mode
    // For MVP, authenticated users are 'member', unauthenticated are 'public'
    // Later, this should come from board config or domain settings
    const viewerMode: ViewerMode = isAuthenticated ? 'member' : 'public';

    return {
      roles,
      viewerMode,
      isAuthenticated,
      userId,
    };
  }, [authContext]);
}

/**
 * Check if viewer passes visibility rules
 * Used internally by ActionPropRenderer
 */
export function passesVisibility(
  visibility: { roles?: string[]; viewerModes?: ViewerMode[] } | undefined,
  roles: string[],
  viewerMode: ViewerMode
): boolean {
  if (!visibility) return true;

  // Check role requirements
  if (visibility.roles && visibility.roles.length > 0) {
    const hasRequiredRole = visibility.roles.some((requiredRole) => 
      roles.includes(requiredRole)
    );
    if (!hasRequiredRole) return false;
  }

  // Check viewerMode requirements
  if (visibility.viewerModes && visibility.viewerModes.length > 0) {
    if (!visibility.viewerModes.includes(viewerMode)) return false;
  }

  return true;
}

