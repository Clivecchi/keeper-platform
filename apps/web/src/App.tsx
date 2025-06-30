import * as React from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { AppLayout } from './layouts/AppLayout';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import RootKeeperPage from './pages/RootKeeperPage';
import KipStudioPage from './pages/studio/KipStudioPage';
import AgentsPage from './pages/studio/kip/AgentsPage';
import AgentLogsPage from './pages/studio/kip/AgentLogsPage';
import PlatformApiKeyManagerPage from './pages/studio/kip/PlatformApiKeyManagerPage';
import AdminPage from './pages/studio/AdminPage';
import UserApiKeyManagerPage from './pages/UserApiKeyManagerPage';
import LeadAgentPage from './pages/LeadAgentPage';
import DebugButton from './components/DebugButton';
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
    <>
      {/* TEMPORARY: Visual indicator that App is rendering */}
      <div style={{
        position: 'fixed',
        top: '10px',
        left: '10px',
        background: 'yellow',
        color: 'black',
        padding: '5px',
        zIndex: 999999,
        fontSize: '12px',
        border: '2px solid red'
      }}>
        APP RENDERED: {import.meta.env.MODE}
      </div>
      
      <Routes>
        {/* Protected Routes - Require Authentication */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/root" element={<RootKeeperPage />} />
            <Route path="/root/settings/api-keys" element={<UserApiKeyManagerPage />} />
            <Route path="/studio/kip" element={<KipStudioPage />} />
            <Route path="/studio/admin" element={<AdminPage />} />
            <Route path="/studio/kip/agents" element={<AgentsPage />} />
            <Route path="/studio/kip/logs" element={<AgentLogsPage />} />
            <Route path="/studio/kip/api-keys" element={<PlatformApiKeyManagerPage />} />
          </Route>
        </Route>
        
        {/* Public Routes - No Authentication Required */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/debug" element={<DebugPage />} />
        
        {/* Dynamic Lead Agent Routes - Must be last to avoid conflicts */}
        <Route path="/:agentSlug" element={<LeadAgentPage />} />
      </Routes>
      <DebugButton />
    </>
  );
};

export default App;
