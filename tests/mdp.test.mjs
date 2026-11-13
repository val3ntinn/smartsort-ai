import test from 'node:test'
import assert from 'node:assert/strict'
import { evaluateSortingDecision } from '../src/algorithms/mdp.ts'
import { getBayesPriors, inferMaterial } from '../src/algorithms/bayes.ts'

const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-12, `${actual} != ${expected}`)

test('live PLASTIC Bayesian posterior selects SORT with the requested expected rewards', () => {
  const bayesian = inferMaterial('PLASTIC')
  const result = evaluateSortingDecision(bayesian.posteriors)
  assert.equal(result.proposedMaterial, 'PLASTIC')
  assert.equal(result.horizon, 1)
  assert.equal(result.selectedAction, 'SORT')
  close(result.probabilities.correct, 9/11)
  close(result.probabilities.wrong, 2/11)
  close(result.expectedRewards.SORT, 74/11)
  close(result.expectedRewards['INSPECT AGAIN'], 31/11)
  close(result.selectedExpectedReward, 74/11)
  close(result.rewardAdvantage, 43/11)
  assert.match(result.explanation, /SORT: 6.73; INSPECT AGAIN: 2.82/)
  assert.match(result.explanation, /SORT has the higher expected reward/)
})

test('live PAPER Bayesian posterior uses Paper confidence rather than Plastic probability', () => {
  const result = evaluateSortingDecision(inferMaterial('PAPER').posteriors)
  assert.equal(result.proposedMaterial, 'PAPER')
  assert.equal(result.selectedAction, 'SORT')
  close(result.probabilities.correct, 8/9)
  close(result.probabilities.wrong, 1/9)
  close(result.expectedRewards.SORT, 8)
  close(result.expectedRewards['INSPECT AGAIN'], 26/9)
})

test('uncertain posterior selects INSPECT AGAIN for either likely material', () => {
  for (const posteriors of [{PLASTIC:.55,PAPER:.45},{PLASTIC:.45,PAPER:.55}]) {
    const result = evaluateSortingDecision(posteriors)
    assert.equal(result.selectedAction, 'INSPECT AGAIN')
    close(result.expectedRewards.SORT, 1.9)
    close(result.expectedRewards['INSPECT AGAIN'], 2.55)
    close(result.selectedExpectedReward, 2.55)
    close(result.rewardAdvantage, .65)
    assert.match(result.explanation, /INSPECT AGAIN has the higher expected reward/)
  }
})

test('reward breakdown contains actual rewards and probability-weighted contributions', () => {
  const result = evaluateSortingDecision({PLASTIC:.8,PAPER:.2})
  assert.deepEqual(result.evaluations[0].rewards, {correct:10,wrong:-8})
  assert.deepEqual(result.evaluations[1].rewards, {correct:3,wrong:2})
  close(result.evaluations[0].contributions.correct, 8)
  close(result.evaluations[0].contributions.wrong, -1.6)
  close(result.evaluations[1].contributions.correct, 2.4)
  close(result.evaluations[1].contributions.wrong, .4)
  for (const evaluation of result.evaluations) {
    close(evaluation.contributions.correct + evaluation.contributions.wrong, evaluation.expectedReward)
    close(result.expectedRewards[evaluation.action], evaluation.expectedReward)
  }
})

test('equal priors favor inspection; certainty favors sorting', () => {
  const uncertain = evaluateSortingDecision(getBayesPriors())
  assert.equal(uncertain.selectedAction, 'INSPECT AGAIN')
  close(uncertain.expectedRewards.SORT, 1)
  close(uncertain.expectedRewards['INSPECT AGAIN'], 2.5)
  for (const posteriors of [{PLASTIC:1,PAPER:0},{PLASTIC:0,PAPER:1}]) {
    const result = evaluateSortingDecision(posteriors)
    assert.equal(result.selectedAction, 'SORT')
    close(result.expectedRewards.SORT, 10)
    close(result.expectedRewards['INSPECT AGAIN'], 3)
  }
})

test('action changes at the calculated reward intersection; exact tie favors inspection', () => {
  const threshold = 10/17 // 10p - 8(1-p) = 3p + 2(1-p)
  const below = evaluateSortingDecision({PLASTIC:threshold-1e-8,PAPER:1-threshold+1e-8})
  const above = evaluateSortingDecision({PLASTIC:threshold+1e-8,PAPER:1-threshold-1e-8})
  assert.equal(below.selectedAction, 'INSPECT AGAIN')
  assert.equal(above.selectedAction, 'SORT')
  const tie = evaluateSortingDecision({PLASTIC:threshold,PAPER:1-threshold})
  assert.equal(tie.isTie, true)
  assert.equal(tie.selectedAction, 'INSPECT AGAIN')
  assert.equal(tie.rewardAdvantage, 0)
  assert.match(tie.explanation, /Utilities are equal/)
})

test('rejects missing, non-numeric, non-finite, out-of-range, and unnormalized posteriors', () => {
  for (const input of [null,undefined,[],.8,'PLASTIC',{}, {PLASTIC:.8}, {PLASTIC:'0.8',PAPER:.2}]) {
    assert.throws(() => evaluateSortingDecision(input), TypeError)
  }
  for (const input of [{PLASTIC:NaN,PAPER:.2},{PLASTIC:Infinity,PAPER:0},{PLASTIC:-.1,PAPER:1.1},{PLASTIC:1.1,PAPER:-.1},{PLASTIC:.8,PAPER:.8},{PLASTIC:0,PAPER:0}]) {
    assert.throws(() => evaluateSortingDecision(input), RangeError)
  }
})

test('does not mutate Bayesian output and result mutations cannot change later decisions', () => {
  const posteriors = Object.freeze(inferMaterial('PLASTIC').posteriors)
  const first = evaluateSortingDecision(posteriors)
  first.evaluations[0].rewards.correct = -100
  first.expectedRewards.SORT = -100
  first.probabilities.correct = 0
  const fresh = evaluateSortingDecision(posteriors)
  assert.equal(fresh.selectedAction, 'SORT')
  assert.equal(fresh.evaluations[0].rewards.correct, 10)
  close(fresh.expectedRewards.SORT, 74/11)
  close(posteriors.PLASTIC, 9/11)
})
