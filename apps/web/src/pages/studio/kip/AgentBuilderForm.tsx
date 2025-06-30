import React, { useState, useEffect } from 'react';
import { KipApi, AgentInput, KipAgent, AgentClass, ModelProvider, ModelSettings } from '../../../lib/kipApi';
import { AgentVisibility } from '../../../types/kip';
import HelpTooltip from '../../../components/ui/HelpTooltip';

interface AgentBuilderFormProps {
  onAgentCreated: (agent: KipAgent) => void;
  onAgentUpdated?: (agent: KipAgent) => void;
  existingAgent?: KipAgent | null;
  mode?: 'create' | 'edit';
}

const AgentBuilderForm: React.FC<AgentBuilderFormProps> = ({ 
  onAgentCreated, 
  onAgentUpdated, 
  existingAgent = null, 
  mode = 'create' 
}) => {
  const [formData, setFormData] = useState<AgentInput>({
    name: '',
    slug: '',
    purpose: '',
    model: 'gpt-4o',
    agent_class: 'Standard',
    context_scope: 'user_input',
    memory_enabled: false,
    tools: [],
    permissions: [],
    config: {},
    status: 'ready',
    model_provider: 'openai',
    model_settings: KipApi.getDefaultSettings('openai'),
    visibility: 'private'
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [toolsInput, setToolsInput] = useState('');
  const [permissionsInput, setPermissionsInput] = useState('');
  const [availableAgents, setAvailableAgents] = useState<KipAgent[]>([]);
  const [selectedBundleAgents, setSelectedBundleAgents] = useState<string[]>([]);

  const providerOptions = [
    { value: 'openai' as ModelProvider, label: 'OpenAI', description: 'GPT models (GPT-4o, GPT-4 Turbo, etc.)' },
    { value: 'anthropic' as ModelProvider, label: 'Anthropic', description: 'Claude models (Claude 3.5 Sonnet, etc.)' },
    { value: 'together' as ModelProvider, label: 'Together AI', description: 'Llama and Mixtral models' },
    { value: 'elevenlabs' as ModelProvider, label: 'ElevenLabs', description: 'Voice synthesis models' }
  ];

  // Get available models for the selected provider
  const getAvailableModels = (provider: ModelProvider) => {
    return KipApi.getAvailableModels(provider).map(model => ({
      value: model,
      label: model.replace(/^(gpt-|claude-|meta-llama\/|mistralai\/|eleven_)/, '').replace(/-|_/g, ' ').toUpperCase()
    }));
  };

  const contextScopeOptions = [
    { value: 'user_input', label: 'User Input' },
    { value: 'keeper', label: 'Keeper' },
    { value: 'codebase', label: 'Codebase' },
    { value: 'platform_wide', label: 'Platform' },
    { value: 'system', label: 'System' }
  ];

  const agentClassOptions = [
    { value: 'Standard' as AgentClass, label: 'Standard', description: 'Regular agent with specific capabilities' },
    { value: 'Coordinator' as AgentClass, label: 'Coordinator', description: 'Orchestrates multiple agents' },
    { value: 'Lead' as AgentClass, label: 'Lead', description: 'Standalone AI interface with chat experience' },
    { value: 'Persona' as AgentClass, label: 'Persona', description: 'Coming soon...' }
  ];

  // Load available agents for coordinator bundling
  useEffect(() => {
    const loadAgents = async () => {
      try {
        const agents = await KipApi.getAllAgents();
        setAvailableAgents(agents);
      } catch (error) {
        console.error('Failed to load agents:', error);
      }
    };
    loadAgents();
  }, []);

  // Populate form data when editing an existing agent
  useEffect(() => {
    if (mode === 'edit' && existingAgent) {
      console.log('🔧 Editing agent:', existingAgent.name, existingAgent);
      setFormData({
        name: existingAgent.name,
        slug: existingAgent.slug,
        purpose: existingAgent.purpose,
        model: existingAgent.model,
        agent_class: existingAgent.agent_class,
        context_scope: existingAgent.context_scope || 'user_input',
        memory_enabled: existingAgent.memory_enabled,
        tools: existingAgent.tools,
        permissions: existingAgent.permissions,
        config: existingAgent.config,
        status: existingAgent.status,
        model_provider: existingAgent.model_provider,
        model_settings: existingAgent.model_settings,
        visibility: existingAgent.visibility || 'private'
      });
      setToolsInput(existingAgent.tools.join(', '));
      setPermissionsInput(existingAgent.permissions.join(', '));
      if (existingAgent.config?.bundle) {
        setSelectedBundleAgents(existingAgent.config.bundle);
      }
      console.log('✅ Form data populated for editing');
    }
  }, [mode, existingAgent]);

  const handleInputChange = (field: keyof AgentInput, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Auto-generate slug from name (only in create mode)
    if (field === 'name' && typeof value === 'string' && mode === 'create') {
      const slug = value
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
      setFormData(prev => ({
        ...prev,
        slug: slug
      }));
    }
  };

  const parseTagsInput = (input: string): string[] => {
    return input
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      // Parse tools and permissions from input strings
      const tools = parseTagsInput(toolsInput);
      const permissions = parseTagsInput(permissionsInput);

      // Prepare config based on agent class
      let config = {
        max_tokens: 4000,
        temperature: 0.1,
        ...formData.config
      };

      // Add bundle configuration for Coordinator agents
      if (formData.agent_class === 'Coordinator') {
        config.bundle = selectedBundleAgents;
      }

      const agentData: AgentInput = {
        ...formData,
        tools,
        permissions,
        config
      };

      let result: KipAgent;
      if (mode === 'edit' && existingAgent) {
        result = await KipApi.updateAgent(existingAgent.id, agentData);
        setSuccess(`Agent "${result.name}" updated successfully!`);
        onAgentUpdated?.(result);
      } else {
        result = await KipApi.createAgent(agentData);
        setSuccess(`Agent "${result.name}" created successfully!`);
        onAgentCreated(result);
        
        // Reset form only for create mode
        setFormData({
          name: '',
          slug: '',
          purpose: '',
          model: 'gpt-4o',
          agent_class: 'Standard',
          context_scope: 'user_input',
          memory_enabled: false,
          tools: [],
          permissions: [],
          config: {},
          status: 'ready',
          model_provider: 'openai',
          model_settings: KipApi.getDefaultSettings('openai'),
          visibility: 'private'
        });
        setToolsInput('');
        setPermissionsInput('');
        setSelectedBundleAgents([]);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${mode} agent`);
      console.error(`Error ${mode}ing agent:`, err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Edit Mode Indicator */}
      {mode === 'edit' && existingAgent && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
          <div className="flex items-center gap-2">
            <span className="text-blue-600">✏️</span>
            <p className="text-sm text-blue-700">
              <strong>Editing Agent:</strong> {existingAgent.name} ({existingAgent.slug})
            </p>
          </div>
          <p className="text-xs text-blue-600 mt-1">
            Make your changes below and click "Update Agent" to save.
          </p>
        </div>
      )}

      {/* Success/Error Messages */}
      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-md">
          <p className="text-sm text-green-600">{success}</p>
        </div>
      )}
      
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Name Field */}
        <div>
          <label htmlFor="name" className="flex items-center gap-1 text-sm font-medium text-foreground mb-2">
            Agent Name *
            <HelpTooltip content="A friendly name for your agent, like 'Code Whisperer' or 'Research Assistant'. This is displayed in the UI and helps identify the agent's purpose." />
          </label>
          <input
            type="text"
            id="name"
            required
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:ring-1 focus:ring-ring focus:border-ring"
            placeholder="e.g., DocumentAgent, CodeReviewAgent"
          />
        </div>

        {/* Slug Field */}
        <div>
          <label htmlFor="slug" className="flex items-center gap-1 text-sm font-medium text-foreground mb-2">
            Slug *
            <HelpTooltip content="A short, unique identifier used in URLs and API calls. E.g., 'code-whisperer' becomes /agents/code-whisperer. Only lowercase letters, numbers, and hyphens allowed." />
          </label>
          <input
            type="text"
            id="slug"
            required
            value={formData.slug}
            onChange={(e) => handleInputChange('slug', e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:ring-1 focus:ring-ring focus:border-ring"
            placeholder="Auto-generated from name"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Unique identifier (auto-generated from name)
          </p>
        </div>

        {/* Model Provider Field */}
        <div>
          <label htmlFor="model_provider" className="flex items-center gap-1 text-sm font-medium text-foreground mb-2">
            Model Provider *
            <HelpTooltip content="Choose the AI company that will power this agent. OpenAI offers GPT models, Anthropic provides Claude, Together AI has open-source models, and ElevenLabs specializes in voice synthesis." />
          </label>
          <select
            id="model_provider"
            required
            value={formData.model_provider}
            onChange={(e) => {
              const provider = e.target.value as ModelProvider;
              const defaultSettings = KipApi.getDefaultSettings(provider);
              handleInputChange('model_provider', provider);
              handleInputChange('model_settings', defaultSettings);
              handleInputChange('model', defaultSettings.model);
            }}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:ring-1 focus:ring-ring focus:border-ring"
          >
            {providerOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground mt-1">
            {providerOptions.find(opt => opt.value === formData.model_provider)?.description}
          </p>
        </div>

        {/* Model Field */}
        <div>
          <label htmlFor="model" className="flex items-center gap-1 text-sm font-medium text-foreground mb-2">
            Model *
            <HelpTooltip content="The specific AI model this agent will use for responses. Different models vary in cost, speed, and accuracy. For example, GPT-4o is great for general reasoning, while Claude excels at analysis." />
          </label>
          <select
            id="model"
            required
            value={formData.model}
            onChange={(e) => {
              const model = e.target.value;
              handleInputChange('model', model);
              // Update model settings with the new model
              const updatedSettings = { ...formData.model_settings!, model };
              handleInputChange('model_settings', updatedSettings);
            }}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:ring-1 focus:ring-ring focus:border-ring"
          >
            {getAvailableModels(formData.model_provider!).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Agent Class Field */}
        <div>
          <label htmlFor="agent_class" className="flex items-center gap-1 text-sm font-medium text-foreground mb-2">
            Agent Class *
            <HelpTooltip content="Standard agents handle specific tasks. Coordinators can bundle multiple agents together. Lead agents are front-end assistants like Kip that users chat with directly." />
          </label>
          <select
            id="agent_class"
            required
            value={formData.agent_class}
            onChange={(e) => handleInputChange('agent_class', e.target.value as AgentClass)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:ring-1 focus:ring-ring focus:border-ring"
          >
            {agentClassOptions.map((option) => (
              <option key={option.value} value={option.value} disabled={option.value === 'Persona'}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground mt-1">
            {agentClassOptions.find(opt => opt.value === formData.agent_class)?.description}
          </p>
        </div>

        {/* Context Scope Field */}
        <div>
          <label htmlFor="context_scope" className="flex items-center gap-1 text-sm font-medium text-foreground mb-2">
            Context Scope *
            <HelpTooltip content="Defines what kind of information the agent should consider. User Input focuses on conversations, Keeper includes platform data, Codebase gives access to code, Platform covers system-wide info." />
          </label>
          <select
            id="context_scope"
            required
            value={formData.context_scope}
            onChange={(e) => handleInputChange('context_scope', e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:ring-1 focus:ring-ring focus:border-ring"
          >
            {contextScopeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Purpose Field */}
      <div>
        <label htmlFor="purpose" className="flex items-center gap-1 text-sm font-medium text-foreground mb-2">
          Purpose *
          <HelpTooltip content="Describe what this agent is designed to do. Be specific about its role, capabilities, and the types of tasks it should handle. This helps the AI understand its identity." />
        </label>
        <textarea
          id="purpose"
          required
          rows={3}
          value={formData.purpose}
          onChange={(e) => handleInputChange('purpose', e.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:ring-1 focus:ring-ring focus:border-ring"
          placeholder="Describe what this agent does and its primary function..."
        />
      </div>

      {/* Tools Field */}
      <div>
        <label htmlFor="tools" className="flex items-center gap-1 text-sm font-medium text-foreground mb-2">
          Tools (Optional)
          <HelpTooltip content="External capabilities or APIs the agent can call, such as calendar tools, document search, code execution, or web browsing. Separate multiple tools with commas." />
        </label>
        <input
          type="text"
          id="tools"
          value={toolsInput}
          onChange={(e) => setToolsInput(e.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:ring-1 focus:ring-ring focus:border-ring"
          placeholder="text_analysis, code_generation, file_operations (comma-separated)"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Comma-separated list of tools this agent can use
        </p>
      </div>

      {/* Permissions Field */}
      <div>
        <label htmlFor="permissions" className="flex items-center gap-1 text-sm font-medium text-foreground mb-2">
          Permissions (Optional)
          <HelpTooltip content="What resources the agent is allowed to access or control, such as reading files, writing data, executing code, or accessing user information. Define security boundaries here." />
        </label>
        <input
          type="text"
          id="permissions"
          value={permissionsInput}
          onChange={(e) => setPermissionsInput(e.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:ring-1 focus:ring-ring focus:border-ring"
          placeholder="read_files, write_files, execute_code (comma-separated)"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Comma-separated list of permissions this agent needs
        </p>
      </div>

      {/* Coordinator Bundle Selection */}
      {formData.agent_class === 'Coordinator' && (
        <div>
          <label className="flex items-center gap-1 text-sm font-medium text-foreground mb-2">
            Agent Bundle (Required for Coordinators)
            <HelpTooltip content="Select which agents this coordinator will manage and orchestrate. Coordinators can bundle multiple agents together to handle complex workflows by delegating tasks to the appropriate specialist agents." />
          </label>
          <div className="space-y-2 max-h-40 overflow-y-auto border border-input rounded-md p-3 bg-background">
            {availableAgents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No agents available for bundling</p>
            ) : (
              availableAgents.map((agent) => (
                <div key={agent.id} className="flex items-center">
                  <input
                    type="checkbox"
                    id={`bundle-${agent.id}`}
                    checked={selectedBundleAgents.includes(agent.slug)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedBundleAgents(prev => [...prev, agent.slug]);
                      } else {
                        setSelectedBundleAgents(prev => prev.filter(slug => slug !== agent.slug));
                      }
                    }}
                    className="h-4 w-4 text-primary focus:ring-ring border-gray-300 rounded"
                  />
                  <label htmlFor={`bundle-${agent.id}`} className="ml-2 text-sm text-foreground">
                    <span className="font-medium">{agent.name}</span> 
                    <span className="text-muted-foreground ml-1">({agent.slug})</span>
                  </label>
                </div>
              ))
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Select agents that this coordinator will orchestrate. Selected: {selectedBundleAgents.length}
          </p>
        </div>
      )}

      {/* Model Configuration Section */}
      <div className="border border-input rounded-lg p-4 space-y-4">
        <h3 className="text-lg font-medium text-foreground border-b border-input pb-2">
          Model Configuration
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Temperature */}
          <div>
            <label htmlFor="temperature" className="flex items-center gap-1 text-sm font-medium text-foreground mb-2">
              Temperature
              <HelpTooltip content="Controls creativity and randomness. 0 is precise and predictable, 1 is creative and exploratory, 2 is very random. Use lower values for factual tasks, higher for creative work." />
            </label>
            <input
              type="number"
              id="temperature"
              min="0"
              max="2"
              step="0.1"
              value={formData.model_settings?.temperature || 0.7}
              onChange={(e) => {
                const updatedSettings = { 
                  ...formData.model_settings!, 
                  temperature: parseFloat(e.target.value) 
                };
                handleInputChange('model_settings', updatedSettings);
              }}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:ring-1 focus:ring-ring focus:border-ring"
              placeholder="0.7"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Controls randomness (0.0 = deterministic, 2.0 = very creative)
            </p>
          </div>

          {/* Max Tokens */}
          <div>
            <label htmlFor="max_tokens" className="flex items-center gap-1 text-sm font-medium text-foreground mb-2">
              Max Tokens
              <HelpTooltip content="The maximum length of the agent's response. Higher numbers allow longer replies but cost more. Roughly 4 characters per token. 2000 tokens ≈ 1500 words." />
            </label>
            <input
              type="number"
              id="max_tokens"
              min="1"
              max="32000"
              value={formData.model_settings?.max_tokens || 2000}
              onChange={(e) => {
                const updatedSettings = { 
                  ...formData.model_settings!, 
                  max_tokens: parseInt(e.target.value) 
                };
                handleInputChange('model_settings', updatedSettings);
              }}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:ring-1 focus:ring-ring focus:border-ring"
              placeholder="2000"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Maximum response length
            </p>
          </div>

          {/* Top P (for OpenAI) */}
          {formData.model_provider === 'openai' && (
            <div>
              <label htmlFor="top_p" className="flex items-center gap-1 text-sm font-medium text-foreground mb-2">
                Top P
                <HelpTooltip content="An alternative to temperature that controls randomness via probability mass. 1.0 considers all tokens, 0.1 only the most likely 10%. Lower values make responses more focused." />
              </label>
              <input
                type="number"
                id="top_p"
                min="0"
                max="1"
                step="0.1"
                value={formData.model_settings?.top_p || 1.0}
                onChange={(e) => {
                  const updatedSettings = { 
                    ...formData.model_settings!, 
                    top_p: parseFloat(e.target.value) 
                  };
                  handleInputChange('model_settings', updatedSettings);
                }}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:ring-1 focus:ring-ring focus:border-ring"
                placeholder="1.0"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Nucleus sampling parameter
              </p>
            </div>
          )}

          {/* Frequency Penalty (for OpenAI) */}
          {formData.model_provider === 'openai' && (
            <div>
              <label htmlFor="frequency_penalty" className="flex items-center gap-1 text-sm font-medium text-foreground mb-2">
                Frequency Penalty
                <HelpTooltip content="Reduces repetition of words and phrases. Positive values (0.1-1.0) discourage repetition, negative values encourage it. Use 0.1-0.3 for most cases." />
              </label>
              <input
                type="number"
                id="frequency_penalty"
                min="-2"
                max="2"
                step="0.1"
                value={formData.model_settings?.frequency_penalty || 0}
                onChange={(e) => {
                  const updatedSettings = { 
                    ...formData.model_settings!, 
                    frequency_penalty: parseFloat(e.target.value) 
                  };
                  handleInputChange('model_settings', updatedSettings);
                }}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:ring-1 focus:ring-ring focus:border-ring"
                placeholder="0"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Reduces repetition (-2.0 to 2.0)
              </p>
            </div>
          )}

          {/* Presence Penalty (for OpenAI) */}
          {formData.model_provider === 'openai' && (
            <div>
              <label htmlFor="presence_penalty" className="flex items-center gap-1 text-sm font-medium text-foreground mb-2">
                Presence Penalty
                <HelpTooltip content="Encourages the model to talk about new topics. Positive values increase likelihood of new topics, negative values encourage staying on topic. Use 0.1-0.6 for variety." />
              </label>
              <input
                type="number"
                id="presence_penalty"
                min="-2"
                max="2"
                step="0.1"
                value={formData.model_settings?.presence_penalty || 0}
                onChange={(e) => {
                  const updatedSettings = { 
                    ...formData.model_settings!, 
                    presence_penalty: parseFloat(e.target.value) 
                  };
                  handleInputChange('model_settings', updatedSettings);
                }}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:ring-1 focus:ring-ring focus:border-ring"
                placeholder="0"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Encourages new topics (-2.0 to 2.0)
              </p>
            </div>
          )}
        </div>

        {/* Retry Configuration */}
        <div className="border-t border-input pt-4">
          <h4 className="text-md font-medium text-foreground mb-3">Retry Configuration</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="max_retries" className="flex items-center gap-1 text-sm font-medium text-foreground mb-2">
                Max Retries
                <HelpTooltip content="How many times the agent will retry if a request fails. Useful for handling temporary API issues. 3-5 retries is usually sufficient for most cases." />
              </label>
              <input
                type="number"
                id="max_retries"
                min="0"
                max="10"
                value={formData.model_settings?.retry?.max_retries || 3}
                onChange={(e) => {
                  const updatedSettings = { 
                    ...formData.model_settings!, 
                    retry: {
                      ...formData.model_settings?.retry!,
                      max_retries: parseInt(e.target.value)
                    }
                  };
                  handleInputChange('model_settings', updatedSettings);
                }}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:ring-1 focus:ring-ring focus:border-ring"
                placeholder="3"
              />
            </div>

            <div>
              <label htmlFor="retry_delay_ms" className="flex items-center gap-1 text-sm font-medium text-foreground mb-2">
                Retry Delay (ms)
                <HelpTooltip content="Time to wait between retry attempts in milliseconds. Longer delays help avoid rate limits but slow down responses. 1000ms (1 second) is a good default." />
              </label>
              <input
                type="number"
                id="retry_delay_ms"
                min="100"
                max="10000"
                step="100"
                value={formData.model_settings?.retry?.retry_delay_ms || 1000}
                onChange={(e) => {
                  const updatedSettings = { 
                    ...formData.model_settings!, 
                    retry: {
                      ...formData.model_settings?.retry!,
                      retry_delay_ms: parseInt(e.target.value)
                    }
                  };
                  handleInputChange('model_settings', updatedSettings);
                }}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:ring-1 focus:ring-ring focus:border-ring"
                placeholder="1000"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Visibility & Sharing Configuration */}
      <div className="border border-input rounded-lg p-4 space-y-4">
        <h3 className="text-lg font-medium text-foreground border-b border-input pb-2">
          Visibility & Sharing
        </h3>
        
        <div>
          <label htmlFor="visibility" className="flex items-center gap-1 text-sm font-medium text-foreground mb-2">
            Visibility *
            <HelpTooltip content="Private: Only you can see and use this agent. Public: Anyone can run this agent but not edit it. Shared: You can grant specific permissions to other users." />
          </label>
          <select
            id="visibility"
            required
            value={formData.visibility}
            onChange={(e) => handleInputChange('visibility', e.target.value as AgentVisibility)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:ring-1 focus:ring-ring focus:border-ring"
          >
            <option value="private">🔒 Private - Only you can access</option>
            <option value="public">🌍 Public - Anyone can run</option>
            <option value="shared">👥 Shared - Grant specific permissions</option>
          </select>
          <div className="mt-2 text-xs text-muted-foreground">
            {formData.visibility === 'private' && 
              'This agent will only be visible to you and can only be run by you.'
            }
            {formData.visibility === 'public' && 
              'This agent will be visible to all users and anyone can run it, but only you can edit it.'
            }
            {formData.visibility === 'shared' && 
              'You can manually grant specific users permission to run, edit, or manage this agent.'
            }
          </div>
        </div>

        {formData.visibility === 'shared' && (
          <div className="bg-muted/50 rounded-md p-3">
            <p className="text-sm text-muted-foreground mb-2">
              <strong>Note:</strong> Shared agent permissions will be configured after creation in the agent management interface.
            </p>
            <p className="text-xs text-muted-foreground">
              You'll be able to grant specific users permissions to:
            </p>
            <ul className="text-xs text-muted-foreground mt-1 ml-4">
              <li>• <strong>Run:</strong> Execute the agent</li>
              <li>• <strong>Edit:</strong> Modify agent settings</li>
              <li>• <strong>Share:</strong> Grant permissions to others</li>
              <li>• <strong>Delete:</strong> Remove the agent</li>
            </ul>
          </div>
        )}
      </div>

      {/* Memory Enabled Checkbox */}
      <div className="flex items-center">
        <input
          type="checkbox"
          id="memory_enabled"
          checked={formData.memory_enabled}
          onChange={(e) => handleInputChange('memory_enabled', e.target.checked)}
          className="h-4 w-4 text-primary focus:ring-ring border-gray-300 rounded"
        />
        <label htmlFor="memory_enabled" className="flex items-center gap-1 ml-2 text-sm text-foreground">
          Enable Memory
          <HelpTooltip content="If enabled, the agent will remember previous messages in a session and maintain conversation context. This creates a more natural chat experience but uses more tokens." />
        </label>
        <p className="ml-2 text-xs text-muted-foreground">
          Allow this agent to retain context across conversations
        </p>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting || !formData.name || !formData.slug || !formData.purpose}
          className="px-6 py-2 bg-primary hover:bg-primary/90 disabled:bg-primary/50 text-primary-foreground rounded-md transition-colors"
        >
          {isSubmitting ? 
            (mode === 'edit' ? 'Updating Agent...' : 'Creating Agent...') : 
            (mode === 'edit' ? 'Update Agent' : 'Create Agent')
          }
        </button>
      </div>
    </form>
  );
};

export default AgentBuilderForm; 