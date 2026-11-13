import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { startSimulation,advanceSimulation,isRunning } from '../src/simulation/controller.ts'
const fixtures=JSON.parse(fs.readFileSync(new URL('../notebooks/reference_results.json',import.meta.url),'utf8')).scenarios
for(const fixture of fixtures)test(`submission reference ${fixture.id}: real controller trace and outcome`,()=>{
 let state=startSimulation(fixture.config),steps=0
 while(isRunning(state.phase)){state=advanceSimulation(state);assert.ok(++steps<500)}
 const inspections=state.inspections.map(i=>({observation:i.observation,bayesian:i.bayesian,decision:Object.fromEntries(['horizon','proposedMaterial','expectedRewards','actionValues','selectedAction','value','transitions'].map(k=>[k,i.decision[k]]))}))
 assert.deepEqual(inspections,fixture.inspections)
 assert.deepEqual(state.belief,fixture.posterior)
 assert.deepEqual(state.bfs,fixture.bfs)
 assert.deepEqual(state.result,fixture.result)
 assert.equal(state.target,fixture.destination)
})
