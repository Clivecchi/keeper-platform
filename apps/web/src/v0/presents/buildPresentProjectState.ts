import type { __UNSTABLE_Project_OnDiskState } from "@theatre/core"
import type { PresentMotionValues } from "./types"
import { PRESENCE_OBJECT_KEY } from "./presentMotionProps"

/** Theatre encodes prop paths as JSON.stringify([...path segments]). */
function encodePropPath(prop: keyof PresentMotionValues): string {
  return JSON.stringify([prop])
}

/** Must match @theatre/core globals.currentProjectStateDefinitionVersion (0.7.x → 0.4.0). */
const PROJECT_DEFINITION_VERSION = "0.4.0"

type KeyframeSpec = {
  position: number
  value: number
  /** Bezier handles — leftX, leftY, rightX, rightY */
  handles?: [number, number, number, number]
  type?: "bezier" | "hold"
}

type PresentSequenceDef = {
  length: number
  tracks: Array<{
    prop: keyof PresentMotionValues
    keyframes: KeyframeSpec[]
  }>
}

/** Easing presets — tuned for Presents spec character (unhurried arrivals). */
const EASE = {
  /** Slow settle — atmosphere, cover identity */
  outSoft: [0.12, 1, 0.28, 1] as [number, number, number, number],
  /** Confident step-in — slide / journey title beats */
  outSnappy: [0.22, 1, 0.36, 1] as [number, number, number, number],
  /** Even drift — context and captions */
  inOut: [0.42, 0, 0.58, 1] as [number, number, number, number],
  /** Hold until next keyframe — moment breath */
  hold: [0, 0, 0, 0] as [number, number, number, number],
}

/**
 * Cover — guest is received, not presented at.
 * Atmosphere over 1.2s; identity after atmosphere; content staggered behind.
 */
