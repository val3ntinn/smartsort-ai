import type { BayesMaterial, Probabilities } from './bayes'

export type MdpAction = 'SORT' | 'INSPECT AGAIN'
export interface ActionEvaluation {
  action: MdpAction
  rewards: { correct: number; wrong: number }
  contributions: { correct: number; wrong: number }
  expectedReward: number
}
export interface MdpResult {
  horizon: 1
  proposedMaterial: BayesMaterial
  probabilities: { correct: number; wrong: number }
  evaluations: ActionEvaluation[]
  expectedRewards: Record<MdpAction, number>
  selectedAction: MdpAction
  selectedExpectedReward: number
  rewardAdvantage: number
  isTie: boolean
  explanation: string
}

const REWARDS: Record<MdpAction, { correct: number; wrong: number }> = {
  SORT: { correct: 10, wrong: -8 },
  'INSPECT AGAIN': { correct: 3, wrong: 2 },
}

/** One-decision finite-horizon model (horizon = 1, terminal value = 0).
 * The proposed material is the maximum-posterior Bayesian classification.
 * Correct/wrong refer to whether that classification matches the true material.
 * Inspecting is a recommendation; no unprovided future observations or transitions
 * are invented. Equal utilities deterministically favor another inspection.
 */
export function evaluateSortingDecision(posteriors: Readonly<Probabilities>, wrongSortReward = -8): MdpResult {
  if (posteriors === null || typeof posteriors !== 'object' || Array.isArray(posteriors)) {
    throw new TypeError('Bayesian posteriors must contain PLASTIC and PAPER probabilities.')
  }
  if(!Number.isFinite(wrongSortReward) || wrongSortReward>0)throw new RangeError('Incorrect sorting reward must be a finite, non-positive penalty.')
  const configuredRewards={...REWARDS,SORT:{...REWARDS.SORT,wrong:wrongSortReward===0?0:wrongSortReward}}
  const plastic = posteriors.PLASTIC
  const paper = posteriors.PAPER
  if (typeof plastic !== 'number' || typeof paper !== 'number') {
    throw new TypeError('Bayesian posteriors must contain PLASTIC and PAPER probabilities.')
  }
  if (![plastic, paper].every(value => Number.isFinite(value) && value >= 0 && value <= 1)) {
    throw new RangeError('Posterior probabilities must be finite numbers between 0 and 1.')
  }
  if (Math.abs(plastic + paper - 1) > 1e-10) {
    throw new RangeError('Posterior probabilities must sum to 1.')
  }
  const proposedMaterial: BayesMaterial = plastic >= paper ? 'PLASTIC' : 'PAPER'
  const probabilities = { correct: posteriors[proposedMaterial], wrong: posteriors[proposedMaterial === 'PLASTIC' ? 'PAPER' : 'PLASTIC'] }
  const evaluations = (Object.keys(configuredRewards) as MdpAction[]).map(action => {
    const rewards = { ...configuredRewards[action] }
    const contributions = { correct: probabilities.correct * rewards.correct, wrong: (probabilities.wrong * rewards.wrong) || 0 }
    return { action, rewards, contributions, expectedReward: contributions.correct + contributions.wrong }
  })
  const expectedRewards = Object.fromEntries(evaluations.map(value => [value.action, value.expectedReward])) as Record<MdpAction, number>
  const difference = expectedRewards.SORT - expectedRewards['INSPECT AGAIN']
  // Absorb floating-point roundoff at an exact mathematical utility tie.
  const isTie = Math.abs(difference) <= 1e-12
  const selectedAction: MdpAction = !isTie && difference > 0 ? 'SORT' : 'INSPECT AGAIN'
  const rewardAdvantage = isTie ? 0 : Math.abs(difference)
  const explanation = `For proposed ${proposedMaterial}, P(correct) = ${(probabilities.correct * 100).toFixed(2)}% and P(wrong) = ${(probabilities.wrong * 100).toFixed(2)}%. ` +
    `SORT: ${expectedRewards.SORT.toFixed(2)}; INSPECT AGAIN: ${expectedRewards['INSPECT AGAIN'].toFixed(2)} expected reward. ` +
    (isTie ? 'Utilities are equal; inspect again is the tie-break choice.' : `${selectedAction} has the higher expected reward by ${rewardAdvantage.toFixed(2)}.`)
  return { horizon: 1, proposedMaterial, probabilities, evaluations, expectedRewards, selectedAction, selectedExpectedReward: expectedRewards[selectedAction], rewardAdvantage, isTie, explanation }
}
