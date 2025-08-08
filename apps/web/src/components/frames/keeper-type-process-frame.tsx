/**
 * Keeper Type Process Frame
 * =========================
 * 
 * Process frame component for Keeper Type setup and configuration workflow.
 * Shows step-by-step process with validation and progress tracking.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ClipboardDocumentListIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationCircleIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  SparklesIcon,
  InformationCircleIcon,
  CpuChipIcon,
  LinkIcon,
  Cog6ToothIcon,
  PlayIcon
} from '@heroicons/react/24/outline';
import { BaseFrameProps } from '../../types/frame';
import { useFrame } from '../../context/FrameContext';

interface ProcessStep {
  id: string;
  title: string;
  description: string;
  status: 'completed' | 'current' | 'pending' | 'error';
  icon: React.ReactNode;
  estimatedTime?: string;
  actionLabel?: string;
  requirements?: string[];
  isOptional?: boolean;
}

const KeeperTypeProcessFrame: React.FC<BaseFrameProps> = ({
  frameInstance,
  className = '',
  onInteraction,
  isPreview = false,
}) => {
  const { handleFrameInteraction } = useFrame();
  const [currentStep, setCurrentStep] = useState(1);

  // Mock process steps data
  const [processSteps] = useState<ProcessStep[]>([
    {
      id: 'basic-info',
      title: 'Basic Information',
      description: 'Configure name, description, and basic properties',
      status: 'completed',
      icon: <InformationCircleIcon className="w-5 h-5" />,
      estimatedTime: '2 min',
      actionLabel: 'Edit Info',
      requirements: ['Unique name', 'Clear description', 'Category selection']
    },
    {
      id: 'capabilities',
      title: 'Define Capabilities',
      description: 'Specify what this Keeper Type can do and its features',
      status: 'current',
      icon: <SparklesIcon className="w-5 h-5" />,
      estimatedTime: '5 min',
      actionLabel: 'Add Capabilities',
      requirements: ['At least 3 capabilities', 'Clear capability descriptions']
    },
    {
      id: 'configuration',
      title: 'Advanced Configuration',
      description: 'Set up themes, permissions, and advanced settings',
      status: 'pending',
      icon: <Cog6ToothIcon className="w-5 h-5" />,
      estimatedTime: '3 min',
      actionLabel: 'Configure Settings',
      requirements: ['Theme selection', 'Permission settings'],
      isOptional: false
    },
    {
      id: 'link-resources',
      title: 'Link Resources',
      description: 'Connect journeys and create initial agents',
      status: 'pending',
      icon: <LinkIcon className="w-5 h-5" />,
      estimatedTime: '4 min',
      actionLabel: 'Link Resources',
      requirements: ['At least 1 journey', 'Test agent creation'],
      isOptional: true
    },
    {
      id: 'testing',
      title: 'Testing & Validation',
      description: 'Test the Keeper Type and validate functionality',
      status: 'pending',
      icon: <CpuChipIcon className="w-5 h-5" />,
      estimatedTime: '3 min',
      actionLabel: 'Run Tests',
      requirements: ['Create test agent', 'Validate responses', 'Performance check']
    },
    {
      id: 'publish',
      title: 'Publish & Deploy',
      description: 'Make the Keeper Type available for use',
      status: 'pending',
      icon: <PlayIcon className="w-5 h-5" />,
      estimatedTime: '1 min',
      actionLabel: 'Publish',
      requirements: ['All previous steps completed', 'Final review']
    }
  ]);

  const getStatusIcon = (status: ProcessStep['status']) => {
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

  const getStepColor = (status: ProcessStep['status']) => {
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

  const handleStepAction = (step: ProcessStep) => {
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
    const stepIndex = processSteps.findIndex(s => s.id === step.id);
    if (stepIndex !== -1) {
      setCurrentStep(stepIndex);
    }
  };

  const handleNavigation = (direction: 'next' | 'previous') => {
    const newStep = direction === 'next' 
      ? Math.min(currentStep + 1, processSteps.length - 1)
      : Math.max(currentStep - 1, 0);
    
    setCurrentStep(newStep);
    
    const interaction = {
      type: 'click' as const,
      frameId: frameInstance.id,
      data: { action: `${direction}_step`, stepIndex: newStep },
      timestamp: new Date(),
    };
    
    handleFrameInteraction(interaction);
    onInteraction?.(interaction);
  };

  const completedSteps = processSteps.filter(step => step.status === 'completed').length;
  const totalSteps = processSteps.length;
  const progressPercentage = Math.round((completedSteps / totalSteps) * 100);
  const totalEstimatedTime = processSteps.reduce((total, step) => {
    const time = parseInt(step.estimatedTime?.split(' ')[0] || '0');
    return total + time;
  }, 0);

  if (isPreview) {
    return (
      <div className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center space-x-2 mb-2">
          <ClipboardDocumentListIcon className="w-5 h-5 text-amber-600" />
          <h3 className="font-medium text-gray-900">Setup Process</h3>
        </div>
        <p className="text-sm text-gray-600">
          Step-by-step Keeper Type creation and configuration process.
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
            <h3 className="text-lg font-semibold text-gray-900">Setup Process</h3>
            <p className="text-sm text-gray-600 mt-1">Complete these steps to create your Keeper Type</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-amber-600">{progressPercentage}%</div>
            <div className="text-xs text-gray-500">{completedSteps} of {totalSteps} complete</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <motion.div
              className="h-2 rounded-full bg-amber-600"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercentage}%` }}
              transition={{ duration: 1, delay: 0.3 }}
            />
          </div>
        </div>

        {/* Time Estimate */}
        <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
          <span>Estimated total time: {totalEstimatedTime} minutes</span>
          <span>Current step: {currentStep + 1} of {totalSteps}</span>
        </div>
      </div>

      {/* Steps List */}
      <div className="p-6">
        <div className="space-y-4">
          <AnimatePresence>
            {processSteps.map((step, index) => (
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
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="text-base font-medium text-gray-900">
                            {step.title}
                          </h4>
                          {step.isOptional && (
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                              Optional
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-3">
                          {step.description}
                        </p>
                        
                        {step.estimatedTime && (
                          <div className="flex items-center text-xs text-gray-500 mb-2">
                            <ClockIcon className="w-3 h-3 mr-1" />
                            <span>Estimated time: {step.estimatedTime}</span>
                          </div>
                        )}

                        {/* Requirements */}
                        {step.requirements && step.requirements.length > 0 && (
                          <div className="mt-2">
                            <h5 className="text-xs font-medium text-gray-700 mb-1">Requirements:</h5>
                            <ul className="text-xs text-gray-600 space-y-1">
                              {step.requirements.map((req, reqIndex) => (
                                <li key={reqIndex} className="flex items-center space-x-1">
                                  <div className="w-1 h-1 bg-gray-400 rounded-full flex-shrink-0" />
                                  <span>{req}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      {/* Action Button */}
                      {step.actionLabel && (
                        <button
                          onClick={() => handleStepAction(step)}
                          className={`ml-4 inline-flex items-center space-x-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                            step.status === 'current'
                              ? 'bg-amber-600 text-white hover:bg-amber-700'
                              : step.status === 'completed'
                              ? 'bg-green-100 text-green-700 hover:bg-green-200'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          <span>{step.actionLabel}</span>
                          <ArrowRightIcon className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Step Icon and Number */}
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200 border-opacity-50">
                      <div className="flex items-center space-x-2 text-gray-500">
                        {step.icon}
                        <span className="text-xs font-medium">Step {index + 1}</span>
                      </div>
                      
                      {step.status === 'current' && (
                        <div className="flex items-center space-x-1">
                          <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
                          <span className="text-xs text-amber-600 font-medium">In Progress</span>
                        </div>
                      )}

                      {step.status === 'completed' && (
                        <div className="flex items-center space-x-1">
                          <CheckCircleIcon className="w-4 h-4 text-green-500" />
                          <span className="text-xs text-green-600 font-medium">Completed</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <div className="mt-6 flex items-center justify-between">
          <button
            onClick={() => handleNavigation('previous')}
            disabled={currentStep === 0}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            <span>Previous Step</span>
          </button>

          <div className="flex items-center space-x-2">
            {processSteps.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={`w-3 h-3 rounded-full transition-colors ${
                  index === currentStep
                    ? 'bg-amber-600'
                    : index < currentStep
                    ? 'bg-green-500'
                    : 'bg-gray-300'
                }`}
              />
            ))}
          </div>

          <button
            onClick={() => handleNavigation('next')}
            disabled={currentStep === processSteps.length - 1}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <span>Next Step</span>
            <ArrowRightIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Need help? <a href="#" className="text-amber-600 hover:text-amber-700">View setup guide</a>
          </p>
          <div className="text-xs text-gray-500">
            {completedSteps === totalSteps ? 'Setup complete! 🎉' : `${totalSteps - completedSteps} steps remaining`}
          </div>
        </div>
      </div>
    </div>
  );
};

export default KeeperTypeProcessFrame;
