import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AppLayout } from './layouts/AppLayout';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import RootKeeperPage from './pages/RootKeeperPage';
import DomainBoardPage from './pages/DomainBoardPage';
import AgentBoardPage from './pages/AgentBoardPage';
import { DebugInfo } from './components/DebugInfo';

const App: React.FC = () => {
  return (
    <>
      <DebugInfo />
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/root" element={<DomainBoardPage />} />
          <Route path="/root-old" element={<RootKeeperPage />} />
          <Route path="/agent-board" element={<AgentBoardPage />} />
        </Route>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Routes>
    </>
  );
};

export default App;
