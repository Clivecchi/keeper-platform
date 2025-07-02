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
import AdminPage from './pages/studio/AdminPage';

// Keeper Pages
import AllKeepersPage from './pages/keeper/AllKeepersPage';
import CreateKeeperPage from './pages/keeper/CreateKeeperPage';
import KeeperDashboardPage from './pages/keeper/KeeperDashboardPage';
import KeeperJourneysPage from './pages/keeper/KeeperJourneysPage';
import KeeperMomentsPage from './pages/keeper/KeeperMomentsPage';
import KeeperMemoryPage from './pages/keeper/KeeperMemoryPage';

// Legacy Pages
import UserApiKeyManagerPage from './pages/UserApiKeyManagerPage';
import LeadAgentPage from './pages/LeadAgentPage';
import DebugPage from './pages/DebugPage';

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
          <Route path="/studio/engagement-templates" element={<KipStudioPage />} />
          <Route path="/studio/themes" element={<KipStudioPage />} />
          <Route path="/studio/admin/api-keys" element={<PlatformApiKeyManagerPage />} />
          <Route path="/studio/admin/logs" element={<AgentLogsPage />} />
          
          {/* Legacy Studio Routes */}
          <Route path="/studio/kip" element={<KipStudioPage />} />
          <Route path="/studio/admin" element={<AdminPage />} />
          <Route path="/studio/kip/agents" element={<AgentsPage />} />
          <Route path="/studio/kip/logs" element={<AgentLogsPage />} />
          <Route path="/studio/kip/api-keys" element={<PlatformApiKeyManagerPage />} />
          
          {/* Keeper Section */}
          <Route path="/keeper" element={<AllKeepersPage />} />
          <Route path="/keeper/new" element={<CreateKeeperPage />} />
          <Route path="/keeper/:id/dashboard" element={<KeeperDashboardPage />} />
          <Route path="/keeper/:id/memory" element={<KeeperMemoryPage />} />
          <Route path="/keeper/:id/journeys" element={<KeeperJourneysPage />} />
          <Route path="/keeper/:id/moments" element={<KeeperMomentsPage />} />
          <Route path="/keeper/:id/topics" element={<KeeperDashboardPage />} />
          <Route path="/keeper/:id/voice" element={<KeeperDashboardPage />} />
          <Route path="/keeper/:id/logbook" element={<KeeperDashboardPage />} />
          
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
