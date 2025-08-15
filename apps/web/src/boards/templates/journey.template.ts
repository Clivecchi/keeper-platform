/**
 * Journey Board Template - Phase 4 Implementation
 * Template for learning journey visualization and progression boards
 */

import { z } from 'zod';

export const JourneyTemplateSchema = z.object({
  id: z.literal('journey'),
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

export type JourneyTemplate = z.infer<typeof JourneyTemplateSchema>;

export const journeyTemplate: JourneyTemplate = {
  id: 'journey',
  name: 'Journey Board',
  description: 'Learning journey visualization and progression tracking',
  icon: '🗺️',
  frames: [
    {
      name: 'Journey Path',
      pattern: 'wizard',
      frameType: 'process_frame',
      orderIndex: 2, // After Cover (0) and Settings (1)
      props: {
        title: 'Learning Path',
        showProgress: true,
        allowSkip: false,
        showEstimatedTime: true,
        steps: [
          { 
            id: 'foundation', 
            label: 'Foundation', 
            description: 'Core concepts and fundamentals',
            completed: false, 
            estimatedTime: '2 hours',
            resources: []
          },
          { 
            id: 'practice', 
            label: 'Practice', 
            description: 'Hands-on exercises and examples',
            completed: false, 
            estimatedTime: '4 hours',
            resources: []
          },
          { 
            id: 'application', 
            label: 'Application', 
            description: 'Real-world projects and challenges',
            completed: false, 
            estimatedTime: '6 hours',
            resources: []
          },
          { 
            id: 'mastery', 
            label: 'Mastery', 
            description: 'Advanced techniques and optimization',
            completed: false, 
            estimatedTime: '8 hours',
            resources: []
          }
        ],
        navigation: {
          showStepNumbers: true,
          allowNonLinear: false,
          showCompletion: true
        }
      },
      layoutKind: 'wizard',
      layoutData: {
        orientation: 'horizontal',
        showConnectors: true
      }
    },
    {
      name: 'Resource Gallery',
      pattern: 'gallery',
      frameType: 'media_card',
      orderIndex: 3,
      props: {
        title: 'Learning Resources',
        layout: 'masonry',
        showProgress: true,
        allowReorder: false,
        categories: ['Videos', 'Articles', 'Exercises', 'Projects'],
        filterEnabled: true,
        items: [
          {
            id: 'intro-video',
            title: 'Introduction Video',
            type: 'video',
            category: 'Videos',
            duration: '15 min',
            completed: false,
            thumbnail: null
          },
          {
            id: 'getting-started',
            title: 'Getting Started Guide',
            type: 'article',
            category: 'Articles',
            readTime: '10 min',
            completed: false,
            thumbnail: null
          }
        ]
      },
      layoutKind: 'grid',
      layoutData: {
        columns: 2,
        gap: 16,
        aspectRatio: '16:9'
      }
    },
    {
      name: 'Progress Tracker',
      pattern: 'focus',
      frameType: 'dashboard',
      orderIndex: 4,
      props: {
        title: 'Your Progress',
        showStats: true,
        showBadges: true,
        showTimeline: true,
        stats: [
          { label: 'Completion', value: '0%', type: 'percentage' },
          { label: 'Time Spent', value: '0h', type: 'duration' },
          { label: 'Resources Completed', value: '0/12', type: 'fraction' },
          { label: 'Current Streak', value: '0 days', type: 'streak' }
        ],
        badges: [],
        timeline: [],
        motivationalMessage: 'Every expert was once a beginner. Start your journey today!'
      },
      layoutKind: 'focus',
      layoutData: {}
    }
  ]
};

export default journeyTemplate;
