# Help Tooltips Implementation

## 📌 Overview

Part 2 implements comprehensive help tooltips for all form fields in Kip Studio, providing contextual guidance to users when creating and configuring agents.

## 🧱 Components

### HelpTooltip Component

**Location**: `apps/web/src/components/ui/HelpTooltip.tsx`

**Features:**
- Hover and click activation
- Configurable positioning (top, bottom, left, right)
- Responsive design with arrow indicators
- Accessible with proper ARIA labels
- Consistent styling with Tailwind CSS

**Usage Pattern:**
```tsx
<label className="flex items-center gap-1 text-sm font-medium text-foreground mb-2">
  Field Name
  <HelpTooltip content="Helpful explanation of what this field does and how to use it effectively." />
</label>
```

## 📝 Field Tooltips Implemented

### AgentBuilderForm

All fields in the Agent Builder Form now include helpful tooltips:

| Field | Tooltip Content |
|-------|----------------|
| **Agent Name** | A friendly name for your agent, like 'Code Whisperer' or 'Research Assistant'. This is displayed in the UI and helps identify the agent's purpose. |
| **Slug** | A short, unique identifier used in URLs and API calls. E.g., 'code-whisperer' becomes /agents/code-whisperer. Only lowercase letters, numbers, and hyphens allowed. |
| **Model Provider** | Choose the AI company that will power this agent. OpenAI offers GPT models, Anthropic provides Claude, Together AI has open-source models, and ElevenLabs specializes in voice synthesis. |
| **Model** | The specific AI model this agent will use for responses. Different models vary in cost, speed, and accuracy. For example, GPT-4o is great for general reasoning, while Claude excels at analysis. |
| **Agent Class** | Standard agents handle specific tasks. Coordinators can bundle multiple agents together. Lead agents are front-end assistants like Kip that users chat with directly. |
| **Context Scope** | Defines what kind of information the agent should consider. User Input focuses on conversations, Keeper includes platform data, Codebase gives access to code, Platform covers system-wide info. |
| **Purpose** | Describe what this agent is designed to do. Be specific about its role, capabilities, and the types of tasks it should handle. This helps the AI understand its identity. |
| **Tools** | External capabilities or APIs the agent can call, such as calendar tools, document search, code execution, or web browsing. Separate multiple tools with commas. |
| **Permissions** | What resources the agent is allowed to access or control, such as reading files, writing data, executing code, or accessing user information. Define security boundaries here. |
| **Agent Bundle** | Select which agents this coordinator will manage and orchestrate. Coordinators can bundle multiple agents together to handle complex workflows by delegating tasks to the appropriate specialist agents. |

### Model Configuration Fields

Advanced model parameters also include detailed explanations:

| Field | Tooltip Content |
|-------|----------------|
| **Temperature** | Controls creativity and randomness. 0 is precise and predictable, 1 is creative and exploratory, 2 is very random. Use lower values for factual tasks, higher for creative work. |
| **Max Tokens** | The maximum length of the agent's response. Higher numbers allow longer replies but cost more. Roughly 4 characters per token. 2000 tokens ≈ 1500 words. |
| **Top P** | An alternative to temperature that controls randomness via probability mass. 1.0 considers all tokens, 0.1 only the most likely 10%. Lower values make responses more focused. |
| **Frequency Penalty** | Reduces repetition of words and phrases. Positive values (0.1-1.0) discourage repetition, negative values encourage it. Use 0.1-0.3 for most cases. |
| **Presence Penalty** | Encourages the model to talk about new topics. Positive values increase likelihood of new topics, negative values encourage staying on topic. Use 0.1-0.6 for variety. |
| **Max Retries** | How many times the agent will retry if a request fails. Useful for handling temporary API issues. 3-5 retries is usually sufficient for most cases. |
| **Retry Delay** | Time to wait between retry attempts in milliseconds. Longer delays help avoid rate limits but slow down responses. 1000ms (1 second) is a good default. |
| **Enable Memory** | If enabled, the agent will remember previous messages in a session and maintain conversation context. This creates a more natural chat experience but uses more tokens. |

## 🎨 Design Decisions

### Visual Design
- **Question mark icon** (?) for universal recognition
- **Subtle gray color** that becomes prominent on hover
- **Small size** (16px) to avoid cluttering the interface
- **Positioned to the right** of field labels for consistency

### Interaction Design
- **Dual activation**: Both hover and click trigger tooltips
- **Auto-hide on mouse leave** for hover interactions
- **Toggle behavior** for click interactions
- **Dark background** with white text for high contrast

### Content Strategy
- **Concise explanations** that fit in ~1-2 sentences
- **Practical examples** where helpful
- **Specific value ranges** for numerical fields
- **Context about impact** (cost, performance, etc.)

## 🚀 Benefits

### User Experience
- **Reduced confusion** when creating agents
- **Self-service learning** without external documentation
- **Confidence in configuration** through clear explanations
- **Faster onboarding** for new users

### Development Benefits
- **Reusable component** for future forms
- **Consistent help pattern** across the platform
- **Easy to maintain** and update content
- **Accessible design** following best practices

## 📊 Coverage

### Current Implementation
- ✅ **AgentBuilderForm**: Complete tooltip coverage (13 fields)
- ✅ **Model Configuration**: All advanced parameters covered (7 fields)
- ✅ **Conditional Fields**: Provider-specific tooltips implemented

### Future Considerations
- 📋 **Other Studio Forms**: Apply pattern to any future forms
- 🌐 **Internationalization**: Support for multiple languages
- 📱 **Mobile Optimization**: Touch-friendly tooltip behavior
- 🔍 **Advanced Help**: Link to detailed documentation when needed

This implementation establishes a comprehensive help system that makes the Kip Studio interface more user-friendly and reduces the learning curve for agent configuration. 