import test from 'node:test'
import assert from 'node:assert/strict'
import { inferMaterial, getSensorLikelihoods } from '../src/algorithms/bayes.ts'
import { solveSortingMDP } from '../src/algorithms/finiteMdp.ts'
import { sensorModel,DEFAULT_PARAMETERS } from '../src/simulation/parameters.ts'
import { bfs } from '../src/algorithms/bfs.ts'
import { advanceSimulation, cancelSimulation, createSimulation, defaultConfig, isRunning, resetSimulation, startSimulation } from '../src/simulation/controller.ts'
import { sampleSensor } from '../src/simulation/sensor.ts'

const close = (a,b) => assert.ok(Math.abs(a-b)<1e-12,`${a} != ${b}`)
const config = (overrides={}) => ({...defaultConfig(),parameters:{sensorAccuracy:.85,incorrectSortPenalty:8,maxInspections:1},sensor:{mode:'predefined',observations:['PLASTIC']},...overrides})
function run(input) {
  let state=startSimulation(input)
  const snapshots=[state]
  for(let step=0; isRunning(state.phase) && step<200; step++) { state=advanceSimulation(state);snapshots.push(state) }
  assert.ok(!isRunning(state.phase),'controller must terminate')
  return {state,snapshots}
}

test('plastic bottle runs the connected sensor -> Bayes -> MDP -> BFS -> robot -> result pipeline',()=>{
  const {state,snapshots}=run(config())
  assert.equal(state.phase,'sorted')
  assert.equal(state.result.outcome,'correct')
  assert.equal(state.target,3)
  assert.equal(state.robotCell,3)
  assert.equal(state.result.trueMaterial,'PLASTIC')
  assert.equal(state.inspections.length,1)
  close(state.bayesian.posteriors.PLASTIC,9/11)
  assert.deepEqual(state.decision,solveSortingMDP(state.bayesian.posteriors,{model:sensorModel(DEFAULT_PARAMETERS),remainingInspections:0}))
  assert.deepEqual(state.bfs,bfs({rows:4,columns:4,start:12,target:3,obstacles:[7]}))
  assert.equal(state.result.moves,state.bfs.pathLength)
  assert.deepEqual(snapshots.filter(s=>s.phase==='moving').map(s=>s.robotCell),state.bfs.path.slice(0,-1))
  for(const stage of ['SENSOR','BAYES','MDP','BFS','ROBOT','RESULT']) assert.ok(state.logs.some(event=>event.time===stage))
  assert.equal(snapshots.find(s=>s.phase==='decision').decision,null,'MDP result is not fabricated before its stage')
})

test('paper sheet uses Paper classification and Paper destination',()=>{
  const {state}=run(config({objectId:'paper-sheet',sensor:{mode:'predefined',observations:['PAPER']}}))
  assert.equal(state.result.outcome,'correct')
  assert.equal(state.result.predictedMaterial,'PAPER')
  assert.equal(state.target,7)
  close(state.bayesian.confidence,8/9)
})

test('cardboard box belongs to Paper and sorts into the Paper bin',()=>{
  const {state}=run(config({objectId:'cardboard-box',sensor:{mode:'predefined',observations:['PAPER']}}))
  assert.equal(state.result.trueMaterial,'PAPER')
  assert.equal(state.result.outcome,'correct')
  assert.equal(state.robotCell,7)
})

test('incorrect sensor observation is not secretly corrected using object ground truth',()=>{
  const {state}=run(config({sensor:{mode:'predefined',observations:['PAPER']}}))
  assert.equal(state.decision.selectedAction,'SORT')
  assert.equal(state.result.trueMaterial,'PLASTIC')
  assert.equal(state.result.predictedMaterial,'PAPER')
  assert.equal(state.robotCell,7)
  assert.equal(state.result.outcome,'incorrect')
  assert.match(state.result.message,/imperfect sensor/)
})

