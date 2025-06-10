import React from 'react';
import { Link } from 'react-router-dom';
import { AuthForm } from '../components/AuthForm';
import { motion } from 'framer-motion';

const LoginPage: React.FC = () => {
  return (
    <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <motion.div
        className="max-w-md w-full space-y-8 bg-card p-10 rounded-xl shadow-lg border border-card-border"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <AuthForm />
        <p className="mt-6 text-center text-md text-secondary">
          Don't have a keeper yet?{' '}
          <Link to="/register" className="font-serif font-medium text-primary hover:underline">
            Begin here.
          </Link>
        </p>
      </motion.div>
    </div>
  );
};

export default LoginPage; 