"use client"

import * as React from "react"
import {
  canExerciseKeepingChoice,
  isKeepingChoiceSelected,
  type KeepingChoiceRecord,
} from "@keeper/shared"

export function KeepingChoiceControls({
  choices,
  disabled,
  onExercise,
}: {
  choices: readonly KeepingChoiceRecord[]
  disabled?: boolean
  onExercise?: (record: KeepingChoiceRecord) => void
}) {
  if (!choices.length) return null

  return (
    <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Keeping choices">
      {choices.map((choice) => {
        const selected = isKeepingChoiceSelected(choice)
        const available = canExerciseKeepingChoice(choice)
        return (
          <button
            key={choice.choiceId}
            type="button"
            disabled={disabled || !available || !onExercise}
            onClick={(event) => {
              event.stopPropagation()
              if (!available || !onExercise) return
              onExercise(choice)
            }}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-70"
            style={{
              backgroundColor: selected
                ? "hsl(142 40% 94%)"
                : "hsl(var(--theme-dialogue-user-bg, 14 60% 56%))",
              color: selected ? "hsl(142 50% 30%)" : "white",
              border: selected ? "1px solid hsl(142 30% 82%)" : "1px solid transparent",
            }}
          >
            {selected ? `Selected · ${choice.label}` : choice.label}
          </button>
        )
      })}
    </div>
  )
}
