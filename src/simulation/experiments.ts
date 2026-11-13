import { DEFAULT_PARAMETERS, sensorModel, type ExperimentParameters } from './parameters.ts'
import { advanceSimulation, isRunning, startSimulation, type SimulationConfig } from './controller.ts'
import { getSensorLikelihoods, type SensorModel } from '../algorithms/bayes.ts'
import type { TransportSnapshot } from './transport.ts'

export function experimentTrial(config:SimulationConfig,parameters:ExperimentParameters) {
  const sensor=config.sensor.mode==='predefined'?{...config.sensor,observations:config.sensor.observations.slice(0,parameters.maxInspections)}:config.sensor
  let state=startSimulation({...config,sensor,parameters})
  for(let tick=0;isRunning(state.phase)&&tick<500;tick++)state=advanceSimulation(state)
  if(isRunning(state.phase))throw new Error('Experiment exceeded its bounded execution budget.')
  return state
}
export function compareExperiment(config:SimulationConfig) {
  return {original:experimentTrial(config,{...DEFAULT_PARAMETERS}),modified:experimentTrial(config,config.parameters??{...DEFAULT_PARAMETERS})}
}
export function sensorPresentation(playback:TransportSnapshot) {
  const s=playback.simulation
  const scanning=s.phase==='sensor'&&playback.status==='playing'&&!playback.settling
  const waiting=s.phase==='sensor'&&playback.status==='paused'
  const reading=scanning||waiting?null:s.inspections.at(-1)
  let model:SensorModel|null=null,modelError:string|null=null
  try{model=sensorModel(s.config.parameters??DEFAULT_PARAMETERS)}catch(error){modelError=error instanceof Error?error.message:'Invalid sensor model.'}
  const error=modelError || playback.error || (s.phase==='error'?s.result?.message:null) || (s.phase==='unresolved'&&s.result?.message.includes('observations exhausted')?s.result.message:null)
  return {status:error?'error':waiting?'paused':scanning?'scanning':reading?'completed':'idle',observation:reading?.observation??null,confidence:reading?.bayesian?.confidence??null,likelihoods:reading&&model?getSensorLikelihoods(reading.observation,model):null,model,error}
}
