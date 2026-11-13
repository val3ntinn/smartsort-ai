import type { BayesMaterial, SensorModel } from '../algorithms/bayes.ts'
import { getSensorLikelihoods } from '../algorithms/bayes.ts'

export const OBJECTS = [
  { id: 'plastic-bottle', label: 'Plastic bottle', material: 'PLASTIC', detail: 'Polymer / Plastic category' },
  { id: 'paper-sheet', label: 'Paper sheet', material: 'PAPER', detail: 'Fiber / Paper category' },
  { id: 'cardboard-box', label: 'Cardboard box', material: 'PAPER', detail: 'Cardboard / Paper category' },
] as const
export type ObjectId = typeof OBJECTS[number]['id']
export type SensorConfig = { mode: 'seeded'; seed: number } | { mode: 'predefined'; observations: readonly BayesMaterial[] }

export function sampleSensor(material: BayesMaterial, seed: number, model?:SensorModel): { observation: BayesMaterial; nextSeed: number; draw: number } {
  validateSensorSeed(seed)
  const nextSeed = (Math.imul(1664525, seed) + 1013904223) >>> 0
  const draw = nextSeed / 4294967296
  const observation = draw < getSensorLikelihoods('PLASTIC',model)[material] ? 'PLASTIC' : 'PAPER'
  return { observation, nextSeed, draw }
}

export function validateSensorSeed(seed:number):void {if(!Number.isInteger(seed)||seed<0||seed>0xffffffff)throw new RangeError('Seed must be an integer between 0 and 4294967295.')}
