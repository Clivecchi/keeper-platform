import type { __UNSTABLE_Project_OnDiskState } from "@theatre/core"
import type { PresentMotionValues } from "./types"
import { PRESENCE_OBJECT_KEY } from "./presentMotionProps"

type KeyframeSpec = { position: number; value: number }

type PresentSequenceDef = {
  length: number
  tracks: Array<{
    prop: keyof PresentMotionValues
    keyframes: KeyframeSpec[]
  }>
}

const COVER_SEQUENCE: PresentSequenceDef = {
  length: 2,
  tracks: [
    {
      prop: "atmosphereOpacity",
      keyframes: [
        { position: 0, value: 0 },
        { position: 1.2, value: 1 },
      ],
    },
    {
      prop: "primaryOpacity",
      keyframes: [
        { position: 0, value: 0 },
        { position: 1.2, value: 0 },
        { position: 1.6, value: 1 },
      ],
    },
    {
      prop: "secondaryOpacity",
      keyframes: [
        { position: 0, value: 0 },
        { position: 1.4, value: 0 },
        { position: 1.8, value: 1 },
      ],
    },
    {
      prop: "contextOpacity",
      keyframes: [
        { position: 0, value: 0 },
        { position: 1.6, value: 0 },
        { position: 2, value: 1 },
      ],
    },
    {
      prop: "contentOffsetY",
      keyframes: [
        { position: 1.2, value: 12 },
        { position: 1.6, value: 0 },
      ],
    },
    {
      prop: "mediaScale",
      keyframes: [{ position: 0, value: 1 }],
    },
    {
      prop: "captionOpacity",
      keyframes: [{ position: 0, value: 0 }],
    },
  ],
}

const SLIDE_SEQUENCE: PresentSequenceDef = {
  length: 1.2,
  tracks: [
    {
      prop: "atmosphereOpacity",
      keyframes: [{ position: 0, value: 1 }],
    },
    {
      prop: "primaryOpacity",
      keyframes: [
        { position: 0, value: 0 },
        { position: 0.3, value: 1 },
      ],
    },
    {
      prop: "secondaryOpacity",
      keyframes: [
        { position: 0, value: 0 },
        { position: 0.2, value: 0 },
        { position: 0.5, value: 1 },
      ],
    },
    {
      prop: "contextOpacity",
      keyframes: [
        { position: 0, value: 0 },
        { position: 0.9, value: 1 },
      ],
    },
    {
      prop: "contentOffsetY",
      keyframes: [
        { position: 0, value: 6 },
        { position: 0.3, value: 0 },
      ],
    },
    {
      prop: "mediaScale",
      keyframes: [{ position: 0, value: 1 }],
    },
    {
      prop: "captionOpacity",
      keyframes: [{ position: 0, value: 1 }],
    },
  ],
}

const MEDIA_SEQUENCE: PresentSequenceDef = {
  length: 1.5,
  tracks: [
    {
      prop: "atmosphereOpacity",
      keyframes: [{ position: 0, value: 1 }],
    },
    {
      prop: "primaryOpacity",
      keyframes: [{ position: 0, value: 1 }],
    },
    {
      prop: "secondaryOpacity",
      keyframes: [{ position: 0, value: 1 }],
    },
    {
      prop: "mediaScale",
      keyframes: [
        { position: 0, value: 0.98 },
        { position: 0.15, value: 1 },
      ],
    },
    {
      prop: "captionOpacity",
      keyframes: [
        { position: 0, value: 0 },
        { position: 0.8, value: 0 },
        { position: 1.2, value: 1 },
      ],
    },
    {
      prop: "contextOpacity",
      keyframes: [{ position: 0, value: 0.85 }],
    },
    {
      prop: "contentOffsetY",
      keyframes: [{ position: 0, value: 0 }],
    },
  ],
}

