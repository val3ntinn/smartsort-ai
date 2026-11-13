import { simulationStages } from '../src/simulation/stages.ts'
﻿import test from 'node:test'
import assert from 'node:assert/strict'
import { createPlaybackClock } from '../src/motion/playback.ts'
import { robotPresentation, playbackDelay } from '../src/motion/presentation.ts'
import { advanceSimulation, cancelSimulation, createSimulation, defaultConfig, isRunning, resetSimulation, startSimulation } from '../src/simulation/controller.ts'

function timelinePresentation(state) {return simulationStages({simulation:state,config:state.config,status:isRunning(state.phase)?'playing':state.phase==='idle'?'idle':'completed',mode:'automatic',stepMs:180,session:0,checkpoint:null,singleStep:false,settling:false,replayId:null,error:null}).stages}
function fakeScheduler() {
  const callbacks=new Map(),cleared=new Set(),delays=new Map()
  let sequence=0
  return {callbacks,cleared,delays,
    set(callback,delay) {const id=++sequence;callbacks.set(id,callback);delays.set(id,delay);return id},
    clear(id) {cleared.add(id)},
    last() {return sequence},
    // Deliberately permit delivery after clear, simulating an already queued host callback.
    deliver(id) {callbacks.get(id)?.()},
  }
}
const input=(overrides={})=>({...defaultConfig(),parameters:{sensorAccuracy:.85,incorrectSortPenalty:8,maxInspections:1},sensor:{mode:'predefined',observations:['PLASTIC']},...overrides})
function atPhase(phase,config=input()) {
  let state=startSimulation(config)
  for(let i=0;i<200 && state.phase!==phase && isRunning(state.phase);i++) state=advanceSimulation(state)
  assert.equal(state.phase,phase)
  return state
}
function snapshots(config=input()) {
  let state=startSimulation(config)
  const all=[state]
  while(isRunning(state.phase)) {state=advanceSimulation(state);all.push(state);assert.ok(all.length<200)}
  return all
}

test('playback replacement and cancellation reject stale or duplicate queued ticks',()=>{
  const scheduler=fakeScheduler(),clock=createPlaybackClock(scheduler)
  const received=[]
  clock.arm(()=>received.push('old'),180)
  const old=scheduler.last()
  clock.arm(()=>received.push('new'),90)
  const latest=scheduler.last()
  assert.ok(scheduler.cleared.has(old))
  scheduler.deliver(old)
  assert.deepEqual(received,[])
  scheduler.deliver(latest)
  scheduler.deliver(latest)
  assert.deepEqual(received,['new'])
  clock.arm(()=>received.push('cancelled'),400)
  const cancelled=scheduler.last()
  clock.cancel()
  scheduler.deliver(cancelled)
  assert.deepEqual(received,['new'])
})

test('interruption at every animated phase stops playback, activity, and stage progression',()=>{
  for(const phase of ['sensor','bayes','decision','planning','exploring','tracing','moving']) {
    let state=atPhase(phase)
    const scheduler=fakeScheduler(),clock=createPlaybackClock(scheduler)
    clock.arm(()=>{state=advanceSimulation(state)},playbackDelay(state.phase,180))
    const pending=scheduler.last()
    clock.cancel()
    state=cancelSimulation(state)
    const stopped=state
    scheduler.deliver(pending)
    assert.strictEqual(state,stopped)
    const pose=robotPresentation(state,180,false)
    assert.equal(pose.active,false)
    assert.equal(pose.arrived,false)
    assert.equal(pose.duration,0)
    assert.ok(timelinePresentation(state).every(stage=>stage.status!=='current'))
  }
})

test('reset invalidates ticks and clears highlights, robot pose, arrival, and timeline',()=>{
  for(const phase of ['exploring','tracing','moving','sorted']) {
    let state=atPhase(phase)
    const scheduler=fakeScheduler(),clock=createPlaybackClock(scheduler)
    clock.arm(()=>{state=advanceSimulation(state)},180)
    const pending=scheduler.last()
    clock.cancel()
    state=resetSimulation()
    scheduler.deliver(pending)
    assert.deepEqual(state,createSimulation())
    assert.equal(timelinePresentation(state).length,9);assert.ok(timelinePresentation(state).every(stage=>stage.status==='pending'||stage.status==='current'))
    const pose=robotPresentation(state,180,false)
    assert.equal(pose.row,3);assert.equal(pose.column,0)
    assert.equal(pose.active,false);assert.equal(pose.arrived,false);assert.equal(pose.duration,0)
    assert.equal(state.visitedCount,0);assert.equal(state.pathCount,0)
  }
})

