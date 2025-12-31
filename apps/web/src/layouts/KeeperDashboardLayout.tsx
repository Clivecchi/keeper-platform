/**
 * KeeperDashboardLayout
 * =====================
 * 
 * V0-aligned dashboard layout for logged-in Keeper experience.
 * This layout provides the canonical design language from V0 screenshots:
 * - Left navigation sidebar with Feed, Kip, Keepers, Journeys, Profile
 * - Terracotta color scheme (#C96E59)
 * - Soft cream background
 * - Rounded cards with soft shadows
 * - Large typography with comfortable spacing
 * 
 * Used for:
 * - /d/:domainSlug (when authenticated)
 * - /d/:domainSlug/admin
 * - /d/:domainSlug/agent
 */

import React from 'react';
import { NavLink, useLocation, useParams, Link } from 'react-router-dom';
import { 
  HomeIcon,
  SparklesIcon,
  BuildingOfficeIcon,
  MapIcon,
  UserIcon,
  PlusIcon,
  ChevronDownIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import { UserIdentityDropdown } from '../components/layout/UserIdentityDropdown';

interface KeeperDashboardLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

interface NavItem {
  label: string;
  icon: React.ReactNode;
  path: string;
  isActive?: boolean;
}

export const KeeperDashboardLayout: React.FC<KeeperDashboardLayoutProps> = ({
  children,
  title,
  subtitle
}) => {
  const { slug } = useParams<{ slug: string }>();
  const location = useLocation();
  
  // Navigation items matching V0 design
  const navItems: NavItem[] = [
    {
      label: 'Feed',
      icon: <HomeIcon className="w-5 h-5" />,
      path: slug ? `/d/${slug}/feed` : '/root'
    },
    {
      label: 'Kip',
      icon: <SparklesIcon className="w-5 h-5" />,
      path: slug ? `/d/${slug}/agent` : '/kip'
    },
    {
      label: 'Keepers',
      icon: <BuildingOfficeIcon className="w-5 h-5" />,
      path: slug ? `/d/${slug}/keepers` : '/keeper'
    },
    {
      label: 'Journeys',
      icon: <MapIcon className="w-5 h-5" />,
      path: slug ? `/d/${slug}/journeys` : '/keeper'
    },
    {
      label: 'Profile',
      icon: <UserIcon className="w-5 h-5" />,
      path: slug ? `/d/${slug}/profile` : '/root/profile'
    }
  ];

  // Determine active nav item based on current path
  const getActiveNavLabel = (): string | null => {
    const path = location.pathname;
    
    // Check each nav item to see if current path matches
    for (const item of navItems) {
      if (path === item.path || (item.path !== '/' && path.startsWith(item.path + '/'))) {
        return item.label.toLowerCase();
      }
    }
    
    // Special cases
    if (path.includes('/admin')) return null; // Admin pages don't highlight nav
    if (path.includes('/agent')) return 'kip'; // Agent workspace uses Kip nav
    if (path.includes('/feed')) return 'feed'; // Feed page
    if (path.includes('/keepers')) return 'keepers'; // Keepers page
    if (path.includes('/journeys')) return 'journeys'; // Journeys page
    if (path.includes('/profile')) return 'profile'; // Profile page
    
    return null;
  };

  const activeNavLabel = getActiveNavLabel();

  return (
    <div className="flex h-screen bg-[#FAF9F6]">
      {/* Left Navigation Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        {/* Logo - Clickable */}
        <div className="px-6 py-8">
          <Link 
            to="/root" 
            className="text-2xl font-bold text-gray-900 hover:text-[#C96E59] transition-colors cursor-pointer inline-block"
          >
            Keeper
          </Link>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-4 space-y-1">
          {navItems.map((item) => {
            const isActive = activeNavLabel === item.label.toLowerCase();
            return (
              <NavLink
                key={item.label}
                to={item.path}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors
                  ${isActive 
                    ? 'bg-[#C96E59] text-white' 
                    : 'text-gray-700 hover:bg-gray-50'
                  }
                `}
              >
                {item.icon}
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Create Button - Fixed at bottom */}
        <div className="p-4 border-t border-gray-200">
          <button className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#C96E59] text-white rounded-lg font-medium hover:bg-[#B85D4A] transition-colors">
            <PlusIcon className="w-5 h-5" />
            <span>Create</span>
            <ChevronDownIcon className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Right Content Pane */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-8 py-12">
          {/* Page Header */}
          <div className="mb-8">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-4xl font-bold text-gray-900 mb-2">{title}</h1>
                {subtitle && (
                  <p className="text-lg text-gray-600">{subtitle}</p>
                )}
              </div>
              {/* Right side: View Domain Board + Profile Menu */}
              <div className="flex items-center gap-3">
                {/* View Domain Board Link */}
                {slug && (
                  <Link
                    to={`/d/${slug}/board`}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <EyeIcon className="w-4 h-4" />
                    <span>View Domain Board</span>
                  </Link>
                )}
                {/* Profile Menu */}
                <UserIdentityDropdown />
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="space-y-6">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};

