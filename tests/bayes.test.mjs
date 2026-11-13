import test from 'node:test'
import assert from 'node:assert/strict'
import { BAYES_MATERIALS, getBayesPriors, inferMaterial } from '../src/algorithms/bayes.ts'

const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-12, `${actual} != ${expected}`)

test('PLASTIC observation: priors, likelihoods, evidence, posterior, winner, confidence', () => {
  const result = inferMaterial('PLASTIC')
  assert.equal(result.observation, 'PLASTIC')
  assert.deepEqual(result.priors, { PLASTIC: 0.5, PAPER: 0.5 })
  assert.deepEqual(result.likelihoods, { PLASTIC: 0.9, PAPER: 0.2 })
  close(result.evidence, 0.55)
  close(result.posteriors.PLASTIC, 9 / 11)
  close(result.posteriors.PAPER, 2 / 11)
  assert.equal(result.mostLikelyMaterial, 'PLASTIC')
  close(result.confidence, 9 / 11)
})

test('PAPER observation: uses the paper sensor likelihoods', () => {
  const result = inferMaterial('PAPER')
  assert.equal(result.observation, 'PAPER')
  assert.deepEqual(result.priors, { PLASTIC: 0.5, PAPER: 0.5 })
  assert.deepEqual(result.likelihoods, { PLASTIC: 0.1, PAPER: 0.8 })
  close(result.evidence, 0.45)
  close(result.posteriors.PLASTIC, 1 / 9)
  close(result.posteriors.PAPER, 8 / 9)
  assert.equal(result.mostLikelyMaterial, 'PAPER')
  close(result.confidence, 8 / 9)
})

test('each observation produces a normalized distribution with bounded probabilities', () => {
  for (const observation of BAYES_MATERIALS) {
    const result = inferMaterial(observation)
    close(Object.values(result.priors).reduce((a, b) => a + b, 0), 1)
    close(Object.values(result.posteriors).reduce((a, b) => a + b, 0), 1)
    for (const probability of [...Object.values(result.posteriors), result.confidence, result.evidence]) {
      assert.ok(Number.isFinite(probability) && probability >= 0 && probability <= 1)
    }
    for (const material of BAYES_MATERIALS) {
      close(result.posteriors[material] * result.evidence, result.likelihoods[material] * result.priors[material])
    }
  }
  close(inferMaterial('PLASTIC').evidence + inferMaterial('PAPER').evidence, 1)
})

test('rejects unknown materials, wrong case, and non-string inputs', () => {
  for (const value of ['METAL', 'plastic', 'paper', '', ' PLASTIC', 'PAPER ', null, undefined, 0, NaN, true, {}, [], ['PLASTIC'], new String('PLASTIC')]) {
    assert.throws(() => inferMaterial(value), { name: 'TypeError', message: 'Observation must be PLASTIC or PAPER.' })
  }
})

test('results are independent: caller mutations and previous observations do not alter the model', () => {
  const result = inferMaterial('PLASTIC')
  result.priors.PLASTIC = 0
  result.likelihoods.PAPER = 1
  result.posteriors.PLASTIC = 0
  const priors = getBayesPriors()
  priors.PAPER = 0
  inferMaterial('PAPER')
  const fresh = inferMaterial('PLASTIC')
  assert.deepEqual(fresh.priors, { PLASTIC: 0.5, PAPER: 0.5 })
  assert.deepEqual(fresh.likelihoods, { PLASTIC: 0.9, PAPER: 0.2 })
  close(fresh.posteriors.PLASTIC, 9 / 11)
})
