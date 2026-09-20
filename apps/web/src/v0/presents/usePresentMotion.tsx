import * as React from "react"
import type { ISheet, ISheetObject } from "@theatre/core"
import {
  DEFAULT_PRESENT_MOTION_VALUES,
  type PresentMotionValues,
  type PresentName,
} from "./types"
import { getPresentProject, presentSheetId } from "./defaultSequences"
import {
  PRESENCE_OBJECT_KEY,
  PRESENT_MOTION_PROPS,
} from "./presentMotionProps"
import { PRESENT_SEQUENCE_DEFS } from "./buildPresentProjectState"

export interface UsePresentMotionOptions {
  present: PresentName
  /** Unique instance id — typically objectId — so concurrent Presents do not collide. */
  instanceKey: string
  enabled?: boolean
  /**
   * Semantic pose written onto the same Theatre Presence object.
   * Null/undefined keeps the played sequence. Does not create a second project.
   */
  pose?: PresentMotionValues | null
}

function hasKnownSequence(
  present: PresentName,
): present is keyof typeof PRESENT_SEQUENCE_DEFS {
  return present in PRESENT_SEQUENCE_DEFS
}

const HIDDEN_MOTION: PresentMotionValues = {
  ...DEFAULT_PRESENT_MOTION_VALUES,
  atmosphereOpacity: 0,
  primaryOpacity: 0,
  secondaryOpacity: 0,
  contextOpacity: 0,
  captionOpacity: 0,
  contentOffsetY: 8,
}

function readPresenceValues(values: PresentMotionValues): PresentMotionValues {
  return {
    atmosphereOpacity: values.atmosphereOpacity,
    primaryOpacity: values.primaryOpacity,
    secondaryOpacity: values.secondaryOpacity,
    contextOpacity: values.contextOpacity,
    mediaScale: values.mediaScale,
    contentOffsetY: values.contentOffsetY,
    captionOpacity: values.captionOpacity,
  }
}

function sequenceLength(present: PresentName): number {
  if (!hasKnownSequence(present)) return 1
  return PRESENT_SEQUENCE_DEFS[present].length
}

export function usePresentMotion({
  present,
  instanceKey,
  enabled = true,
  pose = null,
}: UsePresentMotionOptions): PresentMotionValues {
  const [motion, setMotion] = React.useState<PresentMotionValues>(
    enabled ? HIDDEN_MOTION : DEFAULT_PRESENT_MOTION_VALUES,
  )
  const poseRef = React.useRef(pose)
  poseRef.current = pose
  const poseAppliedRef = React.useRef(false)
  const sheetRef = React.useRef<ISheet | null>(null)
  const objectRef = React.useRef<ISheetObject<typeof PRESENT_MOTION_PROPS> | null>(null)

  React.useEffect(() => {
    if (!enabled || !instanceKey) {
      setMotion(DEFAULT_PRESENT_MOTION_VALUES)
      return
    }

    if (!hasKnownSequence(present)) {
      setMotion(DEFAULT_PRESENT_MOTION_VALUES)
      return
    }

    const project = getPresentProject()
    const sheet = project.sheet(presentSheetId(present), instanceKey)
    const obj = sheet.object(PRESENCE_OBJECT_KEY, PRESENT_MOTION_PROPS)
    sheetRef.current = sheet
    objectRef.current = obj

    let cancelled = false

    const unsubscribe = obj.onValuesChange((values) => {
      if (cancelled) return
      setMotion(readPresenceValues(values))
    })

    void project.ready.then(() => {
      if (cancelled) return
      if (poseRef.current) {
        obj.initialValue = poseRef.current
        sheet.sequence.pause()
        return
      }
      sheet.sequence.position = 0
      void sheet.sequence.play({ iterationCount: 1 })
    })

    return () => {
      cancelled = true
      unsubscribe()
      sheet.sequence.pause()
      sheet.detachObject(PRESENCE_OBJECT_KEY)
      sheetRef.current = null
      objectRef.current = null
      poseAppliedRef.current = false
    }
  }, [present, instanceKey, enabled])

  React.useEffect(() => {
    const sheet = sheetRef.current
    const obj = objectRef.current
    if (!sheet || !obj) return

    if (pose) {
      poseAppliedRef.current = true
      sheet.sequence.pause()
      obj.initialValue = pose
      return
    }

    if (!poseAppliedRef.current) return
    poseAppliedRef.current = false
    const hold = Math.min(sheet.sequence.position, sequenceLength(present) * 0.2)
    sheet.sequence.position = hold
    void sheet.sequence.play({ iterationCount: 1 })
  }, [pose, present])

  return motion
}

const PresentMotionContext =
  React.createContext<PresentMotionValues>(DEFAULT_PRESENT_MOTION_VALUES)

export function PresentMotionProvider({
  present,
  instanceKey,
  enabled = true,
  pose = null,
  children,
}: UsePresentMotionOptions & { children: React.ReactNode }) {
  const motion = usePresentMotion({ present, instanceKey, enabled, pose })
  return (
    <PresentMotionContext.Provider value={motion}>
      {children}
    </PresentMotionContext.Provider>
  )
}

export function usePresentMotionValues(): PresentMotionValues {
  return React.useContext(PresentMotionContext)
}
