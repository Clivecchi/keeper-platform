import * as React from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { AppLayout } from './layouts/AppLayout';
import { PublicLayout } from './layouts/PublicLayout';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

// Root Pages
import RootDashboardPage from './pages/root/RootDashboardPage';

// Studio Pages (existing)
import KipStudioPage from './pages/studio/KipStudioPage';
import AgentsPage from './pages/studio/kip/AgentsPage';
import AgentLogsPage from './pages/studio/kip/AgentLogsPage';
import PlatformApiKeyManagerPage from './pages/studio/kip/PlatformApiKeyManagerPage';
// Admin Pages
import DomainsPage from './pages/admin/DomainsPage';
import RolesPage from './pages/admin/RolesPage';
import UserManagementPage from './pages/admin/UserManagementPage';
import AdminPage from './pages/studio/AdminPage';
import MemoryPatternsPage from './pages/studio/MemoryPatternsPage';
import AgentClassesPage from './pages/studio/AgentClassesPage';

// Keeper Pages
import AllKeepersPage from './pages/keeper/AllKeepersPage';
import KeeperManagePage from './pages/keeper/KeeperManagePage';
import CreateKeeperPage from './pages/keeper/CreateKeeperPage';
import KeeperDashboardPage from './pages/keeper/KeeperDashboardPage';
import KeeperJourneysPage from './pages/keeper/KeeperJourneysPage';
import KeeperMomentsPage from './pages/keeper/KeeperMomentsPage';
import KeeperMemoryPage from './pages/keeper/KeeperMemoryPage';
import KeeperTypesPage from './pages/keeper/KeeperTypesPage';
import SelectedKeeperMetadataPage from './pages/keeper/SelectedKeeperMetadataPage';
import ReflectionJournalPage from './pages/keeper/ReflectionJournalPage';
import MemoryCardManagerPage from './pages/keeper/MemoryCardManagerPage';
import VoicePanelPage from './pages/keeper/VoicePanelPage';
import EchoWriterPage from './pages/keeper/EchoWriterPage';
import IdentityLogbookPage from './pages/keeper/IdentityLogbookPage';
import EngagementTemplatesPage from './pages/keeper/EngagementTemplatesPage';

// Legacy Pages
import UserApiKeyManagerPage from './pages/UserApiKeyManagerPage';
import LeadAgentPage from './pages/LeadAgentPage';
import DebugPage from './pages/DebugPage';

// Library Pages
import LibraryPage from './pages/LibraryPage';

const ProtectedRoute: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};

const App: React.FC = () => {
  console.log('[App] Component rendered in environment:', import.meta.env.MODE);
  
  return (
    <Routes>
      {/* Protected Routes - Require Authentication */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          {/* Root Section */}
          <Route path="/root" element={<RootDashboardPage />} />
          <Route path="/root/profile" element={<RootDashboardPage />} />
          <Route path="/root/domain" element={<RootDashboardPage />} />
          <Route path="/root/api-keys" element={<UserApiKeyManagerPage />} />
          
          {/* Studio Section */}
          <Route path="/studio" element={<Navigate to="/studio/agents" replace />} />
          <Route path="/studio/agents" element={<AgentsPage />} />
          <Route path="/studio/memory-patterns" element={<MemoryPatternsPage />} />
          <Route path="/studio/agent-classes" element={<AgentClassesPage />} />
          <Route path="/studio/engagement-templates" element={<KipStudioPage />} />
          <Route path="/studio/themes" element={<KipStudioPage />} />
          <Route path="/studio/admin/api-keys" element={<PlatformApiKeyManagerPage />} />
          <Route path="/studio/admin/logs" element={<AgentLogsPage />} />
          {/* Admin Domain Management */}
          <Route path="/admin/domains" element={<DomainsPage />} />
          <Route path="/admin/roles" element={<RolesPage />} />
          <Route path="/admin/users" element={<UserManagementPage />} />
          
          {/* Legacy Studio Routes */}
          <Route path="/studio/kip" element={<KipStudioPage />} />
          <Route path="/studio/admin" element={<AdminPage />} />
          <Route path="/studio/kip/agents" element={<AgentsPage />} />
          <Route path="/studio/kip/logs" element={<AgentLogsPage />} />
          <Route path="/studio/kip/api-keys" element={<PlatformApiKeyManagerPage />} />
          
          {/* Library Section */}
          <Route path="/library" element={<LibraryPage />} />
          
          {/* Keeper Section */}
          <Route path="/keeper" element={<AllKeepersPage />} />
          <Route path="/keeper/manage" element={<KeeperManagePage />} />
          <Route path="/keeper/types" element={<KeeperTypesPage />} />
          <Route path="/keeper/engagement-templates" element={<EngagementTemplatesPage />} />
          <Route path="/keeper/new" element={<CreateKeeperPage />} />
          <Route path="/keeper/:id/dashboard" element={<KeeperDashboardPage />} />
          <Route path="/keeper/:id/memory" element={<KeeperMemoryPage />} />
          <Route path="/keeper/:id/journeys" element={<KeeperJourneysPage />} />
          <Route path="/keeper/:id/moments" element={<KeeperMomentsPage />} />
          <Route path="/keeper/:id/reflection-journal" element={<ReflectionJournalPage />} />
          <Route path="/keeper/:id/memory-cards" element={<MemoryCardManagerPage />} />
          <Route path="/keeper/:id/voice-panel" element={<VoicePanelPage />} />
          <Route path="/keeper/:id/echo-writer" element={<EchoWriterPage />} />
          <Route path="/keeper/:id/identity-logbook" element={<IdentityLogbookPage />} />
          <Route path="/keeper/:id/topics" element={<KeeperDashboardPage />} />
          <Route path="/keeper/:id/voice" element={<KeeperDashboardPage />} />
          <Route path="/keeper/:id/logbook" element={<KeeperDashboardPage />} />
          
          {/* Architect Mode - Selected Keeper Routes */}
          <Route path="/keeper/selected/metadata" element={<SelectedKeeperMetadataPage />} />
          <Route path="/keeper/selected/engagement-templates" element={<SelectedKeeperMetadataPage />} />
          <Route path="/keeper/selected/memory-tools" element={<SelectedKeeperMetadataPage />} />
          
          {/* Legacy Routes - maintain compatibility */}
          <Route path="/root/settings/api-keys" element={<UserApiKeyManagerPage />} />
        </Route>
      </Route>
      
      {/* Public Routes - No Authentication Required */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/debug" element={<DebugPage />} />
      </Route>
      
      {/* Dynamic Lead Agent Routes - Must be last to avoid conflicts */}
      <Route path="/:agentSlug" element={<LeadAgentPage />} />
    </Routes>
  );
};

export default App;
