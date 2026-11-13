import test from 'node:test'
import assert from 'node:assert/strict'
import { defaultConfig, startSimulation,advanceSimulation,isRunning } from '../src/simulation/controller.ts'
import { createHistoryRecord,isHistoryRecord,replayFrames } from '../src/simulation/history.ts'
import { createSimulationTransport } from '../src/simulation/transport.ts'
import { evaluateSortingDecision } from '../src/algorithms/mdp.ts'
import { bfs } from '../src/algorithms/bfs.ts'
import { sensorPresentation } from '../src/simulation/experiments.ts'
function capture(){let s=startSimulation(defaultConfig());const trace=[s];while(isRunning(s.phase)){s=advanceSimulation(s);trace.push(s);assert.ok(trace.length<300)}return {record:createHistoryRecord(s,trace,'2026-11-12T10:00:00Z','audit'),trace}}
const copy=value=>JSON.parse(JSON.stringify(value))

test('history rejects legal-looking teleportation, truncated/duplicated frames, forged policy and wrong BFS data',()=>{
 const {record}=capture();assert.ok(isHistoryRecord(record))
 const moving=record.frames.findIndex(f=>f.phase==='moving'&&f.robotIndex>0)
 const variants=[r=>{r.frames[moving].robotCell=15},r=>{r.frames.splice(3,1)},r=>{r.frames.splice(2,0,copy(r.frames[2]))},r=>{r.frames.at(-1).phase='exploring'},r=>{r.bfs.path.reverse()},r=>{r.bfs.pathLength++},r=>{r.inspections[0].decision.value+=1},r=>{r.posterior={PLASTIC:.5,PAPER:.5}},r=>{r.result.moves=0},r=>{r.inspections[0].bayesian.confidence=2}]
 for(const mutate of variants){const forged=copy(record);mutate(forged);assert.equal(isHistoryRecord(forged),false);assert.throws(()=>replayFrames(forged))}
})
test('historical one-step records remain replayable without being relabeled as sequential decisions',()=>{
 let s=startSimulation({...defaultConfig(),parameters:{sensorAccuracy:.85,incorrectSortPenalty:8,maxInspections:1}});const trace=[s]
 while(isRunning(s.phase)){s=advanceSimulation(s);if(s.decision){const decision=evaluateSortingDecision(s.bayesian.posteriors);s={...s,decision,inspections:s.inspections.map(i=>({...i,decision:i.decision?decision:null}))}}trace.push(s)}
 const record=createHistoryRecord(s,trace,'2026-11-12T10:00:00Z','legacy')
 assert.ok(isHistoryRecord(record));assert.equal(replayFrames(record).at(-1).decision.horizon,1)
})
test('callback failure cannot prevent completion notifications or leave a scheduled run alive',()=>{
 let callback,updates=0
 const t=createSimulationTransport({set(fn){callback=fn;return 1},clear(){callback=null}},()=>{throw Error('storage failure')})
 t.subscribe(()=>updates++);t.start()
 let ticks=0;while(t.getSnapshot().status!=='completed'){const fn=callback;assert.ok(fn);callback=null;fn();assert.ok(++ticks<300)}
 assert.ok(updates>10);assert.match(t.getSnapshot().error,/history/);assert.equal(t.getSnapshot().simulation.phase,'sorted');assert.equal(callback,null)
})
test('configured input objects cannot mutate an active run or its displayed snapshot',()=>{
 const config=defaultConfig(),t=createSimulationTransport({set(){return 1},clear(){}})
 t.configure(config);config.initialPriors.PLASTIC=0;config.parameters.incorrectSortPenalty=40;config.obstacles.push(8)
 t.start();assert.equal(t.getSnapshot().config.initialPriors.PLASTIC,.5);assert.equal(t.getSnapshot().config.parameters.incorrectSortPenalty,8);assert.deepEqual(t.getSnapshot().config.obstacles,[]);t.dispose()
})
test('invalid sensor configurations display an error rather than crashing the monitor',()=>{
 const t=createSimulationTransport();t.configure({parameters:{sensorAccuracy:NaN,incorrectSortPenalty:8,maxInspections:3}})
 const sensor=sensorPresentation(t.getSnapshot());assert.equal(sensor.status,'error');assert.equal(sensor.model,null);assert.ok(sensor.error);t.dispose()
})
test('BFS supports adjacency, identical endpoints, deterministic equal-length routes and changed obstacles',()=>{
 assert.deepEqual(bfs({rows:4,columns:4,start:2,target:3,obstacles:[]}).path,[2,3])
 assert.equal(bfs({rows:4,columns:4,start:3,target:3,obstacles:[]}).pathLength,0)
 const a=bfs({rows:4,columns:4,start:12,target:3,obstacles:[7]}),b=bfs({rows:4,columns:4,start:12,target:3,obstacles:[7]})
 assert.deepEqual(a,b);assert.equal(a.pathLength,6)
 const edited=bfs({rows:4,columns:4,start:12,target:3,obstacles:[7,8]});assert.notDeepEqual(edited.path,a.path);assert.equal(edited.pathLength,6)
})

test('completed runs receive distinct default IDs and validate without caller-provided identity',()=>{
 const {trace}=capture(),state=trace.at(-1)
 const first=createHistoryRecord(state,trace),second=createHistoryRecord(state,trace)
 assert.ok(first.id);assert.notEqual(first.id,second.id)
 assert.ok(isHistoryRecord(first));assert.ok(isHistoryRecord(second))
})
