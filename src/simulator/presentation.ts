import type { SimulationState } from '../simulation/controller.ts'
import type { StageId } from '../simulation/transport.ts'
export function inspectorForStage(stage:StageId|null):'observe'|'reason'|'act' {
  return stage==='mdp'?'reason':stage&&['bfs','path','robot','result'].includes(stage)?'act':'observe'
}
export function isTraversedCell(state:Pick<SimulationState,'phase'|'robotIndex'>,path:readonly number[],cell:number):boolean {
  const index=path.indexOf(cell)
  return index>=0&&index<=state.robotIndex&&['moving','sorted'].includes(state.phase)
}

/** The link leaving the current node is still planned until the next node is reached. */
export function isTraversedEdge(state:Pick<SimulationState,'phase'|'robotIndex'>,path:readonly number[],cell:number):boolean {
  const index=path.indexOf(cell)
  return isTraversedCell(state,path,cell)&&index<state.robotIndex&&index<path.length-1
}
