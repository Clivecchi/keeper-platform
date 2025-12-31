import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './context/AuthContext';


const ProtectedRoute: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>; // Or a spinner component
  }

  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};

function App() {
  console.log('[app-old.tsx] This old app file is rendering!');
  
  return (
    <>
      <div className="h-screen w-screen bg-red-500 text-white flex items-center justify-center text-2xl font-bold">
        If you can see this red screen, Tailwind CSS is working.
      </div>
      
      {/* DEBUG BUTTON */}
      <button
        type="button"
        onClick={() => window.location.href = '/debug'}
        style={{
          position: 'fixed',
          bottom: '20px', 
          right: '20px',
          zIndex: 999999,
          background: 'blue',
          color: 'white',
          padding: '20px',
          fontSize: '20px',
          border: '5px solid green',
          borderRadius: '10px',
          cursor: 'pointer',
          fontWeight: 'bold'
        }}
      >
        DEBUG BUTTON (OLD APP)
      </button>
    </>
  );
}

export default App;