test('repeated simulations cannot be advanced by callbacks from previous runs',()=>{
  const scheduler=fakeScheduler(),clock=createPlaybackClock(scheduler)
  const completed=[]
  let state
  for(let run=0;run<3;run++) {
    const previous=scheduler.last()
    clock.cancel()
    state=startSimulation(input())
    const fresh=state
    if(previous) scheduler.deliver(previous)
    assert.strictEqual(state,fresh)
    for(let i=0;isRunning(state.phase) && i<200;i++) {
      clock.arm(()=>{state=advanceSimulation(state)},playbackDelay(state.phase,90))
      scheduler.deliver(scheduler.last())
    }
    assert.equal(state.phase,'sorted')
    completed.push(state)
  }
  assert.deepEqual(completed[0],completed[1])
  assert.deepEqual(completed[1],completed[2])
})

test('robot direction, position, active state, and arrival derive from real route edges',()=>{
  const directions=new Set()
  for(const config of [input({start:0,obstacles:[1,5,9]}),input({start:15})]) {
    for(const state of snapshots(config)) {
      const pose=robotPresentation(state,180,false)
      assert.equal(pose.row*4+pose.column,state.robotCell)
      assert.equal(pose.active,isRunning(state.phase))
      assert.equal(pose.arrived,state.phase==='sorted' && state.robotCell===state.target)
      if(state.robotIndex>0) {
        const delta=state.robotCell-state.bfs.path[state.robotIndex-1]
        const expected={1:'right','-1':'left',4:'down','-4':'up'}[delta]
        assert.equal(pose.direction,expected)
        assert.equal(pose.heading,{up:0,right:90,down:180,left:-90}[expected])
        directions.add(expected)
      }
    }
  }
  assert.deepEqual([...directions].sort(),['down','left','right','up'])
})

test('motion completes within the next controller tick at every speed; reduced motion is immediate',()=>{
  for(const stepMs of [90,180,400]) {
    for(const state of snapshots()) {
      const animated=robotPresentation(state,stepMs,false)
      const reduced=robotPresentation(state,stepMs,true)
      assert.equal(reduced.duration,0)
      assert.equal(reduced.row,animated.row);assert.equal(reduced.column,animated.column)
      assert.equal(reduced.arrived,animated.arrived)
      assert.ok(animated.duration*1000<playbackDelay('moving',stepMs))
    }
  }
})

test('reinspection timeline marks new Bayes and MDP work pending instead of reusing prior completion',()=>{
  const config=input({parameters:{sensorAccuracy:.85,incorrectSortPenalty:8,maxInspections:2},initialPriors:{PLASTIC:.2,PAPER:.8},sensor:{mode:'predefined',observations:['PLASTIC','PAPER']}})
  const all=snapshots(config)
  const secondSensor=all.find(state=>state.phase==='sensor' && state.inspections.length===1)
  assert.ok(secondSensor)
  const stages=timelinePresentation(secondSensor)
  assert.equal(stages.find(s=>s.id==='sensor').status,'current')
  assert.equal(stages.find(s=>s.id==='bayes').status,'pending');assert.equal(stages.find(s=>s.id==='mdp').status,'pending')
  const secondBayes=all.find(state=>state.phase==='bayes' && state.inspections.length===2)
  assert.equal(timelinePresentation(secondBayes).find(s=>s.id==='bayes').status,'current')
  assert.equal(timelinePresentation(secondBayes).find(s=>s.id==='mdp').status,'pending')
  assert.ok(timelinePresentation(all.at(-1)).every(stage=>stage.status==='completed'))
})

test('speed changes replace the pending tick without advancing simulation twice',()=>{
  let state=atPhase('exploring')
  const scheduler=fakeScheduler(),clock=createPlaybackClock(scheduler)
  clock.arm(()=>{state=advanceSimulation(state)},400)
  const slow=scheduler.last()
  clock.arm(()=>{state=advanceSimulation(state)},90)
  const fast=scheduler.last()
  assert.equal(scheduler.delays.get(fast),90)
  const before=state.visitedCount
  scheduler.deliver(slow);assert.equal(state.visitedCount,before)
  scheduler.deliver(fast);assert.equal(state.visitedCount,before+1)
})
