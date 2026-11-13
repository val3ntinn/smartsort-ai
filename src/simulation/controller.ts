import { DEFAULT_PARAMETERS, sensorModel, validateParameters, type ExperimentParameters } from './parameters.ts'
import { getBayesPriors, inferMaterial, validateProbabilities, type BayesMaterial, type BayesResult, type Probabilities } from '../algorithms/bayes.ts'
import type { MdpResult } from '../algorithms/mdp.ts'
import { solveSortingMDP, type FiniteHorizonResult } from '../algorithms/finiteMdp.ts'
import { bfs, type BfsResult } from '../algorithms/bfs.ts'
import { bins, robotCell as defaultStart, type LogEntry } from '../model.ts'
import { OBJECTS, sampleSensor, validateSensorSeed, type ObjectId, type SensorConfig } from './sensor.ts'

export type Phase = 'idle' | 'sensor' | 'bayes' | 'decision' | 'planning' | 'exploring' | 'tracing' | 'moving' | 'sorted' | 'unreachable' | 'unresolved' | 'cancelled' | 'error'
export interface SimulationConfig { objectId: ObjectId; start: number; obstacles: readonly number[]; sensor: SensorConfig; initialPriors: Probabilities; parameters?:ExperimentParameters }
export interface Inspection { observation: BayesMaterial; bayesian: BayesResult | null; decision: MdpResult | FiniteHorizonResult | null }
export interface SortingResult { outcome: 'correct' | 'incorrect' | 'unreachable' | 'unresolved' | 'cancelled' | 'error'; message: string; trueMaterial: BayesMaterial; predictedMaterial: BayesMaterial | null; destination: number | null; inspections: number; moves: number }
export interface SimulationState {
  config: SimulationConfig; phase: Phase; belief: Probabilities; observation: BayesMaterial | null; bayesian: BayesResult | null; decision: MdpResult | FiniteHorizonResult | null; inspections: Inspection[]; seed: number; target: number | null; bfs: BfsResult | null; visitedCount: number; pathCount: number; robotIndex: number; robotCell: number; logs: LogEntry[]; result: SortingResult | null
}
export const isRunning = (phase: Phase) => ['sensor','bayes','decision','planning','exploring','tracing','moving'].includes(phase)
export function defaultConfig(): SimulationConfig { return {objectId:'plastic-bottle', start:defaultStart, obstacles:[], sensor:{mode:'seeded',seed:42}, initialPriors:getBayesPriors(),parameters:{...DEFAULT_PARAMETERS}} }
export function createSimulation(config: SimulationConfig = defaultConfig()): SimulationState {
  const parameters=validateParameters(config.parameters ?? DEFAULT_PARAMETERS)
  if (!OBJECTS.some(object => object.id === config.objectId)) throw new TypeError('Select a supported object.')
  if (!Number.isInteger(config.start) || config.start < 0 || config.start >= 16 || bins.some(bin => bin.cell === config.start)) throw new RangeError('Robot start must be a free grid cell.')
  if (!Array.isArray(config.obstacles) || config.obstacles.some(cell => !Number.isInteger(cell) || cell < 0 || cell >= 16 || cell === config.start || bins.some(bin => bin.cell === cell))) throw new RangeError('Obstacles cannot overwrite the robot or bins.')
  validateProbabilities(config.initialPriors)
  if (config.sensor.mode === 'seeded') validateSensorSeed(config.sensor.seed)
  else if (config.sensor.mode !== 'predefined' || !Array.isArray(config.sensor.observations) || !config.sensor.observations.length || config.sensor.observations.length > parameters.maxInspections || config.sensor.observations.some(value => value !== 'PLASTIC' && value !== 'PAPER')) throw new TypeError(`Provide one to ${parameters.maxInspections} PLASTIC or PAPER observations.`)
  const snapshot: SimulationConfig = { ...config, parameters:{...parameters}, initialPriors:{...config.initialPriors}, obstacles:[...new Set(config.obstacles)], sensor:config.sensor.mode === 'seeded' ? {...config.sensor} : {...config.sensor,observations:[...config.sensor.observations]} }
  return { config:snapshot, phase:'idle', belief:{...config.initialPriors}, observation:null, bayesian:null, decision:null, inspections:[], seed:config.sensor.mode === 'seeded' ? config.sensor.seed : 0, target:null, bfs:null, visitedCount:0, pathCount:0, robotIndex:0, robotCell:config.start, logs:[], result:null }
}
function log(state: SimulationState, stage: string, message: string): SimulationState { return {...state,logs:[...state.logs,{id:state.logs.length+1,time:stage,message}]} }
export function startSimulation(config: SimulationConfig): SimulationState { return log({...createSimulation(config),phase:'sensor'}, 'AGENT', `${OBJECTS.find(object => object.id === config.objectId)!.label} selected. Sensor -> Bayes -> MDP -> BFS -> Robot -> Result.`) }
function finish(state: SimulationState, phase: 'sorted' | 'unreachable' | 'unresolved' | 'cancelled' | 'error', outcome: SortingResult['outcome'], message: string): SimulationState {
  return log({...state,phase,result:{outcome,message,trueMaterial:OBJECTS.find(object => object.id === state.config.objectId)!.material,predictedMaterial:state.decision?.proposedMaterial ?? null,destination:state.target,inspections:state.inspections.length,moves:state.robotIndex}}, 'RESULT',message)
}
export function cancelSimulation(state: SimulationState): SimulationState { return isRunning(state.phase) ? finish(state,'cancelled','cancelled','Simulation stopped. No sorting result was committed.') : state }
export function resetSimulation(): SimulationState { return createSimulation() }

