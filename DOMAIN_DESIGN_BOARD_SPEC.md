# Domain Design Board Specification

## 📋 Overview

The Domain Design Board is the primary interface for managing a Keeper Domain - representing an organization, team, workspace, or business entity within the Keeper platform.

## 🎯 Purpose

A Domain is a **container for collaborative work** that includes:
- Team members (People)
- Active projects (Journeys)
- Business records (Quotes, Stories)  
- AI Agents
- Organizational data and settings

The Domain Design Board serves as the **command center** for domain administrators and members to:
1. **Monitor** domain health and activity
2. **Manage** members, roles, and permissions
3. **Track** active work (quotes, projects, tasks)
4. **Coordinate** with AI agents
5. **Access** domain-wide tools and settings

## 🧱 Board Structure

### Pattern: `canvas`
A flexible grid layout allowing multiple frames to display different aspects of domain management simultaneously.

### Grid: 12-column layout
Supports responsive arrangements and flexible frame sizing.

---

## 📐 Frame Composition

### Frame 1: Domain Overview (Header)
**Layout:** `{ x: 0, y: 0, w: 12, h: 3 }`  
**Type:** `FieldGridProp`  
**Pattern:** `focus`

**Purpose:** Display key domain information at a glance

**Data Bindings:**
```typescript
{
  type: 'FieldGridProp',
  fields: [
    {
      key: 'name',
      label: 'Domain Name',
      dataSource: 'record.data.name',
      editable: true,
      validation: { required: true, minLength: 3 }
    },
    {
      key: 'healthStatus',
      label: 'Health',
      dataSource: 'record.data.healthStatus',
      display: 'StatusBadge',
      colors: {
        healthy: 'green',
        warning: 'yellow',
        critical: 'red'
      }
    },
    {
      key: 'memberCount',
      label: 'Members',
      dataSource: 'record.data.memberCount',
      display: 'CounterWithIcon',
      icon: 'users'
    },
    {
      key: 'activeProjects',
      label: 'Active Projects',
      dataSource: 'record.data.activeProjectCount',
      display: 'CounterWithIcon',
      icon: 'briefcase'
    }
  ],
  layout: 'horizontal',
  showLabels: true
}
```

---

### Frame 2: Team Members
**Layout:** `{ x: 0, y: 3, w: 6, h: 6 }`  
**Type:** `PeopleGridProp`  
**Pattern:** `canvas`

**Purpose:** Display and manage domain members

**Data Bindings:**
```typescript
{
  type: 'PeopleGridProp',
  dataSource: 'record.data.members',
  display: {
    view: 'grid',
    columns: 2,
    showAvatar: true,
    showRole: true,
    showStatus: true
  },
  actions: [
    {
      id: 'invite',
      label: 'Invite Member',
      icon: 'user-plus',
      permission: 'domain.members.invite'
    },
    {
      id: 'manage-roles',
      label: 'Manage Roles',
      icon: 'shield',
      permission: 'domain.roles.manage'
    }
  ],
  filters: ['role', 'status', 'recent-activity']
}
```

---

### Frame 3: Active Work Dashboard
**Layout:** `{ x: 6, y: 3, w: 6, h: 6 }`  
**Type:** `WorkDashboardProp`  
**Pattern:** `canvas`

**Purpose:** Track ongoing quotes, projects, and deliverables

**Data Bindings:**
```typescript
{
  type: 'WorkDashboardProp',
  sections: [
    {
      id: 'open-quotes',
      label: 'Open Quotes',
      dataSource: 'record.data.openQuotes',
      display: 'CompactList',
      showCount: true,
      actions: ['view', 'edit', 'archive']
    },
    {
      id: 'active-projects',
      label: 'Active Journeys',
      dataSource: 'record.data.activeJourneys',
      display: 'ProgressCards',
      showProgress: true
    },
    {
      id: 'pending-tasks',
      label: 'Pending Tasks',
      dataSource: 'record.data.pendingTasks',
      display: 'TaskList',
      groupBy: 'assignee'
    }
  ],
  quickActions: [
    { id: 'create-quote', label: 'New Quote', icon: 'file-text' },
    { id: 'start-journey', label: 'Start Journey', icon: 'map' }
  ]
}
```