test('real INSPECT AGAIN decision collects another observation and carries the posterior forward',()=>{
  const {state,snapshots}=run(config({objectId:'paper-sheet',parameters:{sensorAccuracy:.85,incorrectSortPenalty:8,maxInspections:2},initialPriors:{PLASTIC:.2,PAPER:.8},sensor:{mode:'predefined',observations:['PLASTIC','PAPER']}}))
  assert.equal(state.inspections.length,2)
  assert.equal(state.inspections[0].decision.selectedAction,'INSPECT AGAIN')
  assert.deepEqual(state.inspections[1].bayesian.priors,state.inspections[0].bayesian.posteriors)
  close(state.inspections[0].bayesian.posteriors.PLASTIC,9/17)
  close(state.inspections[1].bayesian.posteriors.PLASTIC,9/73)
  assert.notEqual(state.inspections[1].bayesian.posteriors.PLASTIC,inferMaterial('PAPER').posteriors.PLASTIC)
  assert.equal(state.result.outcome,'correct')
  assert.equal(state.result.inspections,2)
  assert.equal(snapshots.filter(s=>s.phase==='bayes').length,2)
})

test('successful navigation follows each actual BFS edge and never an obstacle',()=>{
  const input=config({start:0,obstacles:[1,5,9]})
  const {state,snapshots}=run(input)
  assert.equal(state.result.outcome,'correct')
  assert.equal(state.bfs.pathLength,9)
  const positions=snapshots.map(s=>s.robotCell).filter((cell,index,all)=>index===0 || cell!==all[index-1])
  assert.deepEqual(positions,state.bfs.path)
  for(const cell of positions) assert.ok(!input.obstacles.includes(cell))
  for(const snapshot of snapshots) {
    if(snapshot.bfs) {
      assert.deepEqual(snapshot.bfs.visitedCells.slice(0,snapshot.visitedCount),state.bfs.visitedCells.slice(0,snapshot.visitedCount))
      assert.ok(snapshot.pathCount<=snapshot.bfs.path.length)
    }
  }
})

test('unreachable destination stops without moving or claiming a sorted object',()=>{
  const {state}=run(config({obstacles:[2]})) // Paper bin at 7 also blocks the Plastic target's lower neighbor.
  assert.equal(state.phase,'unreachable')
  assert.equal(state.result.outcome,'unreachable')
  assert.equal(state.bfs.pathFound,false)
  assert.equal(state.robotCell,12)
  assert.equal(state.result.moves,0)
  assert.equal(state.visitedCount,state.bfs.visitedCells.length)
  assert.equal(state.logs.some(event=>event.time==='ROBOT'),false)
})

test('predefined sequence exhaustion stops unresolved instead of inventing another observation',()=>{
  const {state}=run(config({parameters:{...DEFAULT_PARAMETERS,maxInspections:3},initialPriors:{PLASTIC:.2,PAPER:.8}}))
  assert.equal(state.phase,'unresolved')
  assert.equal(state.inspections.length,1)
  assert.equal(state.bfs,null)
  assert.match(state.result.message,/exhausted/)
})

test('three-inspection safety guards forbid a fourth reading or a move on unresolved belief',()=>{
  // Safety-state fixture: an unsafe belief at an exhausted budget must terminate unresolved.
  // Exercise the controller boundary directly without replacing any working algorithm.
  const bayesian=inferMaterial('PLASTIC',{PLASTIC:.2,PAPER:.8})
  const inspections=Array.from({length:3},()=>({observation:'PLASTIC',bayesian,decision:null}))
  const pending={...createSimulation(config({parameters:{...DEFAULT_PARAMETERS,incorrectSortPenalty:40,maxInspections:3}})),phase:'decision',bayesian,belief:bayesian.posteriors,inspections}
  const stopped=advanceSimulation(pending)
  assert.equal(stopped.phase,'unresolved')
  assert.equal(stopped.inspections.length,3)
  assert.equal(stopped.robotCell,12)
  assert.equal(stopped.bfs,null)
  const sensorBoundary=advanceSimulation({...pending,phase:'sensor'})
  assert.equal(sensorBoundary.phase,'unresolved')
  assert.equal(sensorBoundary.inspections.length,3)
  assert.strictEqual(advanceSimulation(sensorBoundary),sensorBoundary)
})

