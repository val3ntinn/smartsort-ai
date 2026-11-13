import type { HistoryRecord, ReplayFrame } from './history.ts'
import { inferMaterial } from '../algorithms/bayes.ts'
import { evaluateSortingDecision } from '../algorithms/mdp.ts'
import { solveSortingMDP } from '../algorithms/finiteMdp.ts'
import { bfs } from '../algorithms/bfs.ts'
import { DEFAULT_PARAMETERS, sensorModel } from './parameters.ts'
import { OBJECTS } from './sensor.ts'
import { bins } from '../model.ts'

/** Compare JSON data including every field, with tolerance only for numerical roundoff. */
export function equivalent(a:unknown,b:unknown):boolean {
  if(typeof a==='number'&&typeof b==='number')return Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=1e-9*Math.max(1,Math.abs(a),Math.abs(b))
  if(a===b)return true
  if(!a||!b||typeof a!=='object'||typeof b!=='object'||Array.isArray(a)!==Array.isArray(b))return false
  const aa=a as Record<string,unknown>,bb=b as Record<string,unknown>
  const keys=Object.keys(aa)
  return keys.length===Object.keys(bb).length&&keys.every(key=>Object.hasOwn(bb,key)&&equivalent(aa[key],bb[key]))
}
/** Validate historic mathematics and legal state transitions without collecting
 * a sensor reading. A valid legacy horizon-1 decision is retained as recorded.
 */
export function validateHistorySemantics(r:HistoryRecord):boolean {
  const parameters=r.config.parameters??DEFAULT_PARAMETERS,model=sensorModel(parameters)
  if(r.inspections.length>parameters.maxInspections)return false
  let prior=r.config.initialPriors
  for(const [index,i] of r.inspections.entries()) {
    if(i.bayesian) {
      const expected=inferMaterial(i.observation,prior,model)
      if(!equivalent(i.bayesian,expected))return false
      prior=expected.posteriors
    } else if(index!==r.inspections.length-1||r.result.outcome!=='error')return false
    if(i.decision) {
      if(!i.bayesian)return false
      const expected='kind' in i.decision ? solveSortingMDP(i.bayesian.posteriors,{model,remainingInspections:parameters.maxInspections-index-1,wrongSortReward:-parameters.incorrectSortPenalty}) : evaluateSortingDecision(i.bayesian.posteriors,-parameters.incorrectSortPenalty)
      if(!equivalent(i.decision,expected))return false
    }
    if(index<r.inspections.length-1 && i.decision?.selectedAction!=='INSPECT AGAIN')return false
    if(r.config.sensor.mode==='predefined' && r.config.sensor.observations[index]!==i.observation)return false
  }
  const finalDecision=r.inspections.slice().reverse().find(i=>i.decision)?.decision??null
  if(!equivalent(r.decision,finalDecision)||!equivalent(r.posterior,prior))return false
  if(r.bfs) {
    if(r.decision?.selectedAction!=='SORT')return false
    const target=bins.find(b=>b.material.toUpperCase()===r.decision!.proposedMaterial)?.cell
    if(target!==r.destination)return false
    const expected=bfs({rows:4,columns:4,start:r.config.start,target,obstacles:[...r.config.obstacles,...bins.filter(b=>b.cell!==target).map(b=>b.cell)]})
    if(!equivalent(r.bfs,expected))return false
  } else if(r.destination!==null)return false
  const first:ReplayFrame={phase:'sensor',inspectionCount:0,bayesIndex:-1,decisionIndex:-1,hasBfs:false,hasResult:false,visitedCount:0,pathCount:0,robotIndex:0,robotCell:r.config.start,seed:r.config.sensor.mode==='seeded'?r.config.sensor.seed:0,logCount:1}
  if(!equivalent(r.frames[0],first))return false
  if(!r.logs.every((log,index)=>log.id===index+1))return false
  for(let index=1;index<r.frames.length;index++) {
    const previous=r.frames[index-1],next=r.frames[index]
    let patch:Partial<ReplayFrame>
    if(previous.hasResult)return false
    if(next.phase==='cancelled')patch={phase:'cancelled',hasResult:true,logCount:previous.logCount+1}
    else switch(previous.phase) {
      case 'sensor': {
        const exhausted=previous.inspectionCount>=parameters.maxInspections || (r.config.sensor.mode==='predefined'&&!r.config.sensor.observations[previous.inspectionCount])
        patch=exhausted?{phase:'unresolved',hasResult:true,logCount:previous.logCount+1}:{phase:'bayes',inspectionCount:previous.inspectionCount+1,seed:r.config.sensor.mode==='seeded'?(Math.imul(1664525,previous.seed)+1013904223)>>>0:previous.seed,logCount:previous.logCount+1}
        break
      }
      case 'bayes':
        if(next.phase==='error') {
          try {inferMaterial(r.inspections[previous.inspectionCount-1].observation,previous.bayesIndex<0?r.config.initialPriors:r.inspections[previous.bayesIndex].bayesian!.posteriors,model);return false}catch{/* A truly impossible observation may terminate safely. */}
          patch={phase:'error',hasResult:true,logCount:previous.logCount+1}
        } else patch={phase:'decision',bayesIndex:previous.inspectionCount-1,logCount:previous.logCount+1}
        break
      case 'decision': {
        const decision=r.inspections[previous.inspectionCount-1].decision
        if(!decision)return false
        const sort=decision.selectedAction==='SORT',stop=decision.selectedAction==='UNRESOLVED'||(!sort&&previous.inspectionCount>=parameters.maxInspections)
        patch={phase:sort?'planning':stop?'unresolved':'sensor',decisionIndex:previous.inspectionCount-1,hasResult:stop,logCount:previous.logCount+(sort?1:2)}
        break
      }
      case 'planning':patch={phase:'exploring',hasBfs:true,logCount:previous.logCount+1};break
      case 'exploring':
        if(!r.bfs)return false
        patch=previous.visitedCount<r.bfs.visitedCells.length?{visitedCount:previous.visitedCount+1}:r.bfs.pathFound?{phase:'tracing',logCount:previous.logCount+1}:{phase:'unreachable',hasResult:true,logCount:previous.logCount+1}
        break
      case 'tracing':
        if(!r.bfs?.pathFound)return false
        patch=previous.pathCount<r.bfs.path.length?{pathCount:previous.pathCount+1}:{phase:'moving',logCount:previous.logCount+1}
        break
      case 'moving': {
        if(!r.bfs?.pathFound)return false
        const robotIndex=Math.min(previous.robotIndex+1,r.bfs.path.length-1),robotCell=r.bfs.path[robotIndex],arrived=robotCell===r.destination
        patch={robotIndex,robotCell,phase:arrived?'sorted':'moving',hasResult:arrived,logCount:previous.logCount+(robotIndex!==previous.robotIndex?1:0)+(arrived?1:0)}
        break
      }
      default:return false
    }
    if(!equivalent(next,{...previous,...patch}))return false
  }
  const last=r.frames.at(-1)!
  const material=OBJECTS.find(o=>o.id===r.config.objectId)!.material
  const outcome=last.phase==='sorted'?r.decision?.proposedMaterial===material?'correct':'incorrect':last.phase
  return last.hasResult&&last.inspectionCount===r.inspections.length&&last.logCount===r.logs.length&&r.result.trueMaterial===material&&r.result.predictedMaterial===(r.decision?.proposedMaterial??null)&&r.result.destination===r.destination&&r.result.moves===last.robotIndex&&r.result.inspections===last.inspectionCount&&r.result.outcome===outcome
}
