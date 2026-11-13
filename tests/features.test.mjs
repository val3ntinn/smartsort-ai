import test from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_PARAMETERS, sensorModel, validateParameters } from '../src/simulation/parameters.ts'
import { inferMaterial, getSensorLikelihoods } from '../src/algorithms/bayes.ts'
import { evaluateSortingDecision } from '../src/algorithms/mdp.ts'
import { experimentTrial, compareExperiment, sensorPresentation } from '../src/simulation/experiments.ts'
import { createSimulation, defaultConfig } from '../src/simulation/controller.ts'
import { createSimulationTransport } from '../src/simulation/transport.ts'
import { createHistoryRecord, createHistoryStore, isHistoryRecord, replayFrames, HISTORY_KEY } from '../src/simulation/history.ts'

const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,`${a} != ${b}`)
function harness(onComplete) {
  let id=0;const tasks=new Map(),callbacks=new Map()
  const scheduler={set(callback){tasks.set(++id,callback);callbacks.set(id,callback);return id},clear(key){tasks.delete(key)}}
  const transport=createSimulationTransport(scheduler,onComplete)
  const flush=()=>{const e=tasks.entries().next().value;if(!e)return false;tasks.delete(e[0]);e[1]();return true}
  const until=predicate=>{for(let i=0;!predicate(transport.getSnapshot())&&i<600;i++)assert.ok(flush());assert.ok(predicate(transport.getSnapshot()))}
  return {transport,tasks,callbacks,flush,until,last:()=>id}
}
function capture(overrides={}) {
  let record;const h=harness((state,trace)=>{record=createHistoryRecord(state,trace,'2026-11-12T10:00:00.000Z','test-run')})
  h.transport.configure({...defaultConfig(),...overrides});h.transport.start();h.until(s=>s.status==='completed')
  return {record,state:h.transport.getSnapshot().simulation}
}
function memoryStorage() {const data=new Map();return {data,getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)}}

test('default parameterization exactly preserves the original likelihoods and expected rewards',()=>{
  const model=sensorModel(DEFAULT_PARAMETERS)
  for(const observation of ['PLASTIC','PAPER']) {
    assert.deepEqual(getSensorLikelihoods(observation,model),getSensorLikelihoods(observation))
    assert.deepEqual(inferMaterial(observation,undefined,model),inferMaterial(observation))
  }
  assert.deepEqual(evaluateSortingDecision(inferMaterial('PLASTIC').posteriors,-8),evaluateSortingDecision(inferMaterial('PLASTIC').posteriors))
})

test('every selectable accuracy yields valid normalized sensor likelihoods',()=>{
  for(let accuracy=50;accuracy<=95;accuracy++) {
    const model=sensorModel({...DEFAULT_PARAMETERS,sensorAccuracy:accuracy/100})
    for(const material of ['PLASTIC','PAPER']) {
      close(model.PLASTIC[material]+model.PAPER[material],1)
      for(const observation of ['PLASTIC','PAPER'])assert.ok(model[observation][material]>=0&&model[observation][material]<=1)
    }
  }
  const baseline=inferMaterial('PLASTIC',undefined,sensorModel(DEFAULT_PARAMETERS))
  const modified=inferMaterial('PLASTIC',undefined,sensorModel({...DEFAULT_PARAMETERS,sensorAccuracy:.5}))
  close(modified.confidence,.5);assert.notEqual(modified.confidence,baseline.confidence)
  assert.throws(()=>inferMaterial('PLASTIC',undefined,{PLASTIC:{PLASTIC:.9,PAPER:.9},PAPER:{PLASTIC:.9,PAPER:.9}}))
})

test('penalty changes expected rewards and can select INSPECT AGAIN from the same posterior',()=>{
  const probabilities=inferMaterial('PLASTIC').posteriors
  const original=evaluateSortingDecision(probabilities)
  const modified=evaluateSortingDecision(probabilities,-40)
  assert.equal(original.selectedAction,'SORT');assert.equal(modified.selectedAction,'INSPECT AGAIN')
  close(modified.expectedRewards.SORT,probabilities.PLASTIC*10-probabilities.PAPER*40)
  assert.equal(modified.expectedRewards['INSPECT AGAIN'],original.expectedRewards['INSPECT AGAIN'])
  assert.throws(()=>evaluateSortingDecision(probabilities,2),RangeError)
})

