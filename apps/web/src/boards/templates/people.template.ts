/**
 * People Board Template - Phase 4 Implementation
 * Template for people management and collaboration boards
 */

import { z } from 'zod';

export const PeopleTemplateSchema = z.object({
  id: z.literal('people'),
  name: z.string(),
  description: z.string(),
  icon: z.string(),
  frames: z.array(z.object({
    name: z.string(),
    pattern: z.enum(['dialogic', 'wizard', 'focus', 'canvas', 'gallery', 'form']),
    frameType: z.string(),
    orderIndex: z.number(),
    props: z.record(z.any()).optional(),
    layoutKind: z.string().optional(),
    layoutData: z.record(z.any()).optional()
  }))
});

export type PeopleTemplate = z.infer<typeof PeopleTemplateSchema>;

export const peopleTemplate: PeopleTemplate = {
  id: 'people',
  name: 'People Board',
  description: 'People management and team collaboration board',
  icon: '👥',
  frames: [
    {
      name: 'Team Grid',
      pattern: 'canvas',
      frameType: 'media_card',
      orderIndex: 2, // After Cover (0) and Settings (1)
      props: {
        title: 'Team Members',
        layout: 'grid',
        gridCols: 4,
        showRoles: true,
        showStatus: true,
        allowFilter: true,
        sortOptions: ['Name', 'Role', 'Status', 'Join Date'],
        filterOptions: {
          roles: ['All', 'Admin', 'Member', 'Guest'],
          status: ['All', 'Active', 'Away', 'Offline'],
          departments: ['All', 'Engineering', 'Design', 'Marketing', 'Sales']
        },
        cardStyle: 'compact',
        showContactInfo: true,
        items: [] // Will be populated with actual team members
      },
      layoutKind: 'grid',
      layoutData: {
        columns: 4,
        gap: 16,
        padding: 24,
        responsive: true
      }
    },
    {
      name: 'Team Directory',
      pattern: 'gallery',
      frameType: 'directory',
      orderIndex: 3,
      props: {
        title: 'Team Directory',
        viewMode: 'list',
        searchEnabled: true,
        groupBy: 'department',
        showDetails: true,
        exportEnabled: true,
        fields: [
          { name: 'name', label: 'Name', visible: true },
          { name: 'role', label: 'Role', visible: true },
          { name: 'department', label: 'Department', visible: true },
          { name: 'email', label: 'Email', visible: true },
          { name: 'phone', label: 'Phone', visible: false },
          { name: 'location', label: 'Location', visible: true },
          { name: 'startDate', label: 'Start Date', visible: false }
        ],
        items: [] // Will be populated with actual directory data
      },
      layoutKind: 'column',
      layoutData: {
        maxHeight: 600,
        scrollable: true
      }
    },
    {
      name: 'Collaboration Hub',
      pattern: 'focus',
      frameType: 'collaboration',
      orderIndex: 4,
      props: {
        title: 'Team Collaboration',
        showUpcoming: true,
        showRecent: true,
        quickActions: [
          { label: 'Schedule Meeting', action: 'schedule', icon: '📅' },
          { label: 'Start Chat', action: 'chat', icon: '💬' },
          { label: 'Share File', action: 'share', icon: '📎' },
          { label: 'Create Task', action: 'task', icon: '✅' }
        ],
        upcomingEvents: [],
        recentActivity: [],
        onlineMembers: [],
        integrations: {
          calendar: true,
          chat: true,
          files: true,
          tasks: true
        }
      },
      layoutKind: 'focus',
      layoutData: {}
    }
  ]
};

export default peopleTemplate;
