import * as React from "react"
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

export function usePresentMotion({
  present,
  instanceKey,
  enabled = true,
}: UsePresentMotionOptions): PresentMotionValues {
  const [motion, setMotion] = React.useState<PresentMotionValues>(
    enabled ? HIDDEN_MOTION : DEFAULT_PRESENT_MOTION_VALUES,
  )

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

    let cancelled = false

    const unsubscribe = obj.onValuesChange((values) => {
      if (cancelled) return
      setMotion({
        atmosphereOpacity: values.atmosphereOpacity,
        primaryOpacity: values.primaryOpacity,
        secondaryOpacity: values.secondaryOpacity,
        contextOpacity: values.contextOpacity,
        mediaScale: values.mediaScale,
        contentOffsetY: values.contentOffsetY,
        captionOpacity: values.captionOpacity,
      })
    })

    void project.ready.then(() => {
      if (cancelled) return
      sheet.sequence.position = 0
      void sheet.sequence.play({ iterationCount: 1 })
    })

    return () => {
      cancelled = true
      unsubscribe()
      sheet.sequence.pause()
      sheet.detachObject(PRESENCE_OBJECT_KEY)
    }
  }, [present, instanceKey, enabled])

  return motion
}

const PresentMotionContext =
  React.createContext<PresentMotionValues>(DEFAULT_PRESENT_MOTION_VALUES)

export function PresentMotionProvider({
  present,
  instanceKey,
  enabled = true,
  children,
}: UsePresentMotionOptions & { children: React.ReactNode }) {
  const motion = usePresentMotion({ present, instanceKey, enabled })
  return (
    <PresentMotionContext.Provider value={motion}>
      {children}
    </PresentMotionContext.Provider>
  )
}

export function usePresentMotionValues(): PresentMotionValues {
  return React.useContext(PresentMotionContext)
}