test('inspection limits from 1 to 10 bound uninformative sensing without infinite loops',()=>{
  for(let limit=1;limit<=10;limit++) {
    const result=experimentTrial(defaultConfig(),{sensorAccuracy:.5,incorrectSortPenalty:40,maxInspections:limit})
    assert.equal(result.phase,'unresolved');assert.equal(result.inspections.length,limit)
    close(result.belief.PLASTIC,.5);assert.equal(result.robotIndex,0)
  }
  for(const bad of [{sensorAccuracy:1},{sensorAccuracy:NaN},{incorrectSortPenalty:-1},{incorrectSortPenalty:Infinity},{maxInspections:0},{maxInspections:11},{maxInspections:1.5}])assert.throws(()=>validateParameters({...DEFAULT_PARAMETERS,...bad}))
})

test('lab comparison runs real bounded trials and leaves source configuration unchanged',()=>{
  const config={...defaultConfig(),parameters:{sensorAccuracy:.5,incorrectSortPenalty:40,maxInspections:4}}
  const original=JSON.stringify(config),comparison=compareExperiment(config)
  assert.equal(comparison.original.result.outcome,'correct')
  assert.equal(comparison.modified.result.outcome,'unresolved')
  assert.equal(comparison.modified.inspections.length,4)
  assert.equal(JSON.stringify(config),original)
})

test('sensor monitor reflects scan, pause, reading, pending confidence, completion, error, and reset',()=>{
  const h=harness(),t=h.transport
  assert.equal(sensorPresentation(t.getSnapshot()).status,'idle')
  t.start();assert.equal(sensorPresentation(t.getSnapshot()).status,'scanning')
  t.pause();assert.equal(sensorPresentation(t.getSnapshot()).status,'paused')
  t.resume();h.flush()
  let view=sensorPresentation(t.getSnapshot())
  assert.equal(view.status,'completed');assert.equal(view.observation,'PLASTIC');assert.equal(view.confidence,null)
  h.flush();view=sensorPresentation(t.getSnapshot());close(view.confidence,9/11)
  assert.deepEqual(view.likelihoods,{PLASTIC:.9,PAPER:.2})
  t.reset();assert.equal(sensorPresentation(t.getSnapshot()).observation,null)
  t.configure({start:3});t.start();assert.equal(sensorPresentation(t.getSnapshot()).status,'error')
})

test('history persists all requested fields and compacts/restores the exact saved terminal state',()=>{
  const {record,state}=capture()
  assert.equal(isHistoryRecord(record),true)
  const roundTrip=JSON.parse(JSON.stringify(record))
  assert.deepEqual(replayFrames(roundTrip).at(-1),state)
  assert.deepEqual(record.observations,state.inspections.map(i=>i.observation))
  assert.deepEqual(record.posterior,state.belief);assert.deepEqual(record.decision,state.decision)
  assert.deepEqual(record.bfs.path,state.bfs.path);assert.equal(record.destination,state.target)
  assert.ok(JSON.stringify(record).length<40000,'compact trace avoids full-state duplication')
  const storage=memoryStorage(),store=createHistoryStore(storage)
  store.add(record)
  assert.deepEqual(createHistoryStore(storage).getSnapshot().records,[record])
  store.clear();assert.equal(storage.getItem(HISTORY_KEY),null)
  assert.equal(createHistoryStore(storage).getSnapshot().records.length,0)
})

