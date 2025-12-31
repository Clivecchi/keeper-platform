import React from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import ReflectionJournal from '../../components/engagement/ReflectionJournal';
import { InformationCircleIcon } from '@heroicons/react/24/outline';

const ReflectionJournalPage: React.FC = () => {
  const { id: keeperId } = useParams<{ id: string }>();
  const { user } = useAuth();

  // Check if this is a demo mode
  const isDemoMode = keeperId === 'demo-sole-keeper';

  if (!keeperId) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Invalid keeper ID provided.</p>
        </div>
      </div>
    );
  }

  if (!user && !isDemoMode) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">Please log in to access the reflection journal.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Demo Mode Notice */}
      {isDemoMode && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2">
            <InformationCircleIcon className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-blue-800">Demo Mode</h3>
          </div>
          <p className="text-blue-700 mt-1">
            This is a demonstration of the Reflection Journal engagement template. 
            In demo mode, data changes are simulated and not saved to the database.
          </p>
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Reflection Journal {isDemoMode && <span className="text-blue-600">(Demo)</span>}
        </h1>
        <p className="text-muted-foreground">
          Capture insights and promote them to memory cards using the SOLE pattern
        </p>
      </div>

      {/* Reflection Journal Component */}
      <ReflectionJournal keeperId={keeperId} />
    </div>
  );
};

export default ReflectionJournalPage; 