test('seeded sensor uses the same likelihoods as Bayes and supports incorrect observations',()=>{
  let seed=42
  let plasticMatches=0,paperPlasticReadings=0
  for(let i=0;i<10000;i++) {
    const plastic=sampleSensor('PLASTIC',seed)
    const paper=sampleSensor('PAPER',seed)
    assert.equal(plastic.observation,plastic.draw<getSensorLikelihoods('PLASTIC').PLASTIC?'PLASTIC':'PAPER')
    assert.equal(paper.observation,paper.draw<getSensorLikelihoods('PLASTIC').PAPER?'PLASTIC':'PAPER')
    plasticMatches+=plastic.observation==='PLASTIC'?1:0
    paperPlasticReadings+=paper.observation==='PLASTIC'?1:0
    seed=plastic.nextSeed
  }
  assert.ok(Math.abs(plasticMatches/10000-.9)<.02)
  assert.ok(Math.abs(paperPlasticReadings/10000-.2)<.02)
  assert.ok(plasticMatches<10000 && paperPlasticReadings>0)
  assert.deepEqual(sampleSensor('PLASTIC',42),sampleSensor('PLASTIC',42))
  const input=config({sensor:{mode:'seeded',seed:42}})
  assert.deepEqual(run(input).state,run(input).state)
})

test('reset during exploration or movement clears the entire simulation and allows a clean seeded replay',()=>{
  for(const phase of ['exploring','moving','sorted']) {
    let state=startSimulation(config({sensor:{mode:'seeded',seed:42}}))
    for(let i=0;i<200 && state.phase!==phase;i++) state=advanceSimulation(state)
    assert.equal(state.phase,phase)
    const reset=resetSimulation()
    assert.deepEqual(reset,createSimulation())
    assert.equal(reset.phase,'idle')
    assert.equal(reset.logs.length,0)
    assert.equal(reset.robotCell,12)
    assert.equal(reset.bayesian,null)
    assert.equal(reset.decision,null)
    assert.equal(reset.bfs,null)
    assert.equal(reset.result,null)
    assert.deepEqual(reset.inspections,[])
    assert.strictEqual(advanceSimulation(reset),reset)
  }
})

test('cancel is terminal and config snapshots are independent from caller mutations',()=>{
  const input=config()
  const state=startSimulation(input)
  input.obstacles.push(8)
  input.sensor.observations[0]='PAPER'
  assert.deepEqual(state.config.obstacles,[])
  assert.equal(state.config.sensor.observations[0],'PLASTIC')
  const stopped=cancelSimulation(state)
  assert.equal(stopped.phase,'cancelled')
  assert.strictEqual(advanceSimulation(stopped),stopped)
})

test('invalid config, sensor scripts, seeds, and priors are rejected before running',()=>{
  for(const overrides of [{start:3},{start:16},{obstacles:[12]},{obstacles:[7]},{objectId:'glass'},{sensor:{mode:'seeded',seed:-1}},{sensor:{mode:'seeded',seed:1.2}},{sensor:{mode:'predefined',observations:[]}},{sensor:{mode:'predefined',observations:['METAL']}},{sensor:{mode:'predefined',observations:['PAPER','PAPER','PAPER','PAPER']}},{initialPriors:{PLASTIC:.8,PAPER:.8}}]) {
    assert.throws(()=>startSimulation(config(overrides)))
  }
})

test('Bayes accepts sequential priors without mutating them and rejects invalid priors',()=>{
  const first=inferMaterial('PLASTIC')
  const frozen=Object.freeze({...first.posteriors})
  const second=inferMaterial('PAPER',frozen)
  assert.deepEqual(second.priors,first.posteriors)
  close(second.posteriors.PLASTIC,9/25)
  for(const invalid of [null,[],{}, {PLASTIC:-1,PAPER:2},{PLASTIC:NaN,PAPER:.5},{PLASTIC:.3,PAPER:.3}]) assert.throws(()=>inferMaterial('PLASTIC',invalid))
})
