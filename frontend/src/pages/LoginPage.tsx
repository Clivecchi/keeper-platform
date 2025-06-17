import React from 'react';
import { Link } from 'react-router-dom';
import { AuthForm } from '../components/AuthForm';
import { DebugButton } from '@/components/DebugButton';

const LoginPage: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md p-8">
        <h1 className="text-2xl font-bold text-center mb-8">Welcome Back</h1>
        <AuthForm />
        <p className="mt-6 text-center text-md text-secondary">
          Don't have a keeper yet?{' '}
          <Link to="/register" className="font-serif font-medium text-primary hover:underline">
            Begin here.
          </Link>
        </p>
      </div>
      <DebugButton />
    </div>
  );
};

export default LoginPage; 