import * as React from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { AppLayout } from './layouts/AppLayout';
import { PublicLayout } from './layouts/PublicLayout';
import { BoardPublicLayout } from './layouts/BoardPublicLayout';
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
import AgentBoardPage from './pages/studio/AgentBoardPage';
import DomainBoardPage from './pages/studio/DomainBoardPage';
import JourneyBoardPage from './pages/studio/journey-board-page';
import KeeperTypeBoardPage from './pages/studio/keeper-type-board-page';
import PeopleBoardPage from './pages/studio/people-board-page';
import BoardStudioPage from './pages/studio/board-studio-page';

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
import DomainDashboardPage from './pages/keeper/DomainDashboardPage';

// Domain Public Pages
import V0ShellPage from './pages/d/V0ShellPage';
import LegacyDomainRedirect from './pages/d/LegacyDomainRedirect';

// Domain Workshop Pages
import DomainWorkshopPage from './pages/studio/domain/DomainWorkshopPage';
import DomainBoardStudioPage from './pages/studio/domain/DomainBoardStudioPage';

// Manifesto Pages
import CleanSurfaceDoctrinePage from './pages/manifestos/CleanSurfaceDoctrinePage';

// Legacy Pages
import UserApiKeyManagerPage from './pages/UserApiKeyManagerPage';
import LeadAgentPage from './pages/LeadAgentPage';
import KipAgentBoardPage from './pages/kip/KipAgentBoardPage';
import DebugPage from './pages/DebugPage';

// Library Pages
import LibraryPage from './pages/LibraryPage';

// Demo Pages
import BoardDemoPage from './pages/BoardDemoPage';
import V0Page from './pages/V0Page';
import StyleEditorPage from './pages/StyleEditorPage';

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
  // Temporary SystemStatus health ping - remove after validation
  React.useEffect(() => {
    const controller = new AbortController();
    const endpoint = 'https://api.ke3p.com/api/health';
    fetch(endpoint, { method: 'GET', signal: controller.signal })
      .then((res) => {
        if (res.ok) {
          console.log('SystemStatus: health ok', { endpoint, status: res.status });
        } else {
          console.warn('SystemStatus: health failed', { endpoint, status: res.status });
        }
      })
      .catch((err) => {
        console.warn('SystemStatus: health error', { endpoint, error: String(err) });
      });
    return () => controller.abort();
  }, []);
  
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
          <Route path="/studio" element={<BoardStudioPage />} />
          <Route path="/studio/agents" element={<AgentsPage />} />
          <Route path="/studio/agents/:agentId" element={<AgentBoardPage />} />
          <Route path="/studio/agent-board" element={<AgentBoardPage />} />
          <Route path="/studio/domain-board" element={<DomainBoardPage />} />
          <Route path="/studio/journey-board" element={<JourneyBoardPage />} />
          <Route path="/studio/keeper-type-board" element={<KeeperTypeBoardPage />} />
          <Route path="/studio/people-board" element={<PeopleBoardPage />} />
          <Route path="/studio/board-studio" element={<BoardStudioPage />} />
          
          {/* Domain Workshop Routes */}
          <Route path="/studio/domain/:domainId" element={<DomainWorkshopPage />} />
          <Route path="/studio/domain/:domainId/board-studio" element={<DomainBoardStudioPage />} />

          {/* Backward-compat alias to handle direct links or outdated menus */}
          <Route path="/board-studio" element={<BoardStudioPage />} />
          <Route path="/boards/studio" element={<BoardStudioPage />} />
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
          <Route path="/keeper/domain-dashboard" element={<DomainDashboardPage />} />
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
      
      {/* Domain Dashboard Routes - V0 Dashboard Layout (Outside AppLayout/Studio) */}
      <Route element={<ProtectedRoute />}>
        <Route path="/kip" element={<KipAgentBoardPage />} />
        <Route path="/d/:slug/feed" element={<LegacyDomainRedirect />} />
        <Route path="/d/:slug/keepers" element={<LegacyDomainRedirect />} />
        <Route path="/d/:slug/journeys" element={<LegacyDomainRedirect />} />
        <Route path="/d/:slug/profile" element={<LegacyDomainRedirect />} />
        <Route path="/d/:slug/admin" element={<LegacyDomainRedirect />} />
        <Route path="/d/:slug/agent" element={<LegacyDomainRedirect />} />
      </Route>
      
      {/* Public Routes - No Authentication Required */}
      <Route element={<PublicLayout />}>
        <Route path="/v0" element={<V0Page />} />
        <Route path="/v0/style" element={<StyleEditorPage />} />
        <Route path="/" element={<LandingPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/debug" element={<DebugPage />} />
        <Route path="/board-demo" element={<BoardDemoPage />} />
      </Route>
      
      {/* Board Routes - Full Viewport, No Shell UI */}
      <Route element={<BoardPublicLayout />}>
        {/* Login - Minimal layout for board-first experience */}
        <Route path="/login" element={<LoginPage />} />
        {/* Public Domain Board - Shows board for logged out, redirects logged in to Feed */}
        <Route path="/d/:slug" element={<V0ShellPage />} />
        {/* Public Domain Board View - Always shows board, even when logged in */}
        <Route path="/d/:slug/board" element={<V0ShellPage />} />
        {/* Manifesto Pages - Clean, distraction-free reading */}
        <Route path="/manifestos/clean-surface-doctrine" element={<CleanSurfaceDoctrinePage />} />
      </Route>
      
      {/* Dynamic Lead Agent Routes - Must be last to avoid conflicts */}
      <Route path="/:agentSlug" element={<LeadAgentPage />} />
    </Routes>
  );
};

export default App;
