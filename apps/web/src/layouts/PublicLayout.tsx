import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Navbar } from '../components/layout/Navbar';
import { motion } from 'framer-motion';

export const PublicLayout: React.FC = () => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const isV0Moment = location.pathname === '/v0' && (searchParams.get('frame') || 'cover').toLowerCase() === 'moment';
  const outlet = <Outlet />;

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <Navbar />
      <motion.main
        className="flex-grow"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
      >
        {isV0Moment ? (
          <>
            {outlet}
            <div className="container mx-auto px-[7px] py-[7px]" />
          </>
        ) : (
          <div className="container mx-auto px-[7px] py-[7px]">
            {outlet}
          </div>
        )}
      </motion.main>
    </div>
  );
}; 