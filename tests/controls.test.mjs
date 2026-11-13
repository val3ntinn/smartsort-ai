import test from 'node:test'
import assert from 'node:assert/strict'
import { createSimulationTransport } from '../src/simulation/transport.ts'
import { advanceSimulation, defaultConfig, isRunning, startSimulation } from '../src/simulation/controller.ts'
import { simulationStages } from '../src/simulation/stages.ts'

function harness() {
  let id=0
  const tasks=new Map(),history=new Map(),delays=[]
  const scheduler={set(callback,delay){tasks.set(++id,callback);history.set(id,callback);delays.push(delay);return id},clear(handle){tasks.delete(handle)}}
  const transport=createSimulationTransport(scheduler)
  const flush=()=>{const entry=tasks.entries().next().value;if(!entry)return false;tasks.delete(entry[0]);entry[1]();return true}
  const until=(predicate)=>{for(let i=0;!predicate(transport.getSnapshot()) && i<300;i++){assert.ok(flush(),'expected a scheduled tick')}assert.ok(predicate(transport.getSnapshot()))}
  return {transport,tasks,history,delays,flush,until,last:()=>id}
}
const config=(overrides={})=>({...defaultConfig(),parameters:{sensorAccuracy:.85,incorrectSortPenalty:8,maxInspections:1},sensor:{mode:'predefined',observations:['PLASTIC']},...overrides})


test('automatic Start runs the whole pipeline and rejects simultaneous starts',()=>{
  const h=harness(),t=h.transport
  t.configure(config());t.start()
  const started=t.getSnapshot()
  t.start();t.start()
  assert.strictEqual(t.getSnapshot(),started)
  assert.equal(h.tasks.size,1)
  h.until(s=>s.status==='completed')
  const final=t.getSnapshot()
  assert.equal(final.simulation.result.outcome,'correct')
  assert.equal(final.checkpoint,'result')
  assert.equal(h.tasks.size,0)
  t.start()
  assert.equal(t.getSnapshot().session,final.session+1)
  assert.equal(t.getSnapshot().simulation.robotIndex,0)
  t.dispose()
})

test('Pause freezes every phase, rejects queued stale ticks and Start/config edits, Resume preserves progress',()=>{
  for(const phase of ['sensor','bayes','decision','planning','exploring','tracing','moving']) {
    const h=harness(),t=h.transport
    t.configure(config());t.start();h.until(s=>s.simulation.phase===phase)
    const pending=h.last(),before=t.getSnapshot().simulation
    t.pause();const paused=t.getSnapshot()
    assert.equal(paused.status,'paused')
    assert.strictEqual(paused.simulation,before)
    assert.equal(h.tasks.size,0)
    h.history.get(pending)()
    assert.strictEqual(t.getSnapshot(),paused)
    t.start();t.configure({start:0})
    assert.strictEqual(t.getSnapshot(),paused)
    t.pause();assert.strictEqual(t.getSnapshot(),paused)
    t.resume();assert.strictEqual(t.getSnapshot().simulation,before)
    assert.equal(h.tasks.size,1)
    t.resume();assert.equal(h.tasks.size,1)
    h.until(s=>s.status==='completed')
    assert.equal(t.getSnapshot().simulation.result.outcome,'correct')
    t.dispose()
  }
})

test('manual mode waits for Next Step at every major boundary, not every BFS cell',()=>{
  const h=harness(),t=h.transport
  t.configure(config());t.setMode('step');t.start()
  assert.equal(t.getSnapshot().status,'paused')
  assert.equal(t.getSnapshot().checkpoint,'object')
  assert.equal(t.getSnapshot().simulation.inspections.length,0)
  assert.equal(h.tasks.size,0)
  for(const expected of ['sensor','bayes','mdp','bfs','path','robot','result']) {
    t.nextStep();t.nextStep() // second command cannot queue a second stage
    h.until(s=>s.status!=='playing')
    const current=t.getSnapshot()
    assert.equal(current.checkpoint,expected)
    assert.equal(current.status,expected==='result'?'completed':'paused')
    assert.equal(h.tasks.size,0)
    if(expected==='bfs')assert.equal(current.simulation.visitedCount,current.simulation.bfs.visitedCells.length)
    if(expected==='path')assert.equal(current.simulation.pathCount,current.simulation.bfs.path.length)
    if(expected==='robot')assert.equal(current.simulation.robotCell,current.simulation.target)
  }
  const final=t.getSnapshot();t.nextStep();t.resume();t.pause()
  assert.strictEqual(t.getSnapshot(),final)
  t.dispose()
})

