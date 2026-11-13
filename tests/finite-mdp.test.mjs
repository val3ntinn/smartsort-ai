import test from 'node:test'
import assert from 'node:assert/strict'
import { solveSortingMDP } from '../src/algorithms/finiteMdp.ts'
import { evaluateSortingDecision } from '../src/algorithms/mdp.ts'
import { inferMaterial, getSensorLikelihoods } from '../src/algorithms/bayes.ts'
import { DEFAULT_PARAMETERS, sensorModel } from '../src/simulation/parameters.ts'
import { advanceSimulation,defaultConfig,isRunning,startSimulation } from '../src/simulation/controller.ts'
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`)
const model=sensorModel(DEFAULT_PARAMETERS)
function bruteValue(b,h,penalty){const r=evaluateSortingDecision(b,penalty);if(!h)return Math.max(0,r.expectedRewards.SORT);let future=0;for(const o of ['PLASTIC','PAPER']){const l=getSensorLikelihoods(o,model),p=b.PLASTIC*l.PLASTIC+b.PAPER*l.PAPER;if(p)future+=p*bruteValue(inferMaterial(o,b,model).posteriors,h-1,penalty)}return Math.max(r.expectedRewards.SORT,r.expectedRewards['INSPECT AGAIN']+future)}

test('finite planner matches an independent exhaustive Bellman tree',()=>{
 for(const plastic of [.1,.5,9/11,.99])for(const h of [0,1,2,3])for(const penalty of [-8,-40]) {
  const belief={PLASTIC:plastic,PAPER:1-plastic},r=solveSortingMDP(belief,{model,remainingInspections:h,wrongSortReward:penalty})
  close(r.value,bruteValue(belief,h,penalty));assert.equal(r.horizon,h)
  if(h){close(r.transitions.reduce((s,t)=>s+t.probability,0),1);close(r.actionValues['INSPECT AGAIN'],r.expectedRewards['INSPECT AGAIN']+r.transitions.reduce((s,t)=>s+t.weightedValue,0));for(const t of r.transitions){assert.deepEqual(t.posterior,inferMaterial(t.observation,belief,model).posteriors);assert.equal(t.remainingInspections,h-1)}}
 }
})
test('81.82% baseline values remain 6.73/2.82 while sequential Q includes actual future reward',()=>{
 const b=inferMaterial('PLASTIC').posteriors,r=solveSortingMDP(b,{model,remainingInspections:2})
 close(r.expectedRewards.SORT,74/11);close(r.expectedRewards['INSPECT AGAIN'],31/11)
 assert.equal(r.selectedAction,'INSPECT AGAIN');assert.ok(r.actionValues['INSPECT AGAIN']>r.actionValues.SORT)
 assert.ok(r.statesEvaluated<20,'memoization avoids duplicate belief subproblems')
})
test('exhausted budgets forbid sensing and safely distinguish profitable sort from unresolved',()=>{
 const yes=solveSortingMDP({PLASTIC:.9,PAPER:.1},{model,remainingInspections:0})
 assert.equal(yes.selectedAction,'SORT');assert.equal(yes.actionValues['INSPECT AGAIN'],null);assert.deepEqual(yes.transitions,[])
 const no=solveSortingMDP({PLASTIC:.5,PAPER:.5},{model,remainingInspections:0,wrongSortReward:-40})
 assert.equal(no.selectedAction,'UNRESOLVED');assert.equal(no.value,0);assert.equal(no.evaluations[1].available,false)
})
test('impossible observation branches have zero weight and never yield NaN',()=>{
 const perfect={PLASTIC:{PLASTIC:1,PAPER:0},PAPER:{PLASTIC:0,PAPER:1}}
 const r=solveSortingMDP({PLASTIC:1,PAPER:0},{model:perfect,remainingInspections:3})
 assert.equal(r.transitions.length,1);assert.equal(r.transitions[0].probability,1);assert.ok(Number.isFinite(r.value))
 for(const h of [-1,1.5,11,NaN])assert.throws(()=>solveSortingMDP({PLASTIC:.5,PAPER:.5},{model,remainingInspections:h}))
})
test('live agent uses sequential decisions and never sees a future scripted observation',()=>{
 const a=startSimulation({...defaultConfig(),sensor:{mode:'predefined',observations:['PLASTIC','PLASTIC','PLASTIC']}})
 const b=startSimulation({...defaultConfig(),sensor:{mode:'predefined',observations:['PLASTIC','PAPER','PAPER']}})
 let aa=a,bb=b;for(let i=0;i<3;i++){aa=advanceSimulation(aa);bb=advanceSimulation(bb)}
 assert.deepEqual(aa.decision,bb.decision);assert.equal(aa.decision.kind,'finite-horizon');assert.equal(aa.decision.selectedAction,'INSPECT AGAIN')
 let s=a;for(let i=0;isRunning(s.phase)&&i<300;i++)s=advanceSimulation(s)
 assert.equal(s.phase,'sorted');assert.equal(s.inspections.length,3);assert.equal(s.decision.horizon,0)
 assert.deepEqual(s.inspections[1].bayesian.priors,s.inspections[0].bayesian.posteriors)
})
