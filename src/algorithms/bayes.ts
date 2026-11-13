export const BAYES_MATERIALS = ['PLASTIC', 'PAPER'] as const
export type BayesMaterial = (typeof BAYES_MATERIALS)[number]
export type Probabilities = Record<BayesMaterial, number>

export type SensorModel = Record<BayesMaterial, Probabilities>

export interface BayesResult {
  observation: BayesMaterial
  priors: Probabilities
  /** P(observation | material), not P(material | observation). */
  likelihoods: Probabilities
  evidence: number
  posteriors: Probabilities
  mostLikelyMaterial: BayesMaterial
  confidence: number
}

const PRIORS: Readonly<Probabilities> = { PLASTIC: 0.5, PAPER: 0.5 }
const SENSOR_MODEL: Readonly<Record<BayesMaterial, Readonly<Probabilities>>> = {
  PLASTIC: { PLASTIC: 0.9, PAPER: 0.2 },
  PAPER: { PLASTIC: 0.1, PAPER: 0.8 },
}

export function getBayesPriors(): Probabilities {
  return { ...PRIORS }
}

/** Update a two-material belief from one observation.
 * All returned probabilities are unrounded values in [0, 1].
 * Pass the previous posterior as priorProbabilities for repeated inspections.
 */
export function inferMaterial(observation: unknown, priorProbabilities: Readonly<Probabilities> = PRIORS, model: SensorModel = SENSOR_MODEL): BayesResult {
  if (observation !== 'PLASTIC' && observation !== 'PAPER') {
    throw new TypeError('Observation must be PLASTIC or PAPER.')
  }
  validateProbabilities(priorProbabilities)
  const priors = { ...priorProbabilities }
  validateSensorModel(model)
  const likelihoods = { ...model[observation] }
  const weights = {
    PLASTIC: likelihoods.PLASTIC * priors.PLASTIC,
    PAPER: likelihoods.PAPER * priors.PAPER,
  }
  const evidence = weights.PLASTIC + weights.PAPER
  if(!Number.isFinite(evidence) || evidence<=0)throw new RangeError('This observation has zero probability under the current prior and sensor model.')
  const posteriors = {
    PLASTIC: weights.PLASTIC / evidence,
    PAPER: weights.PAPER / evidence,
  }
  const mostLikelyMaterial = posteriors.PLASTIC >= posteriors.PAPER ? 'PLASTIC' : 'PAPER'
  return { observation, priors, likelihoods, evidence, posteriors, mostLikelyMaterial, confidence: posteriors[mostLikelyMaterial] }
}

/** Shared likelihoods keep the simulated sensor consistent with inference. */
export function getSensorLikelihoods(observation: BayesMaterial, model: SensorModel = SENSOR_MODEL): Probabilities {
  if(observation!=='PLASTIC'&&observation!=='PAPER')throw new TypeError('Observation must be PLASTIC or PAPER.')
  validateSensorModel(model)
  return { ...model[observation] }
}

export function validateSensorModel(model:SensorModel):void {
  for(const material of BAYES_MATERIALS) {
    const values=BAYES_MATERIALS.map(observation=>model?.[observation]?.[material])
    if(!values.every(value=>typeof value==='number' && Number.isFinite(value) && value>=0 && value<=1) || Math.abs(values[0]+values[1]-1)>1e-10)throw new RangeError('Sensor likelihoods must be normalized probabilities for each material.')
  }
}

export function validateProbabilities(value:unknown):asserts value is Probabilities {
  if(!value||typeof value!=='object'||Array.isArray(value))throw new TypeError('Belief must contain PLASTIC and PAPER probabilities.')
  const p=value as Probabilities,values=[p.PLASTIC,p.PAPER]
  if(!values.every(n=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=1)||Math.abs(p.PLASTIC+p.PAPER-1)>1e-10)throw new RangeError('Belief probabilities must be finite and sum to 1.')
}