test('manual reinspection is optional, uses its own boundary, and retains real Bayesian evidence',()=>{
  const h=harness(),t=h.transport
  t.configure(config({objectId:'paper-sheet',parameters:{sensorAccuracy:.85,incorrectSortPenalty:8,maxInspections:2},initialPriors:{PLASTIC:.2,PAPER:.8},sensor:{mode:'predefined',observations:['PLASTIC','PAPER']}}));t.setMode('step');t.start()
  const checkpoints=[]
  while(t.getSnapshot().status!=='completed') {
    t.nextStep();h.until(s=>s.status!=='playing');checkpoints.push(t.getSnapshot().checkpoint)
    assert.ok(checkpoints.length<20)
  }
  assert.deepEqual(checkpoints,['sensor','bayes','mdp','reinspect','sensor','bayes','mdp','bfs','path','robot','result'])
  const inspections=t.getSnapshot().simulation.inspections
  assert.deepEqual(inspections[1].bayesian.priors,inspections[0].bayesian.posteriors)
  assert.equal(t.getSnapshot().simulation.result.outcome,'correct')
})

test('Next Step from an automatic pause finishes only the interrupted algorithm stage',()=>{
  const h=harness(),t=h.transport
  t.configure(config());t.start();h.until(s=>s.simulation.phase==='exploring' && s.simulation.visitedCount>2)
  const count=t.getSnapshot().simulation.visitedCount
  t.pause();t.nextStep();h.until(s=>s.status==='paused')
  const after=t.getSnapshot()
  assert.equal(after.checkpoint,'bfs')
  assert.ok(after.simulation.visitedCount>count)
  assert.equal(after.simulation.pathCount,0)
  assert.equal(after.simulation.robotIndex,0)
  t.resume();h.until(s=>s.status==='completed')
})

test('mode changes preserve paused state and take effect at the next boundary while playing',()=>{
  const h=harness(),t=h.transport
  t.configure(config());t.start();t.setMode('step');h.until(s=>s.status==='paused')
  assert.equal(t.getSnapshot().checkpoint,'sensor')
  const state=t.getSnapshot().simulation
  t.setMode('automatic');assert.equal(t.getSnapshot().status,'paused')
  assert.strictEqual(t.getSnapshot().simulation,state)
  t.resume();h.until(s=>s.status==='completed')
})

test('speed changes affect future ticks, preserve outputs, work while paused, and cancel previous scheduling',()=>{
  const h=harness(),t=h.transport
  t.configure(config());t.start();h.until(s=>s.simulation.phase==='exploring')
  const state=t.getSnapshot().simulation,pending=h.last()
  t.setSpeed(400);assert.equal(h.delays.at(-1),400)
  t.setSpeed(90);assert.equal(h.delays.at(-1),90)
  assert.strictEqual(t.getSnapshot().simulation,state)
  h.history.get(pending)();assert.strictEqual(t.getSnapshot().simulation,state)
  t.pause();t.setSpeed(180);assert.equal(h.tasks.size,0)
  t.resume();assert.equal(h.delays.at(-1),180)
  assert.throws(()=>t.setSpeed(0),RangeError)
  assert.throws(()=>t.setSpeed(NaN),RangeError)
  assert.throws(()=>t.setMode('invalid'),TypeError)
})

test('Reset in any phase or paused state clears everything and rejects all pending callbacks',()=>{
  for(const phase of ['sensor','bayes','decision','planning','exploring','tracing','moving','sorted']) {
    for(const pause of [false,true]) {
      const h=harness(),t=h.transport
      t.configure(config());t.start();h.until(s=>s.simulation.phase===phase)
      const old=h.last();if(pause)t.pause()
      t.setMode('step');t.setSpeed(400);t.reset()
      const fresh=t.getSnapshot()
      assert.equal(fresh.status,'idle');assert.equal(fresh.mode,'automatic');assert.equal(fresh.stepMs,180)
      assert.equal(fresh.checkpoint,null);assert.equal(fresh.settling,false)
      assert.deepEqual(fresh.config,defaultConfig())
      assert.equal(fresh.simulation.robotCell,12);assert.equal(fresh.simulation.logs.length,0)
      assert.equal(fresh.simulation.result,null);assert.equal(fresh.simulation.bfs,null)
      assert.equal(h.tasks.size,0)
      h.history.get(old)();assert.strictEqual(t.getSnapshot(),fresh)
      t.start();h.until(s=>s.status==='completed')
      assert.equal(t.getSnapshot().simulation.result.outcome,'correct')
      t.dispose()
    }
  }
})

