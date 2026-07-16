import * as React from 'react';
import { Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { AppLayout } from './layouts/AppLayout';
import { PublicLayout } from './layouts/PublicLayout';
import { BoardPublicLayout } from './layouts/BoardPublicLayout';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

// Root Pages
import RootDashboardPage from './pages/root/RootDashboardPage';
import SettingsPage from './pages/settings/SettingsPage';

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
import DomainAdminPage from './pages/d/DomainAdminPage';

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

// Demo Pages
import BoardDemoPage from './pages/BoardDemoPage';
import V0Page from './pages/V0Page';
import StyleEditorPage from './pages/StyleEditorPage';
import { RealmsRedirect } from './mobile/screens/RealmsRedirect';
import HomeShellPage from './pages/home/HomeShellPage';
import { HostnameSlugGuard } from './components/HostnameSlugGuard';
import { RealmRoot } from './components/RealmRoot';
import {
  isKeeperPlatformWebHost,
  resolveDefaultDomainSlugFromHostname,
} from './lib/platformHost';
import { buildDefaultPathForHost, getCachedHostDomain } from './lib/resolveHostDomain';
import { useResolvedHostDomain } from './hooks/useResolvedHostDomain';
import { getApiBase } from './lib/apiFetch';
import { DomainLoadCurtain } from './v0/sceneChange/DomainLoadCurtain';
import { prefetchDomainShell } from './v0/boards/domain/domainShellCache';
import { resolvePostLoginDomainSlug } from './v0/boards/domain/domainSwitcherData';

function resolveAuthCurtainSlug(pathname: string, hostname: string): string | null {
  const fromPath = pathname.match(/^\/d\/([^/]+)/)?.[1]?.trim();
  if (fromPath) return fromPath;
  // /home resolves the user's primary domain async — do not brand platform ke3p here.
  if (pathname === '/home' || pathname.startsWith('/home/')) return null;
  const fromHost =
    getCachedHostDomain(hostname)?.slug?.trim() ||
    resolveDefaultDomainSlugFromHostname(hostname)?.trim() ||
    null;
  return fromHost || null;
}

function AuthLoadingCurtain({ pathname }: { pathname: string }) {
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const pathSlug = resolveAuthCurtainSlug(pathname, hostname);
  const [curtainSlug, setCurtainSlug] = React.useState<string | null>(pathSlug);

  React.useEffect(() => {
    let cancelled = false;
    if (pathSlug) {
      setCurtainSlug(pathSlug);
      prefetchDomainShell(pathSlug);
      return () => {
        cancelled = true;
      };
    }

    // Login → /home: brand the user's primary domain once resolved.
    if (pathname === '/home' || pathname.startsWith('/home/') || pathname.startsWith('/login')) {
      void resolvePostLoginDomainSlug().then((slug) => {
        if (cancelled || !slug?.trim()) return;
        setCurtainSlug(slug.trim());
        prefetchDomainShell(slug.trim());
      });
    }

    return () => {
      cancelled = true;
    };
  }, [pathname, pathSlug]);

  if (curtainSlug) {
    return <DomainLoadCurtain domainSlug={curtainSlug} />;
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-lg">Loading...</div>
    </div>
  );
}

const ProtectedRoute: React.FC = () => {
  const { isAuthenticated, authResolved, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading || !authResolved) {
    return <AuthLoadingCurtain pathname={location.pathname} />;
  }

  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};

const RequireAdminRoute: React.FC = () => {
  const { isAuthenticated, isAdmin, authResolved, isLoading } = useAuth();
  const location = useLocation();
  const nextTarget = `${location.pathname}${location.search}`;
  const slugMatch = location.pathname.match(/^\/d\/([^/]+)/);
  const domainSlug = slugMatch?.[1] || 'default';

  if (isLoading || !authResolved) {
    return <AuthLoadingCurtain pathname={location.pathname} />;
  }

  if (!isAuthenticated) {
    return <Navigate to={`/login?next=${encodeURIComponent(nextTarget)}`} replace />;
  }

  if (!isAdmin) {
    return <Navigate to={`/d/${domainSlug}?frame=commons`} replace />;
  }

  return <Outlet />;
};

const RootRedirect: React.FC = () => {
  const location = useLocation();
  const { isAuthenticated, authResolved, isLoading } = useAuth();
  const params = new URLSearchParams(location.search);
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const isPlatformHost = isKeeperPlatformWebHost(hostname);
  const { domain, loading: hostLoading } = useResolvedHostDomain();

  if (isLoading || !authResolved || hostLoading) {
    return <AuthLoadingCurtain pathname={location.pathname} />;
  }

  if (domain?.source === 'unresolved') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 px-6 text-center">
        <p className="text-lg">This address is not connected to a Keeper realm yet.</p>
        <p className="text-sm opacity-70">
          Finish custom domain setup in Configure, or use your Keeper address instead.
        </p>
      </div>
    );
  }

  if (isAuthenticated && isPlatformHost) {
    return <Navigate to="/home" replace />;
  }

  const target = buildDefaultPathForHost(hostname, !!isAuthenticated, params);
  if (!target) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 text-center">
        <p className="text-lg">Loading realm…</p>
      </div>
    );
  }
  return <Navigate to={target} replace />;
};

