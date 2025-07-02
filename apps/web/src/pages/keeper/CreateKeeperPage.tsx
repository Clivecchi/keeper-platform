import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeftIcon,
  InformationCircleIcon,
  BookOpenIcon,
  BeakerIcon,
  AcademicCapIcon,
  BriefcaseIcon,
  HeartIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';

interface CreateKeeperForm {
  title: string;
  purpose: string;
  keeperType: string;
  memoryPattern: string;
  theme: string;
  isPublic: boolean;
}

const keeperTypes = [
  {
    id: 'journal',
    name: 'Personal Journal',
    description: 'Daily reflections, thoughts, and personal growth',
    icon: <BookOpenIcon className="w-5 h-5" />,
    emoji: '📖'
  },
  {
    id: 'project',
    name: 'Creative Project',
    description: 'Artistic endeavors, creative work, and inspiration',
    icon: <BeakerIcon className="w-5 h-5" />,
    emoji: '🎨'
  },
  {
    id: 'educational',
    name: 'Learning Journey',
    description: 'Educational content, research, and knowledge building',
    icon: <AcademicCapIcon className="w-5 h-5" />,
    emoji: '🎓'
  },
  {
    id: 'professional',
    name: 'Work & Career',
    description: 'Professional development, career insights, and work projects',
    icon: <BriefcaseIcon className="w-5 h-5" />,
    emoji: '💼'
  },
  {
    id: 'wellness',
    name: 'Health & Wellness',
    description: 'Physical health, mental wellness, and lifestyle tracking',
    icon: <HeartIcon className="w-5 h-5" />,
    emoji: '💚'
  },
  {
    id: 'custom',
    name: 'Custom',
    description: 'Define your own purpose and organization style',
    icon: <SparklesIcon className="w-5 h-5" />,
    emoji: '✨'
  }
];

const memoryPatterns = [
  {
    id: 'chronological',
    name: 'Chronological',
    description: 'Time-based organization with linear progression',
    emoji: '⏰',
    bestFor: 'Journals, daily logs, event tracking'
  },
  {
    id: 'associative',
    name: 'Associative',
    description: 'Connection-based with linked concepts and ideas',
    emoji: '🔗',
    bestFor: 'Creative work, brainstorming, research'
  },
  {
    id: 'hierarchical',
    name: 'Hierarchical',
    description: 'Structured organization with categories and subcategories',
    emoji: '🌳',
    bestFor: 'Learning, documentation, knowledge bases'
  },
  {
    id: 'spatial',
    name: 'Spatial',
    description: 'Location and context-based memory organization',
    emoji: '🗺️',
    bestFor: 'Travel, experiences, location-based memories'
  }
];

const themes = [
  { id: 'keeper-classic', name: 'Keeper Classic', preview: 'bg-stone-100' },
  { id: 'forest-deep', name: 'Forest Deep', preview: 'bg-green-100' },
  { id: 'ocean-calm', name: 'Ocean Calm', preview: 'bg-blue-100' },
  { id: 'sunset-warm', name: 'Sunset Warm', preview: 'bg-orange-100' },
  { id: 'midnight-elegant', name: 'Midnight Elegant', preview: 'bg-slate-100' }
];

