import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useViewMode } from '../../context/ViewModeContext';
import { ViewMode } from '../../types/viewMode';
import { logout as logoutWithCookie } from '../../auth/logout';
import { 
  ChevronLeftIcon, 
  ChevronRightIcon,
  BeakerIcon,
  PaintBrushIcon,
  DocumentTextIcon,
  BookOpenIcon,
  SparklesIcon,
  ChatBubbleLeftRightIcon,
  MicrophoneIcon,
  ClipboardDocumentListIcon,
  HomeIcon,
  CogIcon,
  WrenchScrewdriverIcon,
  UserGroupIcon,
  KeyIcon,
  ArrowPathIcon,
  CpuChipIcon,
  TagIcon,
  RectangleStackIcon,
  FolderOpenIcon,
  GlobeAltIcon,
  Squares2X2Icon
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

const ViewModeToggle: React.FC<{ isCollapsed: boolean }> = ({ isCollapsed }) => {
  const { currentMode, setViewMode } = useViewMode();
  const [isOpen, setIsOpen] = useState(false);

  const modes = [
    { mode: ViewMode.Architect, icon: <WrenchScrewdriverIcon className="w-4 h-4" /> },
    { mode: ViewMode.MyKeeper, icon: <BookOpenIcon className="w-4 h-4" /> },
    { mode: ViewMode.Admin, icon: <CogIcon className="w-4 h-4" /> }
  ];

  if (isCollapsed) {
    return (
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 rounded-md hover:bg-muted/50 transition-colors w-full flex items-center justify-center"
        >
          {modes.find(m => m.mode === currentMode)?.icon}
        </button>
        {isOpen && (
          <div className="absolute left-full ml-2 top-0 bg-background/95 backdrop-blur-sm border border-border rounded-md shadow-lg py-1 z-[60] min-w-[140px]">
            {modes.map(({ mode, icon }) => (
              <button
                key={mode}
                onClick={() => {
                  setViewMode(mode);
                  setIsOpen(false);
                }}
                className={`flex items-center px-3 py-2 text-sm w-full text-left hover:bg-muted/50 transition-colors ${
                  currentMode === mode ? 'bg-primary/10 text-primary' : 'text-muted-foreground'
                }`}
              >
                <span className="mr-3">{icon}</span>
                {mode}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-3 py-2 text-sm font-medium text-foreground hover:bg-muted/50 transition-colors rounded-md"
      >
        <div className="flex items-center">
          {modes.find(m => m.mode === currentMode)?.icon}
          <span className="ml-3">{currentMode}</span>
        </div>
        <ArrowPathIcon className="w-4 h-4" />
      </button>
      {isOpen && (
        <div className="absolute bottom-full mb-2 left-0 right-0 bg-background/95 backdrop-blur-sm border border-border rounded-md shadow-lg py-1 z-[60]">
          {modes.map(({ mode, icon }) => (
            <button
              key={mode}
              onClick={() => {
                setViewMode(mode);
                setIsOpen(false);
              }}
              className={`flex items-center px-3 py-2 text-sm w-full text-left hover:bg-muted/50 transition-colors ${
                currentMode === mode ? 'bg-primary/10 text-primary' : 'text-muted-foreground'
              }`}
            >
              <span className="mr-3">{icon}</span>
              {mode}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export const Sidebar: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    aiDesignBuild: true,
    keeperDesignBuild: true,
    themes: true,
    library: true,
    myKeeper: true,
    admin: true
  });
  const { user } = useAuth();
  const { currentMode } = useViewMode();
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

  const renderArchitectMode = () => (
    <>
      {/* AI Design Build Section */}
      <SidebarSection
        title="AI Design Build"
        isCollapsed={isCollapsed}
        isExpanded={expandedSections.aiDesignBuild}
        onToggle={() => toggleSection('aiDesignBuild')}
      >
        <SidebarItem to="/studio/agents" icon={<BeakerIcon />} isCollapsed={isCollapsed}>
          Manage Agents
        </SidebarItem>
        <SidebarItem to="/studio/memory-patterns" icon={<CpuChipIcon />} isCollapsed={isCollapsed}>
          Memory Patterns
        </SidebarItem>
        <SidebarItem to="/studio/agent-classes" icon={<TagIcon />} isCollapsed={isCollapsed}>
          Agent Classes
        </SidebarItem>
        <SidebarItem to="/studio/board-studio" icon={<Squares2X2Icon />} isCollapsed={isCollapsed}>
          Design Boards
        </SidebarItem>
      </SidebarSection>

      {/* Keeper Design Build Section */}
      <SidebarSection
        title="Keeper Design Build"
        isCollapsed={isCollapsed}
        isExpanded={expandedSections.keeperDesignBuild}
        onToggle={() => toggleSection('keeperDesignBuild')}
      >
        <SidebarItem to="/keeper/manage" icon={<BookOpenIcon />} isCollapsed={isCollapsed}>
          Manage Keepers
        </SidebarItem>
        <SidebarItem to="/keeper/types" icon={<SparklesIcon />} isCollapsed={isCollapsed}>
          Keeper Types
        </SidebarItem>
        <SidebarItem to="/keeper/engagement-templates" icon={<RectangleStackIcon />} isCollapsed={isCollapsed}>
          Engagement Templates
        </SidebarItem>
      </SidebarSection>

      {/* Themes Section - Future stub */}
      <SidebarSection
        title="Themes"
        isCollapsed={isCollapsed}
        isExpanded={expandedSections.themes}
        onToggle={() => toggleSection('themes')}
      >
        <SidebarItem to="/studio/themes" icon={<PaintBrushIcon />} isCollapsed={isCollapsed}>
          Theme Library
        </SidebarItem>
      </SidebarSection>

      {/* Library Section */}
      <SidebarSection
        title="Library"
        isCollapsed={isCollapsed}
        isExpanded={expandedSections.library}
        onToggle={() => toggleSection('library')}
      >
        <SidebarItem to="/library" icon={<FolderOpenIcon />} isCollapsed={isCollapsed}>
          Documents
        </SidebarItem>
      </SidebarSection>
    </>
  );

  const renderMyKeeperMode = () => (
    <>
      {/* My Keeper Section */}
      <SidebarSection
        title="My Keeper"
        isCollapsed={isCollapsed}
        isExpanded={expandedSections.myKeeper}
        onToggle={() => toggleSection('myKeeper')}
      >
        <SidebarItem to="/root" icon={<HomeIcon />} isCollapsed={isCollapsed}>
          Root Dashboard
        </SidebarItem>
        <SidebarItem to="/keeper/1/dashboard" icon={<HomeIcon />} isCollapsed={isCollapsed}>
          Dashboard
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
      </SidebarSection>
    </>
  );

  const renderAdminMode = () => (
    <>
      {/* System Admin Section */}
      <SidebarSection
        title="System Administration"
        isCollapsed={isCollapsed}
        isExpanded={expandedSections.admin}
        onToggle={() => toggleSection('admin')}
      >
        <SidebarItem to="/root/profile" icon={<UserGroupIcon />} isCollapsed={isCollapsed}>
          User Management
        </SidebarItem>
        <SidebarItem to="/studio/kip/api-keys" icon={<KeyIcon />} isCollapsed={isCollapsed}>
          Platform API Keys
        </SidebarItem>
        <SidebarItem to="/studio/admin/logs" icon={<DocumentTextIcon />} isCollapsed={isCollapsed}>
          System Logs
        </SidebarItem>
        <SidebarItem to="/admin/domains" icon={<GlobeAltIcon />} isCollapsed={isCollapsed}>
          Domain Management
        </SidebarItem>
        <SidebarItem to="/admin/roles" icon={<UserGroupIcon />} isCollapsed={isCollapsed}>
          Platform Roles
        </SidebarItem>
      </SidebarSection>
    </>
  );

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
        {currentMode === ViewMode.Architect && renderArchitectMode()}
        {currentMode === ViewMode.MyKeeper && renderMyKeeperMode()}
        {currentMode === ViewMode.Admin && renderAdminMode()}
      </nav>

      {/* ViewMode Toggle */}
      {!isCollapsed && (
        <div className="px-4 py-2 border-t border-border">
          <ViewModeToggle isCollapsed={isCollapsed} />
        </div>
      )}
      {isCollapsed && (
        <div className="px-2 py-2 border-t border-border">
          <ViewModeToggle isCollapsed={isCollapsed} />
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
            onClick={logoutWithCookie}
            className="w-full text-left text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}; 