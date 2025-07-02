import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import DebugButton from '../DebugButton';
import { 
  ChevronLeftIcon, 
  ChevronRightIcon,
  BeakerIcon,
  PaintBrushIcon,
  ShieldCheckIcon,
  DocumentTextIcon,
  BookOpenIcon,
  SparklesIcon,
  ChatBubbleLeftRightIcon,
  MicrophoneIcon,
  ClipboardDocumentListIcon,
  PlusIcon,
  HomeIcon
} from '@heroicons/react/24/outline';

interface SidebarItemProps {
  to: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  isCollapsed: boolean;
  isActive?: boolean;
  onClick?: () => void;
}

interface SidebarSectionProps {
  title: string;
  children: React.ReactNode;
  isCollapsed: boolean;
  isExpanded?: boolean;
  onToggle?: () => void;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ 
  to, 
  icon, 
  children, 
  isCollapsed, 
  isActive,
  onClick 
}) => (
  <NavLink
    to={to}
    onClick={onClick}
    className={({ isActive: navIsActive }) => {
      const active = navIsActive || isActive;
      return `flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
        active 
          ? 'bg-primary/10 text-primary border-r-2 border-primary' 
          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
      }`;
    }}
  >
    <span className="flex-shrink-0 w-5 h-5">
      {icon}
    </span>
    {!isCollapsed && (
      <span className="ml-3 truncate">
        {children}
      </span>
    )}
  </NavLink>
);

const SidebarSection: React.FC<SidebarSectionProps> = ({ 
  title, 
  children, 
  isCollapsed, 
  isExpanded = true,
  onToggle 
}) => (
  <div className="mb-6">
    {!isCollapsed && (
      <button
        onClick={onToggle}
        className="flex items-center justify-between w-full px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
      >
        <span>{title}</span>
        {onToggle && (
          <ChevronRightIcon 
            className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`} 
          />
        )}
      </button>
    )}
    <AnimatePresence>
      {(isCollapsed || isExpanded) && (
        <motion.div
          initial={!isCollapsed ? { opacity: 0, height: 0 } : false}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
          className="space-y-1"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

export const Sidebar: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    root: true,
    studio: true,
    keeper: true
  });
  const { user, logout } = useAuth();
  const location = useLocation();

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div className={`flex flex-col h-screen bg-card border-r border-border shadow-sm transition-all duration-300 ${
      isCollapsed ? 'w-16' : 'w-64'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        {!isCollapsed && (
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
              <BookOpenIcon className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-display text-xl font-bold text-foreground">Keeper</span>
          </div>
        )}
        <button
          onClick={toggleCollapse}
          className="p-1 rounded-md hover:bg-muted/50 transition-colors"
        >
          {isCollapsed ? (
            <ChevronRightIcon className="w-5 h-5 text-muted-foreground" />
          ) : (
            <ChevronLeftIcon className="w-5 h-5 text-muted-foreground" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        {/* Root Section */}
        <SidebarSection
          title="Root"
          isCollapsed={isCollapsed}
          isExpanded={expandedSections.root}
          onToggle={() => toggleSection('root')}
        >
          <SidebarItem to="/root" icon={<HomeIcon />} isCollapsed={isCollapsed}>
            Dashboard
          </SidebarItem>
        </SidebarSection>

        {/* Studio Section */}
        <SidebarSection
          title="Studio"
          isCollapsed={isCollapsed}
          isExpanded={expandedSections.studio}
          onToggle={() => toggleSection('studio')}
        >
          <SidebarItem to="/studio/agents" icon={<BeakerIcon />} isCollapsed={isCollapsed}>
            Agents
          </SidebarItem>
          <SidebarItem to="/studio/engagement-templates" icon={<ChatBubbleLeftRightIcon />} isCollapsed={isCollapsed}>
            Engagement Templates
          </SidebarItem>
          <SidebarItem to="/studio/themes" icon={<PaintBrushIcon />} isCollapsed={isCollapsed}>
            Themes
          </SidebarItem>
          <div className={`${isCollapsed ? '' : 'ml-3 pl-3 border-l border-border'}`}>
            <div className={`${isCollapsed ? '' : 'py-2'}`}>
              {!isCollapsed && (
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Admin Tools
                </span>
              )}
              <div className="space-y-1 mt-2">
                <SidebarItem to="/studio/admin/api-keys" icon={<ShieldCheckIcon />} isCollapsed={isCollapsed}>
                  API Key Vault
                </SidebarItem>
                <SidebarItem to="/studio/admin/logs" icon={<DocumentTextIcon />} isCollapsed={isCollapsed}>
                  System Logs
                </SidebarItem>
              </div>
            </div>
          </div>
        </SidebarSection>

        {/* Keeper Section */}
        <SidebarSection
          title="Keeper"
          isCollapsed={isCollapsed}
          isExpanded={expandedSections.keeper}
          onToggle={() => toggleSection('keeper')}
        >
          <SidebarItem to="/keeper" icon={<BookOpenIcon />} isCollapsed={isCollapsed}>
            All Keepers
          </SidebarItem>
          <SidebarItem to="/keeper/new" icon={<PlusIcon />} isCollapsed={isCollapsed}>
            Create New Keeper
          </SidebarItem>
          
          {/* Selected Keeper submenu - This will be dynamic in the future */}
          <div className={`${isCollapsed ? '' : 'ml-3 pl-3 border-l border-border'}`}>
            <div className={`${isCollapsed ? '' : 'py-2'}`}>
              {!isCollapsed && (
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Selected Keeper
                </span>
              )}
              <div className="space-y-1 mt-2">
                <SidebarItem to="/keeper/1/dashboard" icon={<HomeIcon />} isCollapsed={isCollapsed}>
                  Dashboard
                </SidebarItem>
                <SidebarItem to="/keeper/1/memory" icon={<SparklesIcon />} isCollapsed={isCollapsed}>
                  Memory (SOLE)
                </SidebarItem>
                <SidebarItem to="/keeper/1/journeys" icon={<BookOpenIcon />} isCollapsed={isCollapsed}>
                  Journeys
                </SidebarItem>
                <SidebarItem to="/keeper/1/moments" icon={<DocumentTextIcon />} isCollapsed={isCollapsed}>
                  Moments
                </SidebarItem>
                <SidebarItem to="/keeper/1/topics" icon={<ChatBubbleLeftRightIcon />} isCollapsed={isCollapsed}>
                  Topics
                </SidebarItem>
                <SidebarItem to="/keeper/1/voice" icon={<MicrophoneIcon />} isCollapsed={isCollapsed}>
                  Voice Panel
                </SidebarItem>
                <SidebarItem to="/keeper/1/logbook" icon={<ClipboardDocumentListIcon />} isCollapsed={isCollapsed}>
                  Logbook
                </SidebarItem>
              </div>
            </div>
          </div>
        </SidebarSection>
      </nav>

      {/* Debug Button */}
      {!isCollapsed && (
        <div className="px-4 py-2 border-t border-border">
          <DebugButton variant="sidebar" />
        </div>
      )}

      {/* User Footer */}
      {!isCollapsed && (
        <div className="p-4 border-t border-border">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-8 h-8 bg-muted rounded-full flex-shrink-0"></div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground truncate">
                {user?.name || 'User'}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {user?.email}
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full text-left text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}; 