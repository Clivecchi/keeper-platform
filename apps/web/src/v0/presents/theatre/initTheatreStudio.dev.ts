import '@theatre/core'
import studio from '@theatre/studio'
import { getPresentProject } from '../defaultSequences'

export function initTheatreStudio() {
  studio.initialize()
  getPresentProject()
}