---

### Frame 4: AI Agent Hub
**Layout:** `{ x: 0, y: 9, w: 8, h: 5 }`  
**Type:** `AIAssistantProp`  
**Pattern:** `dialogic`

**Purpose:** Interact with the domain's primary AI agent

**Data Bindings:**
```typescript
{
  type: 'AIAssistantProp',
  agentSource: 'record.data.primaryAgentId',
  capabilities: [
    'strategic_analysis',
    'member_coordination',
    'work_summarization',
    'task_delegation'
  ],
  context: {
    scope: 'domain',
    includeMembers: true,
    includeWork: true,
    includeAgents: true
  },
  interface: {
    mode: 'conversational',
    showHistory: true,
    showSuggestions: true,
    maxMessages: 50
  }
}
```

---

### Frame 5: Quick Stats & Insights
**Layout:** `{ x: 8, y: 9, w: 4, h: 5 }`  
**Type:** `MetricsCardProp`  
**Pattern:** `canvas`

**Purpose:** Display domain analytics and insights

**Data Bindings:**
```typescript
{
  type: 'MetricsCardProp',
  metrics: [
    {
      id: 'quote-conversion',
      label: 'Quote Conversion',
      dataSource: 'record.data.metrics.quoteConversionRate',
      format: 'percentage',
      trend: 'record.data.metrics.quoteConversionTrend',
      target: 75
    },
    {
      id: 'project-completion',
      label: 'Project Completion',
      dataSource: 'record.data.metrics.projectCompletionRate',
      format: 'percentage',
      trend: 'record.data.metrics.projectCompletionTrend',
      target: 85
    },
    {
      id: 'team-activity',
      label: 'Team Activity',
      dataSource: 'record.data.metrics.teamActivityScore',
      format: 'score',
      range: [0, 100],
      color: 'blue'
    },
    {
      id: 'agent-interactions',
      label: 'AI Interactions',
      dataSource: 'record.data.metrics.agentInteractionCount',
      format: 'number',
      period: 'this-week'
    }
  ],
  refreshInterval: 300000 // 5 minutes
}
```

---

## 🎨 Theme & Styling

### Primary Colors
- **Main:** `#1e40af` (Blue 800) - Professional, trustworthy
- **Accent:** `#3b82f6` (Blue 500) - Interactive elements
- **Success:** `#10b981` (Green 500) - Healthy status
- **Warning:** `#f59e0b` (Amber 500) - Attention needed
- **Error:** `#ef4444` (Red 500) - Critical issues

### Visual Hierarchy
1. **Domain name & health** - Most prominent (Frame 1)
2. **People & work** - Equal weight side-by-side (Frames 2-3)
3. **AI assistance** - Primary interaction area (Frame 4)
4. **Metrics** - Supporting information (Frame 5)

---

## 🔐 Permissions & Access

### View Permissions
- **Domain Admins:** Full access to all frames
- **Domain Members:** View all except sensitive admin settings
- **Guests:** Limited view (Frame 1 only)

### Edit Permissions
- **Domain Name/Settings:** `domain.settings.edit`
- **Member Management:** `domain.members.manage`
- **Work Creation:** `domain.work.create`
- **Agent Configuration:** `domain.agents.configure`

---

## 📊 Data Model