const CreateKeeperPage: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<CreateKeeperForm>({
    title: '',
    purpose: '',
    keeperType: '',
    memoryPattern: '',
    theme: 'keeper-classic',
    isPublic: false
  });
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateFormData = (field: keyof CreateKeeperForm, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.purpose || !formData.keeperType || !formData.memoryPattern) {
      return;
    }

    setIsSubmitting(true);
    try {
      // Mock API call - replace with real implementation
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Navigate to the new keeper's dashboard
      navigate('/keeper/new-keeper-id/dashboard');
    } catch (error) {
      console.error('Error creating keeper:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedKeeperType = keeperTypes.find(type => type.id === formData.keeperType);
  const selectedMemoryPattern = memoryPatterns.find(pattern => pattern.id === formData.memoryPattern);

  return (
    <motion.div
      className="max-w-4xl mx-auto"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <div className="flex items-center space-x-4 mb-8">
        <button
          onClick={() => navigate('/keeper')}
          className="p-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeftIcon className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Create New Keeper</h1>
          <p className="text-muted-foreground">
            Set up your knowledge container and memory system
          </p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center mb-8">
        <div className="flex items-center space-x-4">
          {[1, 2, 3].map((step) => (
            <div key={step} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step <= currentStep 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-muted-foreground'
              }`}>
                {step}
              </div>
              {step < 3 && (
                <div className={`w-12 h-0.5 mx-2 ${
                  step < currentStep ? 'bg-primary' : 'bg-muted'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="space-y-8">
        {/* Step 1: Basic Information */}
        {currentStep === 1 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-xl font-semibold text-card-foreground mb-4">Basic Information</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Keeper Title
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => updateFormData('title', e.target.value)}
                    placeholder="My Personal Journal"
                    className="w-full px-4 py-2 border border-input rounded-lg bg-background text-foreground focus:ring-2 focus:ring-ring focus:border-ring"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Purpose & Description
                  </label>
                  <textarea
                    value={formData.purpose}
                    onChange={(e) => updateFormData('purpose', e.target.value)}
                    placeholder="Describe what this keeper will contain and how you plan to use it..."
                    rows={4}
                    className="w-full px-4 py-2 border border-input rounded-lg bg-background text-foreground focus:ring-2 focus:ring-ring focus:border-ring"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setCurrentStep(2)}
                disabled={!formData.title || !formData.purpose}
                className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next: Choose Type
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 2: Keeper Type & Memory Pattern */}
        {currentStep === 2 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            {/* Keeper Type Selection */}
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-xl font-semibold text-card-foreground mb-4">Keeper Type</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {keeperTypes.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => updateFormData('keeperType', type.id)}
                    className={`p-4 border rounded-lg text-left transition-all ${
                      formData.keeperType === type.id
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="text-2xl">{type.emoji}</span>
                      <h3 className="font-medium text-card-foreground">{type.name}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">{type.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Memory Pattern Selection */}
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-xl font-semibold text-card-foreground mb-4">Memory Pattern</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {memoryPatterns.map((pattern) => (
                  <button
                    key={pattern.id}
                    onClick={() => updateFormData('memoryPattern', pattern.id)}
                    className={`p-4 border rounded-lg text-left transition-all ${
                      formData.memoryPattern === pattern.id
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="text-2xl">{pattern.emoji}</span>
                      <h3 className="font-medium text-card-foreground">{pattern.name}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{pattern.description}</p>
                    <p className="text-xs text-muted-foreground">Best for: {pattern.bestFor}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => setCurrentStep(1)}
                className="px-6 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors"
              >
                Back
              </button>
              <button
                onClick={() => setCurrentStep(3)}
                disabled={!formData.keeperType || !formData.memoryPattern}
                className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next: Finalize
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 3: Theme & Settings */}
        {currentStep === 3 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            {/* Theme Selection */}
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-xl font-semibold text-card-foreground mb-4">Theme</h2>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {themes.map((theme) => (
                  <button
                    key={theme.id}
                    onClick={() => updateFormData('theme', theme.id)}
                    className={`p-4 border rounded-lg text-center transition-all ${
                      formData.theme === theme.id
                        ? 'border-primary shadow-sm'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className={`w-full h-12 rounded mb-2 ${theme.preview}`}></div>
                    <p className="text-sm font-medium text-card-foreground">{theme.name}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Settings */}
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-xl font-semibold text-card-foreground mb-4">Settings</h2>
              <div className="space-y-4">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={formData.isPublic}
                    onChange={(e) => updateFormData('isPublic', e.target.checked)}
                    className="w-4 h-4 text-primary border-border rounded focus:ring-2 focus:ring-ring"
                  />
                  <span className="text-sm text-foreground">Make this keeper publicly discoverable</span>
                </label>
                
                <div className="flex items-start space-x-2 p-3 bg-muted/50 rounded-lg">
                  <InformationCircleIcon className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    Public keepers can be discovered by other users, but your private content remains secure.
                  </p>
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-xl font-semibold text-card-foreground mb-4">Summary</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Title:</span>
                  <span className="font-medium text-foreground">{formData.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type:</span>
                  <span className="font-medium text-foreground">
                    {selectedKeeperType?.emoji} {selectedKeeperType?.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Memory Pattern:</span>
                  <span className="font-medium text-foreground">
                    {selectedMemoryPattern?.emoji} {selectedMemoryPattern?.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Visibility:</span>
                  <span className="font-medium text-foreground">
                    {formData.isPublic ? 'Public' : 'Private'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => setCurrentStep(2)}
                className="px-6 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? 'Creating Keeper...' : 'Create Keeper'}
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export default CreateKeeperPage;
