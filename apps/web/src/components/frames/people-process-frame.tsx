/**
 * People Process Frame
 * ====================
 * 
 * Process frame component for guided people onboarding and invitation workflows.
 * Shows step-by-step process for inviting and managing people.
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
  UserPlusIcon,
  EnvelopeIcon,
  ShieldCheckIcon,
  GlobeAltIcon,
  CheckIcon,
  XMarkIcon
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
  formFields?: FormField[];
}

interface FormField {
  id: string;
  type: 'text' | 'email' | 'select' | 'multiselect' | 'checkbox';
  label: string;
  placeholder?: string;
  required: boolean;
  options?: { value: string; label: string }[];
  value?: any;
}

const PeopleProcessFrame: React.FC<BaseFrameProps> = ({
  frameInstance,
  className = '',
  onInteraction,
  isPreview = false,
}) => {
  const { handleFrameInteraction } = useFrame();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<Record<string, any>>({});

  // Mock process steps data
  const [processSteps] = useState<ProcessStep[]>([
    {
      id: 'person-info',
      title: 'Person Information',
      description: 'Enter basic information for the person you want to invite',
      status: 'current',
      icon: <UserPlusIcon className="w-5 h-5" />,
      estimatedTime: '2 min',
      actionLabel: 'Continue',
      requirements: ['Valid email address', 'Full name'],
      formFields: [
        {
          id: 'fullName',
          type: 'text',
          label: 'Full Name',
          placeholder: 'Enter full name',
          required: true,
          value: formData.fullName || ''
        },
        {
          id: 'email',
          type: 'email',
          label: 'Email Address',
          placeholder: 'Enter email address',
          required: true,
          value: formData.email || ''
        },
        {
          id: 'title',
          type: 'text',
          label: 'Job Title',
          placeholder: 'Enter job title (optional)',
          required: false,
          value: formData.title || ''
        }
      ]
    },
    {
      id: 'role-assignment',
      title: 'Role Assignment',
      description: 'Select the appropriate role and permissions for this person',
      status: 'pending',
      icon: <ShieldCheckIcon className="w-5 h-5" />,
      estimatedTime: '1 min',
      actionLabel: 'Assign Role',
      requirements: ['Select role', 'Review permissions'],
      formFields: [
        {
          id: 'role',
          type: 'select',
          label: 'Role',
          required: true,
          options: [
            { value: 'viewer', label: 'Viewer - Read-only access' },
            { value: 'member', label: 'Member - Create and edit content' },
            { value: 'admin', label: 'Admin - Manage people and settings' }
          ],
          value: formData.role || ''
        },
        {
          id: 'customPermissions',
          type: 'checkbox',
          label: 'Enable custom permissions',
          required: false,
          value: formData.customPermissions || false
        }
      ]
    },
    {
      id: 'domain-access',
      title: 'Domain Access',
      description: 'Choose which domains this person should have access to',
      status: 'pending',
      icon: <GlobeAltIcon className="w-5 h-5" />,
      estimatedTime: '2 min',
      actionLabel: 'Set Access',
      requirements: ['Select at least one domain'],
      formFields: [
        {
          id: 'domains',
          type: 'multiselect',
          label: 'Domains',
          required: true,
          options: [
            { value: 'tech-domain', label: 'Tech Domain' },
            { value: 'marketing-domain', label: 'Marketing Domain' },
            { value: 'design-domain', label: 'Design Domain' },
            { value: 'sales-domain', label: 'Sales Domain' }
          ],
          value: formData.domains || []
        }
      ]
    },
    {
      id: 'invitation-message',
      title: 'Invitation Message',
      description: 'Customize the invitation message and send the invite',
      status: 'pending',
      icon: <EnvelopeIcon className="w-5 h-5" />,
      estimatedTime: '3 min',
      actionLabel: 'Send Invitation',
      requirements: ['Review message', 'Confirm details'],
      isOptional: false,
      formFields: [
        {
          id: 'message',
          type: 'text',
          label: 'Personal Message',
          placeholder: 'Add a personal message to the invitation (optional)',
          required: false,
          value: formData.message || ''
        },
        {
          id: 'sendWelcomeEmail',
          type: 'checkbox',
          label: 'Send welcome email with platform guide',
          required: false,
          value: formData.sendWelcomeEmail !== false
        },
        {
          id: 'notifyOnAccept',
          type: 'checkbox',
          label: 'Notify me when invitation is accepted',
          required: false,
          value: formData.notifyOnAccept !== false
        }
      ]
    },
    {
      id: 'confirmation',
      title: 'Confirmation',
      description: 'Review and confirm all details before sending the invitation',
      status: 'pending',
      icon: <CheckCircleIcon className="w-5 h-5" />,
      estimatedTime: '1 min',
      actionLabel: 'Send Invitation',
      requirements: ['Review all details', 'Confirm invitation']
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
        stepTitle: step.title,
        formData: formData
      },
      timestamp: new Date(),
    };
    
    handleFrameInteraction(interaction);
    onInteraction?.(interaction);
  };

  const handleNavigation = (direction: 'next' | 'previous') => {
    const newStep = direction === 'next' 
      ? Math.min(currentStep + 1, processSteps.length - 1)
      : Math.max(currentStep - 1, 0);
    
    setCurrentStep(newStep);
    
    const interaction = {
      type: 'click' as const,
      frameId: frameInstance.id,
      data: { action: `${direction}_step`, stepIndex: newStep, formData },
      timestamp: new Date(),
    };
    
    handleFrameInteraction(interaction);
    onInteraction?.(interaction);
  };

  const handleFieldChange = (fieldId: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));
  };

  const validateCurrentStep = () => {
    const currentStepData = processSteps[currentStep];
    if (!currentStepData.formFields) return true;

    return currentStepData.formFields.every(field => {
      if (!field.required) return true;
      const value = formData[field.id];
      
      if (field.type === 'multiselect') {
        return Array.isArray(value) && value.length > 0;
      }
      
      return value && value.toString().trim() !== '';
    });
  };

  const completedSteps = processSteps.filter(step => step.status === 'completed').length;
  const totalSteps = processSteps.length;
  const progressPercentage = Math.round((completedSteps / totalSteps) * 100);

  const renderFormField = (field: FormField) => {
    switch (field.type) {
      case 'text':
      case 'email':
        return (
          <input
            type={field.type}
            value={field.value || ''}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            required={field.required}
          />
        );
      
      case 'select':
        return (
          <select
            value={field.value || ''}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            required={field.required}
          >
            <option value="">Select an option</option>
            {field.options?.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );
      
      case 'multiselect':
        return (
          <div className="space-y-2">
            {field.options?.map(option => (
              <label key={option.value} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={(field.value || []).includes(option.value)}
                  onChange={(e) => {
                    const currentValues = field.value || [];
                    const newValues = e.target.checked
                      ? [...currentValues, option.value]
                      : currentValues.filter((v: string) => v !== option.value);
                    handleFieldChange(field.id, newValues);
                  }}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-900">{option.label}</span>
              </label>
            ))}
          </div>
        );
      
      case 'checkbox':
        return (
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={field.value || false}
              onChange={(e) => handleFieldChange(field.id, e.target.checked)}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <span className="text-sm text-gray-900">{field.label}</span>
          </label>
        );
      
      default:
        return null;
    }
  };

  if (isPreview) {
    return (
      <div className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center space-x-2 mb-2">
          <ClipboardDocumentListIcon className="w-5 h-5 text-indigo-600" />
          <h3 className="font-medium text-gray-900">People Process</h3>
        </div>
        <p className="text-sm text-gray-600">
          Guided workflow for onboarding and inviting people to the platform.
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
            <h3 className="text-lg font-semibold text-gray-900">Invite Person Process</h3>
            <p className="text-sm text-gray-600 mt-1">Complete these steps to invite someone to the platform</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-indigo-600">{progressPercentage}%</div>
            <div className="text-xs text-gray-500">{completedSteps} of {totalSteps} complete</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <motion.div
              className="h-2 rounded-full bg-indigo-600"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercentage}%` }}
              transition={{ duration: 1, delay: 0.3 }}
            />
          </div>
        </div>

        {/* Step Indicators */}
        <div className="mt-4 flex items-center justify-between">
          {processSteps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                  index === currentStep
                    ? 'bg-indigo-600 text-white'
                    : index < currentStep
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {index < currentStep ? <CheckIcon className="w-4 h-4" /> : index + 1}
              </div>
              {index < processSteps.length - 1 && (
                <div className={`w-8 h-0.5 ${index < currentStep ? 'bg-green-500' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Current Step Content */}
      <div className="p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {(() => {
              const step = processSteps[currentStep];
              
              if (step.id === 'confirmation') {
                return (
                  <div className="space-y-6">
                    <div className="text-center">
                      <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-4" />
                      <h4 className="text-xl font-semibold text-gray-900 mb-2">Review Invitation Details</h4>
                      <p className="text-gray-600">Please review all the information before sending the invitation.</p>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                      <div>
                        <h5 className="font-medium text-gray-900 mb-2">Person Information</h5>
                        <div className="text-sm text-gray-600 space-y-1">
                          <div><strong>Name:</strong> {formData.fullName || 'Not specified'}</div>
                          <div><strong>Email:</strong> {formData.email || 'Not specified'}</div>
                          <div><strong>Title:</strong> {formData.title || 'Not specified'}</div>
                        </div>
                      </div>

                      <div>
                        <h5 className="font-medium text-gray-900 mb-2">Role & Access</h5>
                        <div className="text-sm text-gray-600 space-y-1">
                          <div><strong>Role:</strong> {formData.role || 'Not assigned'}</div>
                          <div><strong>Domains:</strong> {(formData.domains || []).join(', ') || 'None selected'}</div>
                        </div>
                      </div>

                      {formData.message && (
                        <div>
                          <h5 className="font-medium text-gray-900 mb-2">Personal Message</h5>
                          <div className="text-sm text-gray-600 italic">"{formData.message}"</div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              }

              return (
                <div className="space-y-6">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 mt-1">
                      {getStatusIcon(step.status)}
                    </div>
                    <div className="flex-1">
                      <h4 className="text-lg font-semibold text-gray-900 mb-2">{step.title}</h4>
                      <p className="text-gray-600 mb-4">{step.description}</p>
                      
                      {step.estimatedTime && (
                        <div className="flex items-center text-sm text-gray-500 mb-4">
                          <ClockIcon className="w-4 h-4 mr-1" />
                          <span>Estimated time: {step.estimatedTime}</span>
                        </div>
                      )}

                      {step.requirements && (
                        <div className="mb-4">
                          <h5 className="text-sm font-medium text-gray-900 mb-2">Requirements:</h5>
                          <ul className="text-sm text-gray-600 space-y-1">
                            {step.requirements.map((req, index) => (
                              <li key={index} className="flex items-center space-x-2">
                                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full flex-shrink-0" />
                                <span>{req}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Form Fields */}
                  {step.formFields && (
                    <div className="space-y-4">
                      {step.formFields.map((field) => (
                        <div key={field.id}>
                          <label className="block text-sm font-medium text-gray-900 mb-1">
                            {field.label}
                            {field.required && <span className="text-red-500 ml-1">*</span>}
                          </label>
                          {field.type === 'checkbox' ? (
                            renderFormField(field)
                          ) : (
                            renderFormField(field)
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="mt-8 flex items-center justify-between">
          <button
            onClick={() => handleNavigation('previous')}
            disabled={currentStep === 0}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            <span>Previous</span>
          </button>

          <div className="text-sm text-gray-500">
            Step {currentStep + 1} of {processSteps.length}
          </div>

          <button
            onClick={() => {
              if (currentStep === processSteps.length - 1) {
                handleStepAction(processSteps[currentStep]);
              } else {
                handleNavigation('next');
              }
            }}
            disabled={!validateCurrentStep()}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <span>{currentStep === processSteps.length - 1 ? 'Send Invitation' : 'Next'}</span>
            <ArrowRightIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Need help? <a href="#" className="text-indigo-600 hover:text-indigo-700">View invitation guide</a>
          </p>
          <div className="text-xs text-gray-500">
            {currentStep === processSteps.length - 1 ? 'Ready to send invitation' : `${processSteps.length - currentStep - 1} steps remaining`}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PeopleProcessFrame;