test('history retains the newest ten unique simulations and rejects corrupt records safely',()=>{
  const {record}=capture();const storage=memoryStorage(),store=createHistoryStore(storage)
  for(let i=0;i<15;i++)store.add({...record,id:`run-${i}`})
  assert.equal(store.getSnapshot().records.length,10)
  assert.equal(store.getSnapshot().records[0].id,'run-14')
  assert.equal(store.getSnapshot().records.at(-1).id,'run-5')
  const saved=JSON.parse(storage.getItem(HISTORY_KEY))
  storage.setItem(HISTORY_KEY,JSON.stringify([null,{version:1},...saved]))
  const recovered=createHistoryStore(storage)
  assert.equal(recovered.getSnapshot().records.length,10)
  storage.setItem(HISTORY_KEY,'{bad json')
  assert.equal(createHistoryStore(storage).getSnapshot().records.length,0)
  assert.ok(createHistoryStore(storage).getSnapshot().warning)
  assert.throws(()=>replayFrames({...record,frames:[]}))
  assert.equal(isHistoryRecord({...record,decision:{selectedAction:{}}}),false)
})

test('denied reads, quota failures, unavailable storage, and failed clear keep the app usable',()=>{
  const {record}=capture()
  const denied={getItem(){throw Error('denied')},setItem(){throw Error('quota')},removeItem(){throw Error('denied')}}
  const store=createHistoryStore(denied)
  assert.ok(store.getSnapshot().warning)
  store.add(record);assert.equal(store.getSnapshot().records.length,1);assert.ok(store.getSnapshot().warning)
  store.clear();assert.equal(store.getSnapshot().records.length,0);assert.ok(store.getSnapshot().warning)
  const memory=createHistoryStore(null);memory.add(record);assert.equal(memory.getSnapshot().records.length,1)
})

test('deterministic replay uses saved observations, decisions, route and configuration after parameter changes',()=>{
  for(const overrides of [{},{objectId:'paper-sheet'}, {parameters:{sensorAccuracy:.5,incorrectSortPenalty:40,maxInspections:5}}, {obstacles:[2]}, {initialPriors:{PLASTIC:.2,PAPER:.8},sensor:{mode:'predefined',observations:['PLASTIC','PAPER']}}]) {
    const {record,state}=capture(overrides)
    let savedAgain=0;const h=harness(()=>savedAgain++),t=h.transport
    t.configure({parameters:{sensorAccuracy:.95,incorrectSortPenalty:0,maxInspections:1}})
    assert.equal(t.replay(record),true);assert.equal(t.getSnapshot().replayId,record.id)
    t.pause();const paused=t.getSnapshot().simulation;t.resume();assert.strictEqual(t.getSnapshot().simulation,paused)
    h.until(s=>s.status==='completed')
    assert.deepEqual(t.getSnapshot().simulation,state)
    assert.equal(savedAgain,0,'replays do not create duplicate history entries')
    assert.deepEqual(t.getSnapshot().config,state.config)
  }
})

test('reset or setup changes cannot leak saved playback into a subsequent live run',()=>{
  const {record}=capture({objectId:'paper-sheet'})
  const h=harness(),t=h.transport
  t.replay(record);const pending=h.last()
  t.reset();const reset=t.getSnapshot();h.callbacks.get(pending)()
  assert.strictEqual(t.getSnapshot(),reset);assert.equal(reset.replayId,null)
  t.start();h.until(s=>s.status==='completed')
  assert.equal(t.getSnapshot().simulation.result.trueMaterial,'PLASTIC')
  assert.equal(t.getSnapshot().replayId,null)
})

test('partial and reset runs are not saved; live completion is recorded only once',()=>{
  let saves=0;const h=harness(()=>saves++),t=h.transport
  t.start();h.flush();t.reset();assert.equal(saves,0)
  t.start();h.until(s=>s.status==='completed');assert.equal(saves,1)
  t.pause();t.resume();t.nextStep();t.setSpeed(90);assert.equal(saves,1)
  assert.equal(t.replay({version:1}),false);assert.ok(t.getSnapshot().error)
})

test('manual replay and Clear History remain independent; saved frames survive storage removal',()=>{
  const {record,state}=capture();const store=createHistoryStore(memoryStorage());store.add(record)
  const h=harness(),t=h.transport;t.setMode('step');t.replay(store.getSnapshot().records[0]);store.clear()
  let steps=0
  while(t.getSnapshot().status!=='completed'){t.nextStep();h.until(s=>s.status!=='playing');assert.ok(++steps<30)}
  assert.deepEqual(t.getSnapshot().simulation,state)
  assert.equal(store.getSnapshot().records.length,0)
})
