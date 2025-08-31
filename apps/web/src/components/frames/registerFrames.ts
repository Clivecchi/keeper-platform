import { registerFrameType } from './registry';
import {
  DialogPropsSchema,
  TopicsPropsSchema,
  DraftsPropsSchema,
  ConfigPropsSchema,
  ActivityPropsSchema,
} from './schemas';

import DialogFrame from './DialogFrame';
import TopicsFrame from './TopicsFrame';
import DraftsFrame from './DraftFrame';
import ConfigPanelFrame from './ConfigPanelFrame';
import ActivityFrameDefault from './activity-feed-frame';
import { MemoryFrame } from './MemoryFrame';
import { MemoryPropsSchema } from './schemas';

export function registerAllExistingFrames() {
  registerFrameType({
    type: 'dialog',
    title: 'Dialog',
    Component: DialogFrame as any,
    zodPropsSchema: DialogPropsSchema,
  });

  registerFrameType({
    type: 'topics',
    title: 'Topics',
    Component: TopicsFrame as any,
    zodPropsSchema: TopicsPropsSchema,
  });

  registerFrameType({
    type: 'drafts',
    title: 'Drafts',
    Component: DraftsFrame as any,
    zodPropsSchema: DraftsPropsSchema,
  });

  registerFrameType({
    type: 'config',
    title: 'Config',
    Component: ConfigPanelFrame as any,
    zodPropsSchema: ConfigPropsSchema,
  });

  registerFrameType({
    type: 'activity',
    title: 'Activity',
    Component: ActivityFrameDefault as any,
    zodPropsSchema: ActivityPropsSchema,
  });

  // Note: tasks and memory are intentionally deferred in Phase 1
  registerFrameType({
    type: 'memory',
    title: 'Memory',
    Component: MemoryFrame as any,
    zodPropsSchema: MemoryPropsSchema,
    defaultProps: { limit: 20 },
  });
}