const COVER_SEQUENCE: PresentSequenceDef = {
  length: 2.6,
  tracks: [
    {
      prop: "atmosphereOpacity",
      keyframes: [
        { position: 0, value: 0, handles: EASE.outSoft },
        { position: 1.2, value: 1, handles: EASE.outSoft },
      ],
    },
    {
      prop: "primaryOpacity",
      keyframes: [
        { position: 0, value: 0, handles: EASE.hold, type: "hold" },
        { position: 1.05, value: 0, handles: EASE.hold, type: "hold" },
        { position: 1.55, value: 1, handles: EASE.outSoft },
      ],
    },
    {
      prop: "secondaryOpacity",
      keyframes: [
        { position: 0, value: 0, handles: EASE.hold, type: "hold" },
        { position: 1.45, value: 0, handles: EASE.hold, type: "hold" },
        { position: 1.95, value: 1, handles: EASE.outSoft },
      ],
    },
    {
      prop: "contextOpacity",
      keyframes: [
        { position: 0, value: 0, handles: EASE.hold, type: "hold" },
        { position: 1.85, value: 0, handles: EASE.hold, type: "hold" },
        { position: 2.35, value: 1, handles: EASE.inOut },
      ],
    },
    {
      prop: "contentOffsetY",
      keyframes: [
        { position: 1.05, value: 18, handles: EASE.outSoft },
        { position: 1.55, value: 0, handles: EASE.outSoft },
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

/**
 * Slide — forward motion; each beat confirms the previous.
 * Primary → +200ms secondary → +200ms context (whispers / provenance).
 */
const SLIDE_SEQUENCE: PresentSequenceDef = {
  length: 1.5,
  tracks: [
    {
      prop: "atmosphereOpacity",
      keyframes: [
        { position: 0, value: 0.88, handles: EASE.inOut },
        { position: 0.25, value: 1, handles: EASE.inOut },
      ],
    },
    {
      prop: "primaryOpacity",
      keyframes: [
        { position: 0, value: 0, handles: EASE.outSnappy },
        { position: 0.38, value: 1, handles: EASE.outSnappy },
      ],
    },
    {
      prop: "secondaryOpacity",
      keyframes: [
        { position: 0, value: 0, handles: EASE.hold, type: "hold" },
        { position: 0.38, value: 0, handles: EASE.hold, type: "hold" },
        { position: 0.58, value: 1, handles: EASE.outSnappy },
      ],
    },
    {
      prop: "contextOpacity",
      keyframes: [
        { position: 0, value: 0, handles: EASE.hold, type: "hold" },
        { position: 0.78, value: 0, handles: EASE.hold, type: "hold" },
        { position: 1.05, value: 1, handles: EASE.inOut },
      ],
    },
    {
      prop: "contentOffsetY",
      keyframes: [
        { position: 0, value: 10, handles: EASE.outSnappy },
        { position: 0.38, value: 0, handles: EASE.outSnappy },
      ],
    },
    {
      prop: "captionOpacity",
      keyframes: [
        { position: 0, value: 0, handles: EASE.hold, type: "hold" },
        { position: 0.78, value: 0, handles: EASE.hold, type: "hold" },
        { position: 1.05, value: 0.72, handles: EASE.inOut },
      ],
    },
    {
      prop: "mediaScale",
      keyframes: [{ position: 0, value: 1 }],
    },
  ],
}

/**
 * Media — opens full; no preamble. Caption whispers in after 800ms.
 */
const MEDIA_SEQUENCE: PresentSequenceDef = {
  length: 1.35,
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
      keyframes: [{ position: 0, value: 1 }],
    },
    {
      prop: "contentOffsetY",
      keyframes: [{ position: 0, value: 0 }],
    },
    {
      prop: "contextOpacity",
      keyframes: [
        { position: 0, value: 0.55, handles: EASE.inOut },
        { position: 0.8, value: 0.55, handles: EASE.hold, type: "hold" },
        { position: 1.15, value: 0.78, handles: EASE.inOut },
      ],
    },
    {
      prop: "captionOpacity",
      keyframes: [
        { position: 0, value: 0, handles: EASE.hold, type: "hold" },
        { position: 0.8, value: 0, handles: EASE.hold, type: "hold" },
        { position: 1.15, value: 1, handles: EASE.inOut },
      ],
    },
  ],
}

/**
 * Journey — arc motion. Title + forward together; paths/body sequential after.
 */
const JOURNEY_SEQUENCE: PresentSequenceDef = {
  length: 2.35,
  tracks: [
    {
      prop: "atmosphereOpacity",
      keyframes: [
        { position: 0, value: 0.45, handles: EASE.outSoft },
        { position: 0.55, value: 1, handles: EASE.outSoft },
      ],
    },
    {
      prop: "primaryOpacity",
      keyframes: [
        { position: 0, value: 0, handles: EASE.outSnappy },
        { position: 0.48, value: 1, handles: EASE.outSnappy },
      ],
    },
    {
      prop: "secondaryOpacity",
      keyframes: [
        { position: 0, value: 0, handles: EASE.hold, type: "hold" },
        { position: 0.62, value: 0, handles: EASE.hold, type: "hold" },
        { position: 1.05, value: 0.55, handles: EASE.outSnappy },
        { position: 1.55, value: 1, handles: EASE.outSoft },
      ],
    },
    {
      prop: "contextOpacity",
      keyframes: [
        { position: 0, value: 0, handles: EASE.hold, type: "hold" },
        { position: 0.48, value: 0, handles: EASE.hold, type: "hold" },
        { position: 0.82, value: 1, handles: EASE.inOut },
      ],
    },
    {
      prop: "contentOffsetY",
      keyframes: [
        { position: 0, value: 14, handles: EASE.outSnappy },
        { position: 0.48, value: 0, handles: EASE.outSnappy },
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

/**
 * Moment — held, not skimmed. Title → breath → narrative → context beneath.
 */
const MOMENT_SEQUENCE: PresentSequenceDef = {
  length: 2.75,
  tracks: [
    {
      prop: "atmosphereOpacity",
      keyframes: [
        { position: 0, value: 0.9, handles: EASE.inOut },
        { position: 0.5, value: 1, handles: EASE.inOut },
      ],
    },
    {
      prop: "primaryOpacity",
      keyframes: [
        { position: 0, value: 0, handles: EASE.outSoft },
        { position: 0.48, value: 1, handles: EASE.outSoft },
      ],
    },
    {
      prop: "secondaryOpacity",
      keyframes: [
        { position: 0, value: 0, handles: EASE.hold, type: "hold" },
        { position: 0.48, value: 0, handles: EASE.hold, type: "hold" },
        { position: 0.92, value: 0, handles: EASE.hold, type: "hold" },
        { position: 1.48, value: 1, handles: EASE.outSoft },
      ],
    },
    {
      prop: "contextOpacity",
      keyframes: [
        { position: 0, value: 0, handles: EASE.hold, type: "hold" },
        { position: 1.48, value: 0, handles: EASE.hold, type: "hold" },
        { position: 2.15, value: 1, handles: EASE.inOut },
      ],
    },
    {
      prop: "contentOffsetY",
      keyframes: [
        { position: 0, value: 12, handles: EASE.outSoft },
        { position: 0.48, value: 0, handles: EASE.outSoft },
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

const DEFAULT_EASE: [number, number, number, number] = [0.42, 0, 0.58, 1]

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
        type?: "bezier" | "hold"
      }>
    }
  > = {}

  for (const track of def.tracks) {
    const trackId = `${track.prop}-track`
    trackIdByPropPath[encodePropPath(track.prop)] = trackId
    trackData[trackId] = {
      type: "BasicKeyframedTrack",
      __debugName: track.prop,
      keyframes: track.keyframes.map((kf, index) => ({
        id: `${track.prop}-kf-${index}`,
        value: kf.value,
        position: kf.position,
        handles: kf.handles ?? DEFAULT_EASE,
        connectedRight: true,
        ...(kf.type ? { type: kf.type } : {}),
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
    revisionHistory: ["keeper-presents-tuned-v1"],
    definitionVersion: PROJECT_DEFINITION_VERSION,
  }
}

export const DEFAULT_PRESENT_PROJECT_STATE = buildDefaultPresentProjectState()