### Required Domain Data Structure
```typescript
interface DomainData {
  // Basic Info
  name: string;
  description?: string;
  healthStatus: 'healthy' | 'warning' | 'critical';
  
  // Members
  members: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    status: 'active' | 'inactive' | 'invited';
    avatarUrl?: string;
  }>;
  memberCount: number;
  
  // Work Items
  openQuotes: Array<{
    id: string;
    title: string;
    customerName: string;
    value: number;
    status: string;
    createdAt: Date;
  }>;
  
  activeJourneys: Array<{
    id: string;
    name: string;
    progress: number; // 0-100
    status: string;
    assignedTo: string[];
  }>;
  
  pendingTasks: Array<{
    id: string;
    title: string;
    assignee: string;
    dueDate: Date;
    priority: 'low' | 'medium' | 'high';
  }>;
  
  // Counts
  activeProjectCount: number;
  
  // AI Agent
  primaryAgentId: string;
  
  // Metrics
  metrics: {
    quoteConversionRate: number;
    quoteConversionTrend: 'up' | 'down' | 'stable';
    projectCompletionRate: number;
    projectCompletionTrend: 'up' | 'down' | 'stable';
    teamActivityScore: number;
    agentInteractionCount: number;
  };
}
```

---

## 🔄 Real-time Updates

### Live Data Streams
- **Member presence** - Show who's online
- **Work status changes** - Quote conversions, task completions
- **Agent responses** - Real-time AI assistant messages
- **Metric updates** - Refresh every 5 minutes

### WebSocket Events
```typescript
'domain.member.joined'
'domain.member.left'
'domain.quote.created'
'domain.quote.converted'
'domain.journey.started'
'domain.journey.completed'
'domain.task.assigned'
'domain.task.completed'
'domain.agent.message'
```

---

## 🎬 User Flows

### 1. Domain Admin Checks Daily Status
1. Opens Domain Design Board
2. Scans health status in Frame 1
3. Reviews team activity in Frame 2
4. Checks pending quotes/tasks in Frame 3
5. Asks AI agent for summary in Frame 4

### 2. Member Invites New Team Member
1. Clicks "Invite Member" in Frame 2
2. Enters email and role
3. System sends invite
4. New member appears in list with "invited" status

### 3. Creating a New Quote
1. Clicks "New Quote" quick action in Frame 3
2. Quote creation modal opens
3. Fills in customer details
4. Quote appears in "Open Quotes" section

### 4. AI-Assisted Domain Management
1. Types question to AI agent in Frame 4
2. "Which quotes need follow-up?"
3. Agent analyzes data and responds
4. Agent can create tasks or send notifications

---

## 🚀 Implementation Phases

### Phase 1: Core Structure ✅
- [x] Create Domain Management template
- [x] Define 5 frames with layouts
- [x] Link to Domain KeeperType

### Phase 2: Data Integration (Next)
- [ ] Connect Frame 1 to Domain record data
- [ ] Implement member list in Frame 2
- [ ] Build work dashboard in Frame 3
- [ ] Integrate AI agent in Frame 4
- [ ] Display metrics in Frame 5

### Phase 3: Interactivity
- [ ] Add member invite flow
- [ ] Enable quote/journey creation
- [ ] Implement AI agent conversation
- [ ] Add inline editing for Frame 1

### Phase 4: Real-time Features
- [ ] WebSocket integration
- [ ] Live member presence
- [ ] Auto-refreshing metrics
- [ ] Agent message streaming

### Phase 5: Polish & Optimization
- [ ] Performance optimization
- [ ] Mobile responsive layouts
- [ ] Advanced filtering
- [ ] Export/reporting features

---

## 📝 Notes

### Key Design Decisions

1. **Canvas pattern** - Chosen for flexibility and simultaneous information display
2. **5 frames** - Balanced between comprehensive and focused
3. **AI agent prominence** - Frame 4 is large to emphasize AI-first approach
4. **Member-centric** - People are as important as work (equal frame sizes)

### Future Enhancements

- Custom frame arrangements per user preference
- Additional frame types (calendar, file browser, announcements)
- Domain templates for different industries
- Cross-domain collaboration features

---

**Created:** 2025-11-01  
**Status:** Specification Complete - Ready for Implementation  
**Next Step:** Begin Phase 2 - Data Integration

