import React from 'react';
import { Outlet } from 'react-router-dom';

const AppLayout: React.FC = () => (
  <div>
    <Outlet />
  </div>
);

export { AppLayout }; 