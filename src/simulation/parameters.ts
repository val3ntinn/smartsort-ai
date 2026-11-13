import type { SensorModel } from '../algorithms/bayes.ts'
export interface ExperimentParameters { sensorAccuracy:number; incorrectSortPenalty:number; maxInspections:number }
export const DEFAULT_PARAMETERS:Readonly<ExperimentParameters>={sensorAccuracy:.85,incorrectSortPenalty:8,maxInspections:3}
export function validateParameters(value:ExperimentParameters):ExperimentParameters {
  if(!value || !Number.isFinite(value.sensorAccuracy) || value.sensorAccuracy<.5 || value.sensorAccuracy>.95)throw new RangeError('Sensor accuracy must be between 50% and 95%.')
  if(!Number.isFinite(value.incorrectSortPenalty) || value.incorrectSortPenalty<0 || value.incorrectSortPenalty>40)throw new RangeError('Incorrect-sort penalty must be between 0 and 40.')
  if(!Number.isInteger(value.maxInspections) || value.maxInspections<1 || value.maxInspections>10)throw new RangeError('Inspection limit must be an integer from 1 to 10.')
  return {...value}
}
/** Average accuracy across equally weighted classes. Preserve the original
 * five-point class asymmetry: default .85 means .90 Plastic / .80 Paper.
 */
export function sensorModel(parameters:ExperimentParameters):SensorModel {
  const {sensorAccuracy:a}=validateParameters(parameters)
  const plastic=Number((a+.05).toFixed(12)),paper=Number((a-.05).toFixed(12))
  return {PLASTIC:{PLASTIC:plastic,PAPER:Number((1-paper).toFixed(12))},PAPER:{PLASTIC:Number((1-plastic).toFixed(12)),PAPER:paper}}
}