test('early and terminal control actions are safe; errors do not start a run',()=>{
  const h=harness(),t=h.transport
  const idle=t.getSnapshot();t.pause();t.resume();t.nextStep()
  assert.strictEqual(t.getSnapshot(),idle)
  t.configure({start:3});t.start()
  assert.equal(t.getSnapshot().status,'idle');assert.match(t.getSnapshot().error,/start/)
  assert.equal(h.tasks.size,0)
  t.reset();t.configure(config({obstacles:[2]}));t.start();h.until(s=>s.status==='completed')
  assert.equal(t.getSnapshot().simulation.result.outcome,'unreachable')
})

test('unresolved classification and animation settling can be paused and resumed without extra observations',()=>{
  const h=harness(),t=h.transport
  t.configure(config({parameters:{sensorAccuracy:.85,incorrectSortPenalty:8,maxInspections:3},initialPriors:{PLASTIC:.2,PAPER:.8}}));t.setMode('step');t.start()
  t.nextStep();h.until(s=>s.settling)
  const during=t.getSnapshot().simulation
  t.pause();assert.strictEqual(t.getSnapshot().simulation,during)
  t.resume();h.until(s=>s.status==='paused')
  assert.strictEqual(t.getSnapshot().simulation,during)
  while(t.getSnapshot().status!=='completed') {t.nextStep();h.until(s=>s.status!=='playing')}
  assert.equal(t.getSnapshot().simulation.result.outcome,'unresolved')
  assert.equal(t.getSnapshot().simulation.inspections.length,1)
})

test('suspend/activate is Strict Mode safe and subscribe/unsubscribe prevents leaked UI updates',()=>{
  const h=harness(),t=h.transport
  let updates=0;const unsubscribe=t.subscribe(()=>updates++)
  t.configure(config());t.start();const queued=h.last()
  t.suspend();assert.equal(h.tasks.size,0)
  h.history.get(queued)();assert.equal(t.getSnapshot().simulation.inspections.length,0)
  t.activate();assert.equal(h.tasks.size,1)
  t.activate();assert.equal(h.tasks.size,1)
  unsubscribe();const before=updates
  h.until(s=>s.status==='completed');assert.equal(updates,before)
  t.dispose();assert.equal(h.tasks.size,0)
})

test('professional timeline reports current algorithm, completed/upcoming/optional stages and paused explanation',()=>{
  const h=harness(),t=h.transport
  t.configure(config());t.setMode('step');t.start()
  let view=simulationStages(t.getSnapshot())
  assert.equal(view.stages.length,9);assert.equal(view.current.id,'object')
  assert.match(view.explanation,/Paused after/)
  assert.ok(view.stages.some(s=>s.id==='reinspect'&&s.optional))
  t.nextStep();h.until(s=>s.status==='paused')
  view=simulationStages(t.getSnapshot())
  assert.equal(view.current.id,'sensor');assert.equal(view.nextName,'Bayes')
  assert.equal(view.stages.find(s=>s.id==='bayes').status,'pending')
  assert.equal(view.stages.find(s=>s.id==='sensor').status,'completed')
})


test('automatic and manual playback preserve the exact independent algorithm outputs at all speeds',()=>{
  for(const input of [config(),config({objectId:'paper-sheet',parameters:{sensorAccuracy:.85,incorrectSortPenalty:8,maxInspections:2},initialPriors:{PLASTIC:.2,PAPER:.8},sensor:{mode:'predefined',observations:['PLASTIC','PAPER']}}),config({obstacles:[2]})]) {
    let reference=startSimulation(input)
    while(isRunning(reference.phase))reference=advanceSimulation(reference)
    for(const mode of ['automatic','step'])for(const speed of [90,180,400]) {
      const h=harness(),t=h.transport
      t.configure(input);t.setMode(mode);t.setSpeed(speed);t.start()
      let rounds=0
      while(t.getSnapshot().status!=='completed') {
        if(t.getSnapshot().status==='paused')t.nextStep()
        h.until(s=>s.status!=='playing')
        assert.ok(++rounds<25)
      }
      assert.deepEqual(t.getSnapshot().simulation,reference)
      t.dispose()
    }
  }
})
