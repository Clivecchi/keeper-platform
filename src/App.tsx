import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AppLayout } from './layouts/AppLayout';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import RootKeeperPage from './pages/RootKeeperPage';
import BoardStudioIndex from './pages/Studio/BoardStudioIndex';
import AgentBoard from './pages/Studio/AgentBoard';
import DomainBoard from './pages/Studio/DomainBoard';

const App: React.FC = () => {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/root" element={<RootKeeperPage />} />
        <Route path="/studio" element={<BoardStudioIndex />} />
        <Route path="/studio/agent-board" element={<AgentBoard />} />
        <Route path="/studio/domain-board" element={<DomainBoard />} />
      </Route>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
    </Routes>
  );
};

export default App;
