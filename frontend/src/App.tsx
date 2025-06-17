import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AppLayout } from './layouts/AppLayout';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import RootKeeperPage from './pages/RootKeeperPage';

console.log('🧭 DEBUG: Rendering App');

const App: React.FC = () => {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/root" element={<RootKeeperPage />} />
      </Route>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
    </Routes>
  );
};

export default App;
