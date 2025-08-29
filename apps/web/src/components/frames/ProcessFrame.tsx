/**
 * Process Frame
 * =============
 * 
 * Frame component for step-based UI flows and wizard-like processes.
 * Supports multi-step workflows with progress tracking.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { BaseFrameProps } from '../../types/frame';
import { useFrame } from '../../context/FrameContext';

interface ProcessStep {
  id: string;
  title: string;
  description?: string;
  content: React.ReactNode;
  isComplete?: boolean;
  isOptional?: boolean;
  validation?: () => boolean;
}

interface ProcessFrameProps extends BaseFrameProps {
  steps?: ProcessStep[];
  currentStep?: number;
  onStepChange?: (stepIndex: number) => void;
  onComplete?: () => void;
  allowSkipSteps?: boolean;
}

const ProcessFrame: React.FC<ProcessFrameProps> = ({
  frameInstance,
  className = '',
  onInteraction,
  isPreview = false,
  steps = [],
  currentStep = 0,
  onStepChange,
  onComplete,
  allowSkipSteps = false,
}) => {
  const { handleFrameInteraction } = useFrame();
  const [activeStep, setActiveStep] = useState(currentStep);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(false);

  // Default steps if none provided
  const defaultSteps: ProcessStep[] = [
    {
      id: 'step1',
      title: 'Getting Started',
      description: 'Initial configuration and setup',
      content: (
        <div className="space-y-4">
          <p className="text-gray-600">Welcome to the setup process.</p>
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-800">
              This is a sample process frame. Replace with your actual content.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'step2',
      title: 'Configuration',
      description: 'Set up your preferences',
      content: (
        <div className="space-y-4">
          <p className="text-gray-600">Configure your settings here.</p>
          <div className="space-y-2">
            <label className="flex items-center">
              <input type="checkbox" className="mr-2" />
              <span className="text-sm">Enable notifications</span>
            </label>
            <label className="flex items-center">
              <input type="checkbox" className="mr-2" />
              <span className="text-sm">Auto-save changes</span>
            </label>
          </div>
        </div>
      )
    },
    {
      id: 'step3',
      title: 'Review',
      description: 'Confirm your settings',
      content: (
        <div className="space-y-4">
          <p className="text-gray-600">Review your configuration before completing.</p>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">Summary</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Initial setup completed</li>
              <li>• Configuration applied</li>
              <li>• Ready to proceed</li>
            </ul>
          </div>
        </div>
      )
    }
  ];

  const displaySteps = steps.length > 0 ? steps : defaultSteps;
  const canGoNext = activeStep < displaySteps.length - 1;
  const canGoPrevious = activeStep > 0;
  const isLastStep = activeStep === displaySteps.length - 1;

  const handleNext = async () => {
    const currentStepData = displaySteps[activeStep];
    
    // Validate current step if validation function exists
    if (currentStepData.validation && !currentStepData.validation()) {
      return;
    }

    setIsLoading(true);

    try {
      // Mark current step as completed
      setCompletedSteps(prev => new Set([...prev, activeStep]));

      // Handle interaction
      handleFrameInteraction({
        type: 'navigate',
        frameId: frameInstance.id,
        data: { action: 'next_step', fromStep: activeStep, toStep: activeStep + 1 },
        timestamp: new Date(),
      });

      if (isLastStep) {
        // Complete the process
        onComplete?.();
        handleFrameInteraction({
          type: 'submit',
          frameId: frameInstance.id,
          data: { action: 'process_complete' },
          timestamp: new Date(),
        });
      } else {
        // Move to next step
        const nextStep = activeStep + 1;
        setActiveStep(nextStep);
        onStepChange?.(nextStep);
      }
    } catch (error) {
      console.error('Error proceeding to next step:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrevious = () => {
    if (canGoPrevious) {
      const prevStep = activeStep - 1;
      setActiveStep(prevStep);
      onStepChange?.(prevStep);
      
      handleFrameInteraction({
        type: 'navigate',
        frameId: frameInstance.id,
        data: { action: 'previous_step', fromStep: activeStep, toStep: prevStep },
        timestamp: new Date(),
      });
    }
  };

  const handleStepClick = (stepIndex: number) => {
    if (!allowSkipSteps && stepIndex > activeStep) {
      return; // Can't skip ahead
    }

    setActiveStep(stepIndex);
    onStepChange?.(stepIndex);
    
    handleFrameInteraction({
      type: 'click',
      frameId: frameInstance.id,
      data: { action: 'jump_to_step', step: stepIndex },
      timestamp: new Date(),
    });
  };

  if (isPreview) {
    return (
      <div className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center space-x-2 mb-2">
          <ClockIcon className="w-5 h-5 text-blue-600" />
          <h3 className="font-medium text-gray-900">Process Frame</h3>
        </div>
        <p className="text-sm text-gray-600">
          Step-based workflow interface with progress tracking.
        </p>
        <div className="mt-3 flex space-x-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`w-8 h-2 rounded-full ${
                i === 0 ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg overflow-hidden ${className}`}>
      {/* Header with Progress */}
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-gray-900">
            {frameInstance.FrameConfig?.name || 'Process Workflow'}
          </h3>
          <span className="text-sm text-gray-500">
            Step {activeStep + 1} of {displaySteps.length}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="relative">
          <div className="flex items-center">
            {displaySteps.map((step, index) => (
              <React.Fragment key={step.id}>
                <button
                  onClick={() => handleStepClick(index)}
                  disabled={!allowSkipSteps && index > activeStep}
                  className={`relative flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors ${
                    completedSteps.has(index)
                      ? 'bg-green-500 border-green-500 text-white'
                      : index === activeStep
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : index < activeStep || allowSkipSteps
                      ? 'border-gray-300 text-gray-500 hover:border-gray-400'
                      : 'border-gray-200 text-gray-300 cursor-not-allowed'
                  }`}
                >
                  {completedSteps.has(index) ? (
                    <CheckIcon className="w-4 h-4" />
                  ) : (
                    <span className="text-sm font-medium">{index + 1}</span>
                  )}
                </button>
                
                {index < displaySteps.length - 1 && (
                  <div
                    className={`flex-1 h-1 mx-2 rounded-full transition-colors ${
                      index < activeStep ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Step Labels */}
        <div className="flex justify-between mt-2">
          {displaySteps.map((step, index) => (
            <div
              key={step.id}
              className={`text-xs text-center ${
                index === activeStep ? 'text-blue-600 font-medium' : 'text-gray-500'
              }`}
              style={{ width: `${100 / displaySteps.length}%` }}
            >
              {step.title}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                {displaySteps[activeStep].title}
              </h2>
              {displaySteps[activeStep].description && (
                <p className="text-gray-600">
                  {displaySteps[activeStep].description}
                </p>
              )}
            </div>
            
            <div className="min-h-[200px]">
              {displaySteps[activeStep].content}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
        <button
          onClick={handlePrevious}
          disabled={!canGoPrevious || isLoading}
          className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          <span>Previous</span>
        </button>

        <div className="flex items-center space-x-2">
          {displaySteps[activeStep].isOptional && (
            <button
              onClick={handleNext}
              disabled={isLoading}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50 transition-colors"
            >
              Skip
            </button>
          )}
          
          <button
            onClick={handleNext}
            disabled={isLoading}
            className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <span>{isLastStep ? 'Complete' : 'Next'}</span>
                {!isLastStep && <ArrowRightIcon className="w-4 h-4" />}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProcessFrame;
