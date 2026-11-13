import { validateHistorySemantics } from './historyValidation.ts'
import { createSimulation, type Inspection, type Phase, type SimulationConfig, type SimulationState } from './controller.ts'
import type { BayesMaterial } from '../algorithms/bayes.ts'

export const HISTORY_KEY='smartsort.history.v1'
export interface ReplayFrame {phase:Phase;inspectionCount:number;bayesIndex:number;decisionIndex:number;hasBfs:boolean;hasResult:boolean;visitedCount:number;pathCount:number;robotIndex:number;robotCell:number;seed:number;logCount:number}
export interface HistoryRecord {
  version:1;id:string;createdAt:string;config:SimulationConfig;observations:BayesMaterial[];inspections:Inspection[];
  posterior:SimulationState['belief'];decision:SimulationState['decision'];destination:number|null;bfs:SimulationState['bfs'];result:NonNullable<SimulationState['result']>;logs:SimulationState['logs'];frames:ReplayFrame[]
}
const clone=<T,>(value:T):T=>JSON.parse(JSON.stringify(value)) as T
function newHistoryId():string {
  const cryptoApi=globalThis.crypto
  if(cryptoApi && typeof cryptoApi.randomUUID==='function')return cryptoApi.randomUUID()
  return `run-${Date.now()}-${Math.random().toString(36).slice(2)}`
}
export function createHistoryRecord(state:SimulationState,trace:readonly SimulationState[],createdAt=new Date().toISOString(),id=newHistoryId()):HistoryRecord {
  if(!state.result || !trace.length)throw new Error('Only completed runs can be saved.')
  return clone({version:1,id,createdAt,config:state.config,observations:state.inspections.map(i=>i.observation),inspections:state.inspections,posterior:state.belief,decision:state.decision,destination:state.target,bfs:state.bfs,result:state.result,logs:state.logs,frames:trace.map(s=>({phase:s.phase,inspectionCount:s.inspections.length,bayesIndex:s.inspections.map(i=>!!i.bayesian).lastIndexOf(true),decisionIndex:s.inspections.map(i=>!!i.decision).lastIndexOf(true),hasBfs:!!s.bfs,hasResult:!!s.result,visitedCount:s.visitedCount,pathCount:s.pathCount,robotIndex:s.robotIndex,robotCell:s.robotCell,seed:s.seed,logCount:s.logs.length}))})
}
function validDecision(d:NonNullable<SimulationState['decision']>):boolean {
  return !!d && ['SORT','INSPECT AGAIN','UNRESOLVED'].includes(d.selectedAction) && ['PLASTIC','PAPER'].includes(d.proposedMaterial) && typeof d.explanation==='string' && Array.isArray(d.evaluations) && d.evaluations.length===2 && d.evaluations.every(e=>['SORT','INSPECT AGAIN'].includes(e.action)&&[e.expectedReward,e.rewards?.correct,e.rewards?.wrong,e.contributions?.correct,e.contributions?.wrong].every(Number.isFinite)) && Number.isFinite(d.expectedRewards?.SORT) && Number.isFinite(d.expectedRewards?.['INSPECT AGAIN'])
}
const phases:Phase[]=['idle','sensor','bayes','decision','planning','exploring','tracing','moving','sorted','unreachable','unresolved','cancelled','error']
const int=(value:unknown,min:number,max:number)=>typeof value==='number' && Number.isInteger(value) && value>=min && value<=max
function validBelief(value:unknown):boolean {const p=value as {PLASTIC:number;PAPER:number}|null;return !!p && [p.PLASTIC,p.PAPER].every(n=>Number.isFinite(n)&&n>=0&&n<=1)&&Math.abs(p.PLASTIC+p.PAPER-1)<1e-9}
/** Browser storage is untrusted: invalid records are skipped, never rendered as runs. */
export function isHistoryRecord(value:unknown):value is HistoryRecord {
  try {
    if(!value || typeof value!=='object')return false
    const r=value as HistoryRecord
    if(r.version!==1 || typeof r.id!=='string' || !r.id || typeof r.createdAt!=='string' || !Number.isFinite(Date.parse(r.createdAt)))return false
    createSimulation(r.config)
    if(!Array.isArray(r.inspections) || !r.inspections.length || r.inspections.length>10 || !Array.isArray(r.observations) || r.observations.length!==r.inspections.length || !validBelief(r.posterior))return false
    if(!Array.isArray(r.logs) || r.logs.length>500 || !r.logs.every(log=>int(log.id,1,1000)&&typeof log.time==='string'&&typeof log.message==='string'))return false
    for(const [index,inspection] of r.inspections.entries()) {
      if(!['PLASTIC','PAPER'].includes(inspection.observation) || r.observations[index]!==inspection.observation)return false
      if(inspection.bayesian && (!validBelief(inspection.bayesian.priors)||!validBelief(inspection.bayesian.posteriors)||!Number.isFinite(inspection.bayesian.confidence)))return false
      if(inspection.decision && !validDecision(inspection.decision))return false
    }
    if(!r.result || !['correct','incorrect','unreachable','unresolved','error','cancelled'].includes(r.result.outcome) || typeof r.result.message!=='string')return false
    if(r.decision && !validDecision(r.decision))return false
    if(!['PLASTIC','PAPER'].includes(r.result.trueMaterial)||r.result.predictedMaterial!==null&&!['PLASTIC','PAPER'].includes(r.result.predictedMaterial)||!int(r.result.inspections,0,10)||!int(r.result.moves,0,15))return false
    if(r.destination!==null && ![3,7].includes(r.destination))return false
    if(r.bfs && (typeof r.bfs.pathFound!=='boolean'||(r.bfs.pathLength!==null&&!int(r.bfs.pathLength,0,15))))return false
    if(r.bfs && (!Array.isArray(r.bfs.path)||!Array.isArray(r.bfs.visitedCells)||!r.bfs.path.every(c=>int(c,0,15))||!r.bfs.visitedCells.every(c=>int(c,0,15))||r.bfs.path.length>16||r.bfs.visitedCells.length>16))return false
    if(!Array.isArray(r.frames)||!r.frames.length||r.frames.length>500)return false
    for(const f of r.frames) {
      if(!phases.includes(f.phase)||!int(f.inspectionCount,0,r.inspections.length)||!int(f.bayesIndex,-1,f.inspectionCount-1)||!int(f.decisionIndex,-1,f.inspectionCount-1)||!int(f.robotCell,0,15)||!int(f.robotIndex,0,15)||!int(f.seed,0,0xffffffff)||!int(f.visitedCount,0,r.bfs?.visitedCells.length??0)||!int(f.pathCount,0,r.bfs?.path.length??0)||!int(f.logCount,0,r.logs.length)||typeof f.hasBfs!=='boolean'||typeof f.hasResult!=='boolean')return false
      if(f.bayesIndex>=0&&!r.inspections[f.bayesIndex].bayesian || f.decisionIndex>=0&&!r.inspections[f.decisionIndex].decision || f.hasBfs&&!r.bfs)return false
    }
    return r.frames[0].phase==='sensor' && r.frames.at(-1)!.hasResult && validateHistorySemantics(r)
  } catch {return false}
}
/** Restore snapshots from saved observations/decisions/route. No sensing or
 * decision algorithm is called during replay and no random readings are generated.
 */
