-- KIP Sessions & Messages Seed Data
-- ===================================
-- Test session and message data for Lead Agent memory system development

-- Create test session for TypeAgent (assuming it exists from kip-agents.sql)
INSERT INTO kip_sessions (id, agent_id, user_id, session_name, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  ka.id,
  NULL, -- No specific user for this test session
  'Test TypeScript Session',
  now() - interval '2 hours',
  now() - interval '5 minutes'
FROM kip_agents ka
WHERE ka.slug = 'type-agent'
LIMIT 1;

-- Create test session for PlatformAgent
INSERT INTO kip_sessions (id, agent_id, user_id, session_name, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  ka.id,
  NULL,
  'Platform Architecture Discussion',
  now() - interval '1 hour',
  now() - interval '10 minutes'
FROM kip_agents ka
WHERE ka.slug = 'platform-agent'
LIMIT 1;

-- Insert test messages for TypeAgent session
WITH type_session AS (
  SELECT s.id as session_id
  FROM kip_sessions s
  JOIN kip_agents ka ON s.agent_id = ka.id
  WHERE ka.slug = 'type-agent'
  LIMIT 1
)
INSERT INTO kip_messages (id, session_id, sender, content, role, metadata, created_at)
SELECT 
  gen_random_uuid(),
  ts.session_id,
  'user',
  'Help me understand TypeScript generics better. Can you explain how they work?',
  'user',
  '{"intent": "learning", "topic": "typescript-generics"}',
  now() - interval '2 hours'
FROM type_session ts
UNION ALL
SELECT 
  gen_random_uuid(),
  ts.session_id,
  'agent',
  'I''d be happy to explain TypeScript generics! Generics allow you to create reusable components that work with multiple types while maintaining type safety. Think of them as type variables that get filled in when you use the component.

Here''s a simple example:

```typescript
function identity<T>(arg: T): T {
  return arg;
}

// Usage
const stringResult = identity<string>("hello"); // Type is string
const numberResult = identity<number>(42);      // Type is number
```

The `<T>` creates a type parameter that represents any type. When you call the function, TypeScript infers or you specify what `T` should be.',
  'assistant',
  '{"response_type": "explanation", "code_examples": true}',
  now() - interval '2 hours' + interval '30 seconds'
FROM type_session ts
UNION ALL
SELECT 
  gen_random_uuid(),
  ts.session_id,
  'user',
  'That makes sense! Can you show me a more complex example with constraints?',
  'user',
  '{"intent": "follow_up", "topic": "typescript-generic-constraints"}',
  now() - interval '1 hour 30 minutes'
FROM type_session ts
UNION ALL
SELECT 
  gen_random_uuid(),
  ts.session_id,
  'agent',
  'Absolutely! Generic constraints let you limit what types can be used. Here''s an example:

```typescript
interface Lengthwise {
  length: number;
}

function logLength<T extends Lengthwise>(arg: T): T {
  console.log(arg.length); // Now we know arg has .length
  return arg;
}

// Works with arrays, strings, etc.
logLength("hello");        // OK, string has length
logLength([1, 2, 3]);      // OK, array has length
logLength({ length: 5 });  // OK, object has length
// logLength(42);          // Error! number doesn't have length
```

The `extends Lengthwise` constraint ensures that `T` must have a `length` property.',
  'assistant',
  '{"response_type": "explanation", "code_examples": true, "topic": "generic-constraints"}',
  now() - interval '1 hour 30 minutes' + interval '45 seconds'
FROM type_session ts;

-- Insert test messages for PlatformAgent session
WITH platform_session AS (
  SELECT s.id as session_id
  FROM kip_sessions s
  JOIN kip_agents ka ON s.agent_id = ka.id
  WHERE ka.slug = 'platform-agent'
  LIMIT 1
)
INSERT INTO kip_messages (id, session_id, sender, content, role, metadata, created_at)
SELECT 
  gen_random_uuid(),
  ps.session_id,
  'user',
  'What are the key architectural decisions we should consider for scaling the Keeper platform?',
  'user',
  '{"intent": "architecture_advice", "scope": "scaling"}',
  now() - interval '1 hour'
FROM platform_session ps
UNION ALL
SELECT 
  gen_random_uuid(),
  ps.session_id,
  'agent',
  'Great question! For scaling the Keeper platform, here are the key architectural decisions to consider:

**Database Strategy:**
- Horizontal sharding for user data
- Read replicas for analytics queries
- Consider event sourcing for audit trails

**Microservices Boundaries:**
- Separate auth service (KAM)
- Independent KIP agent execution engines
- Dedicated theme/UI configuration service

**Caching Strategy:**
- Redis for session data
- CDN for static assets
- Application-level caching for frequently accessed data

**Infrastructure:**
- Container orchestration (Kubernetes)
- Auto-scaling based on request volume
- Multi-region deployment for global users

Would you like me to dive deeper into any of these areas?',
  'assistant',
  '{"response_type": "architectural_guidance", "categories": ["database", "microservices", "caching", "infrastructure"]}',
  now() - interval '1 hour' + interval '1 minute'
FROM platform_session ps
UNION ALL
SELECT 
  gen_random_uuid(),
  ps.session_id,
  'user',
  'Let''s focus on the microservices boundaries. How would you structure the KIP agent execution engines?',
  'user',
  '{"intent": "deep_dive", "topic": "microservices", "focus": "kip-agents"}',
  now() - interval '45 minutes'
FROM platform_session ps
UNION ALL
SELECT 
  gen_random_uuid(),
  ps.session_id,
  'agent',
  'Excellent focus area! For KIP agent execution engines, I recommend this structure:

**Core Services:**
1. **Agent Registry Service** - Manages agent definitions, capabilities, and metadata
2. **Session Manager Service** - Handles conversation state and memory persistence
3. **Execution Engine Service** - Runs agent logic with resource isolation
4. **Model Gateway Service** - Abstracts different AI model providers (OpenAI, Anthropic, etc.)

**Communication Patterns:**
- Event-driven architecture for agent orchestration
- Message queues for async processing
- Circuit breakers for external model API calls

**Resource Management:**
- Container-per-execution for isolation
- Resource quotas per agent class
- Auto-scaling based on queue depth

**Data Flow:**
```
User Request → Session Manager → Agent Registry → Execution Engine → Model Gateway
                     ↓                                    ↓
               Message Store                        Response Queue
```

This allows for independent scaling and fault isolation while maintaining conversation continuity.',
  'assistant',
  '{"response_type": "detailed_architecture", "focus": "kip_execution", "includes_diagram": true}',
  now() - interval '45 minutes' + interval '2 minutes'
FROM platform_session ps; 