/** Redirect /v1/:slug and /v1/:slug/board to /d/:slug (typo: v1 vs d) */
const V1ToDRedirect: React.FC = () => {
  const location = useLocation();
  const match = location.pathname.match(/^\/v1\/([^/]+)(\/board)?/);
  if (!match) return null;
  const [, slug] = match;
  const search = location.search || '';
  return <Navigate to={`/d/${slug}${search}`} replace />;
};

/** Redirect /d/:slug/board to /d/:slug (preserves ?board= including realm). */
const BoardToShellRedirect: React.FC = () => {
  const location = useLocation();
  const match = location.pathname.match(/^\/d\/([^/]+)\/board/);
  if (!match) return null;
  const [, slug] = match;
  const search = location.search || '';
  return <Navigate to={`/d/${slug}${search}`} replace />;
};

const App: React.FC = () => {
  console.log('[App] Component rendered in environment:', import.meta.env.MODE);
  // Temporary SystemStatus health ping - remove after validation
  React.useEffect(() => {
    const controller = new AbortController();
    const base = getApiBase();
    const endpoint = `${base}/api/health`;
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
    <HostnameSlugGuard>
    <Routes>
      {/* Admin-only Routes */}
      <Route element={<RequireAdminRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/legacy" element={<Navigate to="/settings" replace />} />
        </Route>
      </Route>

      {/* Protected Routes - Require Authentication */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/settings/api-keys" element={<UserApiKeyManagerPage />} />
          <Route path="/root" element={<RootDashboardPage />} />
          <Route path="/root/profile" element={<Navigate to="/settings" replace />} />
          <Route path="/root/domain" element={<Navigate to="/settings" replace />} />
          <Route path="/root/api-keys" element={<Navigate to="/settings/api-keys" replace />} />
          <Route path="/root/settings/api-keys" element={<Navigate to="/settings/api-keys" replace />} />
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
          
          {/* Legacy Library mockup — redirect to Universal Board */}
          <Route path="/library" element={<Navigate to="/d/default?board=domain" replace />} />

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
        </Route>
      </Route>
      
      {/* Domain Dashboard Routes - V0 Dashboard Layout (Outside AppLayout/Studio) */}
      <Route element={<ProtectedRoute />}>
        <Route path="/home" element={<HomeShellPage />} />
        <Route path="/realms" element={<RealmsRedirect />} />
        <Route path="/kip" element={<KipAgentBoardPage />} />
        {/* Domain admin: any authenticated user can access; API enforces domain ownership for edits */}
        <Route path="/d/:slug/admin" element={<DomainAdminPage />} />
      </Route>
      
      {/* Root: brand hosts render at `/`; platform hosts redirect to `/d/:slug` or `/home` */}
      <Route path="/" element={<RealmRoot platformRedirect={<RootRedirect />} />} />
      
      {/* Public Routes - No Authentication Required */}
      <Route element={<PublicLayout />}>
        <Route path="/v0" element={<V0Page />} />
        <Route path="/v0/style" element={<StyleEditorPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/debug" element={<DebugPage />} />
        <Route path="/board-demo" element={<BoardDemoPage />} />
      </Route>
      
      {/* Redirect /v1/* to /d/* (common typo: v1 vs d) */}
      <Route path="/v1/:slug" element={<V1ToDRedirect />} />
      <Route path="/v1/:slug/board" element={<V1ToDRedirect />} />
      
      {/* Board Routes - Full Viewport, No Shell UI */}
      <Route element={<BoardPublicLayout />}>
        {/* Login - Minimal layout for board-first experience */}
        <Route path="/login" element={<LoginPage />} />
        {/* Legacy domain routes - redirect into v0 shell (no auth required) */}
        <Route path="/d/:slug/feed" element={<LegacyDomainRedirect />} />
        <Route path="/d/:slug/keepers" element={<LegacyDomainRedirect />} />
        <Route path="/d/:slug/journeys" element={<LegacyDomainRedirect />} />
        <Route path="/d/:slug/profile" element={<LegacyDomainRedirect />} />
        <Route path="/d/:slug/agent" element={<LegacyDomainRedirect />} />
        {/* Domain shell — canonical URL is /d/:slug, all params via ?frame= / ?board= */}
        <Route path="/d/:slug" element={<V0ShellPage />} />
        {/* Legacy: realm board on domain URL → user Home */}
        <Route path="/d/:slug/board" element={<BoardToShellRedirect />} />
        {/* Manifesto Pages - Clean, distraction-free reading */}
        <Route path="/manifestos/clean-surface-doctrine" element={<CleanSurfaceDoctrinePage />} />
      </Route>
      
      {/* Dynamic Lead Agent Routes - Must be last to avoid conflicts */}
      <Route path="/:agentSlug" element={<LeadAgentPage />} />
    </Routes>
    </HostnameSlugGuard>
  );
};

export default App;
