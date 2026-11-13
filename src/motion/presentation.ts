import type { SimulationState } from '../simulation/controller.ts'
import { isRunning } from '../simulation/controller.ts'

export const motionEase = [0.22, 1, 0.36, 1] as const
export function playbackDelay(phase: SimulationState['phase'], stepMs: number): number {
  return ['sensor','bayes','decision','planning'].includes(phase) ? Math.round(stepMs*2.8) : phase === 'moving' ? Math.max(120,Math.round(stepMs*1.5)) : stepMs
}
export function robotPresentation(state: SimulationState, stepMs: number, reducedMotion: boolean) {
  const previous = state.bfs?.path[Math.max(0,state.robotIndex-1)] ?? state.robotCell
  const delta = state.robotCell-previous
  const direction = delta === 1 ? 'right' : delta === -1 ? 'left' : delta === 4 ? 'down' : 'up'
  const heading = {up:0,right:90,down:180,left:-90}[direction]
  const travelling = (state.phase === 'moving' || state.phase === 'sorted') && state.robotIndex > 0
  return {
    row:Math.floor(state.robotCell/4), column:state.robotCell%4, direction, heading,
    tilt:travelling ? direction === 'right' ? 5 : direction === 'left' ? -5 : 0 : 0,
    duration:reducedMotion || !travelling ? 0 : Math.min(playbackDelay('moving',stepMs)*0.75/1000,0.28),
    active:isRunning(state.phase),
    arrived:state.phase === 'sorted' && state.target !== null && state.robotCell === state.target,
  }
}
