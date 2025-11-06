/**
 * Login Page - Minimal Board-First Layout
 * 
 * Clean, centered login form with no shell UI.
 * Uses BoardPublicLayout (no top nav, no sidebar).
 */

import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AuthForm } from '../components/AuthForm';

const LoginPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get('returnTo') || undefined;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="font-display text-4xl font-bold text-stone-900 mb-2">
            Welcome Back
          </h1>
          <p className="text-stone-600">
            Sign in to continue to Keeper
          </p>
        </div>

        {/* Login Form Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-200">
          <AuthForm returnTo={returnTo} />
          
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-center text-sm text-stone-600">
              Don't have a keeper yet?{' '}
              <Link 
                to="/register" 
                className="font-medium text-blue-600 hover:text-blue-700 transition-colors"
              >
                Begin here
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <Link
            to="/"
            className="text-sm text-stone-500 hover:text-stone-700 transition-colors"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage; 