/** Pure controller: one real algorithm stage or movement step per advance.
 * React owns timing only; it never manufactures probabilities, decisions or routes.
 */
export function advanceSimulation(state: SimulationState): SimulationState {
  if (!isRunning(state.phase)) return state
  try {
    const parameters=validateParameters(state.config.parameters ?? DEFAULT_PARAMETERS)
    const model=sensorModel(parameters)
    switch (state.phase) {
      case 'sensor': {
        if (state.inspections.length >= parameters.maxInspections) return finish(state,'unresolved','unresolved',`Classification unresolved after ${parameters.maxInspections} inspections. Robot stopped safely.`)
        const material = OBJECTS.find(object => object.id === state.config.objectId)!.material
        let observation: BayesMaterial
        let seed = state.seed
        if (state.config.sensor.mode === 'predefined') {
          const next = state.config.sensor.observations[state.inspections.length]
          if (!next) return finish(state,'unresolved','unresolved','Predefined observations exhausted before a SORT decision. Robot stopped safely.')
          observation = next
        } else { const sample = sampleSensor(material,seed,model); observation = sample.observation; seed = sample.nextSeed }
        return log({...state,phase:'bayes',observation,seed,inspections:[...state.inspections,{observation,bayesian:null,decision:null}]},'SENSOR',`Inspection ${state.inspections.length+1}/${parameters.maxInspections}: ${observation} observation (${state.config.sensor.mode}).`)
      }
      case 'bayes': {
        const bayesian = inferMaterial(state.observation,state.belief,model)
        const inspections = state.inspections.map((inspection,index) => index === state.inspections.length-1 ? {...inspection,bayesian} : inspection)
        return log({...state,phase:'decision',bayesian,belief:bayesian.posteriors,inspections},'BAYES',`Prior Plastic ${(bayesian.priors.PLASTIC*100).toFixed(2)}%, Paper ${(bayesian.priors.PAPER*100).toFixed(2)}% -> posterior Plastic ${(bayesian.posteriors.PLASTIC*100).toFixed(2)}%, Paper ${(bayesian.posteriors.PAPER*100).toFixed(2)}%.`)
      }
      case 'decision': {
        if (!state.bayesian) throw new Error('Bayesian output is missing.')
        const decision = solveSortingMDP(state.bayesian.posteriors,{model,remainingInspections:Math.max(0,parameters.maxInspections-state.inspections.length),wrongSortReward:-parameters.incorrectSortPenalty})
        const inspections = state.inspections.map((inspection,index) => index === state.inspections.length-1 ? {...inspection,decision} : inspection)
        const next = log({...state,decision,inspections},'MDP',decision.explanation)
        if (decision.selectedAction === 'SORT') return {...next,phase:'planning'}
        if (decision.selectedAction==='UNRESOLVED' || state.inspections.length >= parameters.maxInspections) return finish(next,'unresolved','unresolved',`Classification unresolved after ${parameters.maxInspections} inspections. Robot stopped safely.`)
        return log({...next,phase:'sensor'},'AGENT','Inspect again using the current posterior as the next prior.')
      }
      case 'planning': {
        if (!state.decision || state.decision.selectedAction !== 'SORT') throw new Error('No SORT decision is available.')
        const target = bins.find(bin => bin.material.toUpperCase() === state.decision!.proposedMaterial)!.cell
        const blocked = [...state.config.obstacles,...bins.filter(bin => bin.cell !== target).map(bin => bin.cell)]
        const route = bfs({rows:4,columns:4,start:state.robotCell,target,obstacles:blocked})
        return log({...state,target,bfs:route,phase:'exploring'},'BFS',`Destination ${state.decision.proposedMaterial} bin [${Math.floor(target/4)}, ${target%4}]. ${route.pathFound ? `Shortest route: ${route.pathLength} moves.` : 'No route found.'}`)
      }
      case 'exploring':
        if (!state.bfs) throw new Error('BFS output is missing.')
        if (state.visitedCount < state.bfs.visitedCells.length) return {...state,visitedCount:state.visitedCount+1}
        return state.bfs.pathFound ? log({...state,phase:'tracing'},'BFS',`Explored ${state.visitedCount} cells. Reconstructing shortest path.`) : finish(state,'unreachable','unreachable','Destination unreachable. Robot stopped; remove obstacles and try again.')
      case 'tracing':
        if (!state.bfs) throw new Error('BFS output is missing.')
        if (state.pathCount < state.bfs.path.length) return {...state,pathCount:state.pathCount+1}
        return log({...state,phase:'moving'},'ROBOT','Following the computed BFS route.')
      case 'moving': {
        if (!state.bfs || state.target === null) throw new Error('Navigation route is missing.')
        const robotIndex = Math.min(state.robotIndex+1,state.bfs.path.length-1)
        const robotCell = state.bfs.path[robotIndex]
        let next = state
        if (robotIndex !== state.robotIndex) next = log({...state,robotIndex,robotCell},'ROBOT',`Move ${robotIndex}/${state.bfs.pathLength}: [${Math.floor(robotCell/4)}, ${robotCell%4}].`)
        if (robotCell !== state.target) return next
        const correct = state.decision!.proposedMaterial === OBJECTS.find(object => object.id === state.config.objectId)!.material
        return finish(next,'sorted',correct ? 'correct' : 'incorrect',`${correct ? 'Correctly sorted' : 'Incorrectly sorted'} into ${state.decision!.proposedMaterial} bin after ${state.inspections.length} inspection(s) and ${robotIndex} moves.${correct ? '' : ' The imperfect sensor led to a wrong classification.'}`)
      }
      default: return state
    }
  } catch (error) { return finish(state,'error','error',error instanceof Error ? error.message : 'Simulation error. Robot stopped safely.') }
}
