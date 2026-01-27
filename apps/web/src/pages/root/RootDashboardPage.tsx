import React from 'react';
import { Navigate } from 'react-router-dom';

const RootDashboardPage: React.FC = () => {
  return <Navigate to="/settings" replace />;
};

export default RootDashboardPage;
