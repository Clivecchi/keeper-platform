/**
 * Domain Board Template - Phase 4 Implementation
 * Template for domain management and member overview boards
 */

import { z } from 'zod';

export const DomainTemplateSchema = z.object({
  id: z.literal('domain'),
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

export type DomainTemplate = z.infer<typeof DomainTemplateSchema>;

export const domainTemplate: DomainTemplate = {
  id: 'domain',
  name: 'Domain Board',
  description: 'Domain management and member collaboration board',
  icon: '🏠',
  frames: [
    {
      name: 'People',
      pattern: 'canvas',
      frameType: 'media_card',
      orderIndex: 2, // After Cover (0) and Settings (1)
      props: {
        title: 'Domain Members',
        layout: 'grid',
        gridCols: 3,
        showStats: true,
        allowInvite: true,
        memberRoles: ['Owner', 'Admin', 'Member', 'Viewer'],
        showActivity: true,
        items: [] // Will be populated with actual members
      },
      layoutKind: 'grid',
      layoutData: {
        columns: 3,
        gap: 16,
        padding: 24
      }
    },
    {
      name: 'Domain Overview',
      pattern: 'focus',
      frameType: 'preview',
      orderIndex: 3,
      props: {
        title: 'Domain Information',
        showDescription: true,
        showMetrics: true,
        showActivity: true,
        metrics: [
          { label: 'Members', value: 0, icon: '👥' },
          { label: 'Boards', value: 0, icon: '📋' },
          { label: 'Activity', value: 'Active', icon: '⚡' }
        ],
        recentActivity: [],
        quickActions: [
          { label: 'Invite Members', action: 'invite', icon: '✉️' },
          { label: 'Create Board', action: 'create-board', icon: '➕' },
          { label: 'Domain Settings', action: 'settings', icon: '⚙️' }
        ]
      },
      layoutKind: 'focus',
      layoutData: {}
    },
    {
      name: 'Activity Feed',
      pattern: 'gallery',
      frameType: 'activity_feed',
      orderIndex: 4,
      props: {
        title: 'Recent Activity',
        showTimestamps: true,
        groupByDate: true,
        filterOptions: ['All', 'Boards', 'Members', 'Settings'],
        maxItems: 20,
        autoRefresh: true,
        items: [] // Will be populated with actual activity
      },
      layoutKind: 'column',
      layoutData: {
        maxHeight: 400,
        scrollable: true
      }
    }
  ]
};

export default domainTemplate;