const JOURNEY_SEQUENCE: PresentSequenceDef = {
  length: 2,
  tracks: [
    {
      prop: "atmosphereOpacity",
      keyframes: [
        { position: 0, value: 0.6 },
        { position: 0.4, value: 1 },
      ],
    },
    {
      prop: "primaryOpacity",
      keyframes: [
        { position: 0, value: 0 },
        { position: 0.4, value: 1 },
      ],
    },
    {
      prop: "secondaryOpacity",
      keyframes: [
        { position: 0, value: 0 },
        { position: 0.4, value: 1 },
      ],
    },
    {
      prop: "contextOpacity",
      keyframes: [
        { position: 0, value: 0 },
        { position: 0.6, value: 0 },
        { position: 1.2, value: 1 },
      ],
    },
    {
      prop: "contentOffsetY",
      keyframes: [
        { position: 0, value: 10 },
        { position: 0.4, value: 0 },
      ],
    },
    {
      prop: "mediaScale",
      keyframes: [{ position: 0, value: 1 }],
    },
    {
      prop: "captionOpacity",
      keyframes: [{ position: 0, value: 0 }],
    },
  ],
}

const MOMENT_SEQUENCE: PresentSequenceDef = {
  length: 2.5,
  tracks: [
    {
      prop: "atmosphereOpacity",
      keyframes: [{ position: 0, value: 1 }],
    },
    {
      prop: "primaryOpacity",
      keyframes: [
        { position: 0, value: 0 },
        { position: 0.4, value: 1 },
      ],
    },
    {
      prop: "secondaryOpacity",
      keyframes: [
        { position: 0, value: 0 },
        { position: 0.8, value: 0 },
        { position: 1.4, value: 1 },
      ],
    },
    {
      prop: "contextOpacity",
      keyframes: [
        { position: 0, value: 0 },
        { position: 1.6, value: 0 },
        { position: 2.2, value: 1 },
      ],
    },
    {
      prop: "contentOffsetY",
      keyframes: [
        { position: 0, value: 8 },
        { position: 0.4, value: 0 },
      ],
    },
    {
      prop: "mediaScale",
      keyframes: [{ position: 0, value: 1 }],
    },
    {
      prop: "captionOpacity",
      keyframes: [{ position: 0, value: 0 }],
    },
  ],
}

export const PRESENT_SEQUENCE_DEFS = {
  cover: COVER_SEQUENCE,
  slide: SLIDE_SEQUENCE,
  media: MEDIA_SEQUENCE,
  journey: JOURNEY_SEQUENCE,
  moment: MOMENT_SEQUENCE,
} as const satisfies Record<string, PresentSequenceDef>

function buildSheetState(def: PresentSequenceDef) {
  const trackIdByPropPath: Record<string, string> = {}
  const trackData: Record<
    string,
    {
      type: "BasicKeyframedTrack"
      __debugName?: string
      keyframes: Array<{
        id: string
        value: number
        position: number
        handles: [number, number, number, number]
        connectedRight: boolean
      }>
    }
  > = {}

  for (const track of def.tracks) {
    const trackId = `${track.prop}-track`
    trackIdByPropPath[track.prop] = trackId
    trackData[trackId] = {
      type: "BasicKeyframedTrack",
      __debugName: track.prop,
      keyframes: track.keyframes.map((kf, index) => ({
        id: `${track.prop}-kf-${index}`,
        value: kf.value,
        position: kf.position,
        handles: [0.42, 0, 0.58, 1],
        connectedRight: true,
      })),
    }
  }

  return {
    staticOverrides: { byObject: {} },
    sequence: {
      type: "PositionalSequence" as const,
      length: def.length,
      subUnitsPerUnit: 30,
      tracksByObject: {
        [PRESENCE_OBJECT_KEY]: {
          trackIdByPropPath,
          trackData,
        },
      },
    },
  }
}

export function buildDefaultPresentProjectState(): __UNSTABLE_Project_OnDiskState {
  const sheetsById = {} as __UNSTABLE_Project_OnDiskState["sheetsById"]

  for (const [sheetId, def] of Object.entries(PRESENT_SEQUENCE_DEFS)) {
    sheetsById[sheetId as keyof typeof PRESENT_SEQUENCE_DEFS & string] =
      buildSheetState(def)
  }

  return {
    sheetsById,
    revisionHistory: ["keeper-presents-v1"],
    definitionVersion: "0.0.1",
  }
}

export const DEFAULT_PRESENT_PROJECT_STATE = buildDefaultPresentProjectState()
