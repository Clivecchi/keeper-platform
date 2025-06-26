import * as React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AppLayout } from './layouts/AppLayout';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import RootKeeperPage from './pages/RootKeeperPage';
import DebugButton from './components/DebugButton';
import DebugPage from './pages/DebugPage';

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
        <Route element={<AppLayout />}>
          <Route path="/root" element={<RootKeeperPage />} />
        </Route>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/debug" element={<DebugPage />} />
      </Routes>
      <DebugButton />
    </>
  );
};

export default App;