export function replayFrames(record:HistoryRecord):SimulationState[] {
  if(!isHistoryRecord(record))throw new Error('Saved simulation is incomplete or invalid.')
  const r=clone(record)
  return r.frames.map(f=>({config:r.config,phase:f.phase,belief:f.bayesIndex<0?{...r.config.initialPriors}:{...r.inspections[f.bayesIndex].bayesian!.posteriors},observation:f.inspectionCount?r.inspections[f.inspectionCount-1].observation:null,bayesian:f.bayesIndex<0?null:r.inspections[f.bayesIndex].bayesian,decision:f.decisionIndex<0?null:r.inspections[f.decisionIndex].decision,inspections:r.inspections.slice(0,f.inspectionCount).map((inspection,index)=>({...inspection,bayesian:index<=f.bayesIndex?inspection.bayesian:null,decision:index<=f.decisionIndex?inspection.decision:null})),seed:f.seed,target:f.hasBfs?r.destination:null,bfs:f.hasBfs?r.bfs:null,visitedCount:f.visitedCount,pathCount:f.pathCount,robotIndex:f.robotIndex,robotCell:f.robotCell,logs:r.logs.slice(0,f.logCount),result:f.hasResult?r.result:null}))
}
export type HistoryStorage=Pick<Storage,'getItem'|'setItem'|'removeItem'>
export function browserHistoryStorage():HistoryStorage|null {try{return typeof window==='undefined'?null:window.localStorage}catch{return null}}
export function createHistoryStore(storage:HistoryStorage|null=browserHistoryStorage()) {
  const listeners=new Set<()=>void>()
  let snapshot:{records:HistoryRecord[];warning:string|null}={records:[],warning:storage?null:'Browser storage is unavailable. History is kept in memory for this session.'}
  try {
    const raw=storage?.getItem(HISTORY_KEY)
    if(raw) {
      const parsed:unknown=JSON.parse(raw)
      if(!Array.isArray(parsed))throw new Error('Invalid history format')
      const seen=new Set<string>()
      const candidates=parsed.slice(0,100)
      const valid=candidates.filter(isHistoryRecord)
      const records=valid.filter(record=>{if(seen.has(record.id))return false;seen.add(record.id);return true}).slice(0,10)
      snapshot={records,warning:valid.length!==candidates.length || candidates.length!==parsed.length || records.length<Math.min(valid.length,10)?'Some saved records could not be read and were skipped.':null}
    }
  } catch {snapshot={records:[],warning:'Saved history could not be read. New runs remain available in this session.'}}
  function emit(){for(const listener of listeners)listener()}
  function persist(records:HistoryRecord[],clear=false) {
    let warning=storage?null:'Browser storage is unavailable. History is kept in memory for this session.'
    try {if(storage)clear?storage.removeItem(HISTORY_KEY):storage.setItem(HISTORY_KEY,JSON.stringify(records))}catch{warning=clear?'History cleared from this session, but browser storage could not be cleared.':'Browser storage could not be written. This run is kept in memory only.'}
    snapshot={records,warning};emit()
  }
  return {getSnapshot:()=>snapshot,subscribe:(listener:()=>void)=>{listeners.add(listener);return()=>{listeners.delete(listener)}},add(record:HistoryRecord){if(!isHistoryRecord(record))throw new Error('Invalid history record.');persist([clone(record),...snapshot.records.filter(r=>r.id!==record.id)].slice(0,10))},clear(){persist([],true)},report(warning:string){snapshot={...snapshot,warning};emit()}}
}


