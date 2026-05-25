import { lazy, Suspense } from 'react'

const StudioInit = lazy(() =>
  import.meta.env.MODE === 'development'
    ? import('./initTheatreStudio.dev').then(({ initTheatreStudio }) => {
        initTheatreStudio()
        return { default: () => null }
      })
    : Promise.resolve({ default: () => null })
)

export function TheatreStudioLoader() {
  return (
    <Suspense fallback={null}>
      <StudioInit />
    </Suspense>
  )
}
