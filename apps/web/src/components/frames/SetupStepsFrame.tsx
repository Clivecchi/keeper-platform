/**
 * Setup Steps Frame
 * =================
 * 
 * Process frame component for displaying domain setup progress.
 * Shows step-by-step configuration with completion status.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircleIcon,
  ClockIcon,
  ExclamationCircleIcon,
  ArrowRightIcon,
  Cog6ToothIcon,
  GlobeAltIcon,
  UserGroupIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';
import { BaseFrameProps } from '../../types/frame';
import { useFrame } from '../../context/FrameContext';

interface SetupStep {
  id: string;
  title: string;
  description: string;
  status: 'completed' | 'current' | 'pending' | 'error';
  icon: React.ReactNode;
  estimatedTime?: string;
  actionLabel?: string;
}

const SetupStepsFrame: React.FC<BaseFrameProps> = ({
  frameInstance,
  className = '',
  onInteraction,
  isPreview = false,
}) => {
  const { handleFrameInteraction } = useFrame();
  const [currentStep, setCurrentStep] = useState(1);

  // Mock setup steps data
  const setupSteps: SetupStep[] = [
    {
      id: 'domain-info',
      title: 'Domain Information',
      description: 'Configure basic domain settings and branding',
      status: 'completed',
      icon: <GlobeAltIcon className="w-5 h-5" />,
      estimatedTime: '2 min',
      actionLabel: 'Edit Info'
    },
    {
      id: 'team-setup',
      title: 'Team Setup',
      description: 'Invite team members and assign roles',
      status: 'current',
      icon: <UserGroupIcon className="w-5 h-5" />,
      estimatedTime: '5 min',
      actionLabel: 'Add Members'
    },
    {
      id: 'custom-domain',
      title: 'Custom Domain',
      description: 'Configure DNS settings and custom domain',
      status: 'pending',
      icon: <Cog6ToothIcon className="w-5 h-5" />,
      estimatedTime: '3 min',
      actionLabel: 'Configure DNS'
    },
    {
      id: 'security',
      title: 'Security & Permissions',
      description: 'Set up authentication and access controls',
      status: 'pending',
      icon: <ShieldCheckIcon className="w-5 h-5" />,
      estimatedTime: '4 min',
      actionLabel: 'Configure Security'
    }
  ];

  const getStatusIcon = (status: SetupStep['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="w-6 h-6 text-green-500" />;
      case 'current':
        return <ClockIcon className="w-6 h-6 text-blue-500 animate-pulse" />;
      case 'error':
        return <ExclamationCircleIcon className="w-6 h-6 text-red-500" />;
      default:
        return <div className="w-6 h-6 rounded-full border-2 border-gray-300" />;
    }
  };

  const getStepColor = (status: SetupStep['status']) => {
    switch (status) {
      case 'completed':
        return 'border-green-200 bg-green-50';
      case 'current':
        return 'border-blue-200 bg-blue-50 ring-2 ring-blue-500 ring-opacity-20';
      case 'error':
        return 'border-red-200 bg-red-50';
      default:
        return 'border-gray-200 bg-white';
    }
  };

  const handleStepAction = (step: SetupStep) => {
    const interaction = {
      type: 'click' as const,
      frameId: frameInstance.id,
      data: { 
        action: 'step_action', 
        stepId: step.id,
        stepTitle: step.title 
      },
      timestamp: new Date(),
    };
    
    handleFrameInteraction(interaction);
    onInteraction?.(interaction);

    // Update current step for demo purposes
    const stepIndex = setupSteps.findIndex(s => s.id === step.id);
    if (stepIndex !== -1) {
      setCurrentStep(stepIndex);
    }
  };

  const completedSteps = setupSteps.filter(step => step.status === 'completed').length;
  const totalSteps = setupSteps.length;
  const progressPercentage = Math.round((completedSteps / totalSteps) * 100);

  if (isPreview) {
    return (
      <div className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center space-x-2 mb-2">
          <ClockIcon className="w-5 h-5 text-blue-600" />
          <h3 className="font-medium text-gray-900">Setup Steps</h3>
        </div>
        <p className="text-sm text-gray-600">
          Track domain configuration progress with step-by-step guidance.
        </p>
      </div>
    );
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Setup Progress</h3>
            <p className="text-sm text-gray-600 mt-1">Complete these steps to finish your domain setup</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-600">{progressPercentage}%</div>
            <div className="text-xs text-gray-500">{completedSteps} of {totalSteps} complete</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <motion.div
              className="h-2 rounded-full bg-blue-600"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercentage}%` }}
              transition={{ duration: 1, delay: 0.3 }}
            />
          </div>
        </div>
      </div>

      {/* Steps List */}
      <div className="p-6">
        <div className="space-y-4">
          <AnimatePresence>
            {setupSteps.map((step, index) => (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className={`border rounded-lg p-4 transition-all duration-200 ${getStepColor(step.status)}`}
              >
                <div className="flex items-start space-x-4">
                  {/* Status Icon */}
                  <div className="flex-shrink-0 mt-1">
                    {getStatusIcon(step.status)}
                  </div>

                  {/* Step Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="text-base font-medium text-gray-900 mb-1">
                          {step.title}
                        </h4>
                        <p className="text-sm text-gray-600 mb-2">
                          {step.description}
                        </p>
                        
                        {step.estimatedTime && (
                          <div className="flex items-center text-xs text-gray-500">
                            <ClockIcon className="w-3 h-3 mr-1" />
                            <span>Estimated time: {step.estimatedTime}</span>
                          </div>
                        )}
                      </div>

                      {/* Action Button */}
                      {step.status !== 'completed' && step.actionLabel && (
                        <button
                          onClick={() => handleStepAction(step)}
                          className={`ml-4 inline-flex items-center space-x-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                            step.status === 'current'
                              ? 'bg-blue-600 text-white hover:bg-blue-700'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          <span>{step.actionLabel}</span>
                          <ArrowRightIcon className="w-4 h-4" />
                        </button>
                      )}

                      {step.status === 'completed' && (
                        <button
                          onClick={() => handleStepAction(step)}
                          className="ml-4 inline-flex items-center space-x-2 px-3 py-1.5 rounded-lg text-sm font-medium text-green-700 bg-green-100 hover:bg-green-200 transition-colors"
                        >
                          <span>Review</span>
                          <CheckCircleIcon className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Step Icon */}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200 border-opacity-50">
                  <div className="flex items-center space-x-2 text-gray-500">
                    {step.icon}
                    <span className="text-xs font-medium">Step {index + 1}</span>
                  </div>
                  
                  {step.status === 'current' && (
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                      <span className="text-xs text-blue-600 font-medium">In Progress</span>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Need help? <a href="#" className="text-blue-600 hover:text-blue-700">View setup guide</a>
          </p>
          <div className="text-xs text-gray-500">
            {completedSteps === totalSteps ? 'Setup complete! 🎉' : `${totalSteps - completedSteps} steps remaining`}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SetupStepsFrame;
