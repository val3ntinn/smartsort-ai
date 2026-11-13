import { replayFrames, type HistoryRecord } from './history.ts'
import { advanceSimulation, createSimulation, defaultConfig, isRunning, startSimulation, type SimulationConfig, type SimulationState } from './controller.ts'
import { createPlaybackClock, type TimeoutScheduler } from '../motion/playback.ts'
import { playbackDelay } from '../motion/presentation.ts'

export type SimulationMode = 'automatic' | 'step'
export type ControlStatus = 'idle' | 'playing' | 'paused' | 'completed'
export type StageId = 'object' | 'sensor' | 'bayes' | 'mdp' | 'reinspect' | 'bfs' | 'path' | 'robot' | 'result'
export interface TransportSnapshot {
  config:SimulationConfig; simulation:SimulationState; status:ControlStatus; mode:SimulationMode; stepMs:number; session:number; checkpoint:StageId | null; singleStep:boolean; settling:boolean; replayId:string|null; error:string | null
}
/** Owns the one live run and one pending timer. Commands are synchronous, so
 * double clicks cannot start concurrent runs. Algorithm state is never edited by controls.
 */
export function createSimulationTransport(scheduler?:TimeoutScheduler, onComplete?:(state:SimulationState,trace:readonly SimulationState[])=>void) {
  const clock = createPlaybackClock(scheduler)
  const listeners = new Set<() => void>()
  let snapshot:TransportSnapshot = {config:defaultConfig(),simulation:createSimulation(),status:'idle',mode:'automatic',stepMs:180,session:0,checkpoint:null,singleStep:false,settling:false,replayId:null,error:null}
  let disposed=false
  let savedFrames:SimulationState[]|null=null
  let replayIndex=0
  let trace:SimulationState[]=[]
  const active=() => snapshot.status === 'playing' || snapshot.status === 'paused'
  function publish(next:TransportSnapshot) {
    if(disposed)return
    const finished=next.status==='completed'&&snapshot.status!=='completed'&&!next.replayId
    snapshot=next
    if(trace.at(-1)!==next.simulation)trace.push(next.simulation)
    if(finished)try{onComplete?.(next.simulation,trace)}catch{snapshot={...snapshot,error:'Simulation completed, but its history could not be saved.'}}
    for(const listener of listeners)listener()
  }
  function schedule() {
    clock.cancel()
    if(disposed || snapshot.status !== 'playing')return
    clock.arm(tick,snapshot.settling ? 400 : playbackDelay(snapshot.simulation.phase,snapshot.stepMs))
  }
  function boundary(simulation:SimulationState,checkpoint:StageId) {
    const terminal=checkpoint === 'result'
    publish({...snapshot,simulation,checkpoint,status:terminal ? 'completed' : 'playing',settling:!terminal && (snapshot.mode === 'step' || snapshot.singleStep),singleStep:terminal?false:snapshot.singleStep})
  }
  function tick() {
    if(disposed || snapshot.status !== 'playing')return
    if(snapshot.settling) {publish({...snapshot,settling:false,status:snapshot.mode==='step'||snapshot.singleStep?'paused':'playing',singleStep:false});schedule();return}
    const state=snapshot.simulation
    if(!isRunning(state.phase)) { boundary(state,'result'); return }
    if(snapshot.checkpoint === 'mdp' && state.phase === 'sensor' && state.decision?.selectedAction === 'INSPECT AGAIN') {
      boundary(state,'reinspect');schedule();return
    }
    if(savedFrames && replayIndex+1>=savedFrames.length){clock.cancel();publish({...snapshot,status:'completed',error:'Saved replay ended before a terminal state.'});return}
    const next=savedFrames ? savedFrames[++replayIndex] : advanceSimulation(state)
    if(state.phase === 'sensor') boundary(next,'sensor')
    else if(state.phase === 'bayes') boundary(next,'bayes')
    else if(state.phase === 'decision') boundary(next,'mdp')
    else if(state.phase === 'exploring' && next.visitedCount === next.bfs?.visitedCells.length && next.phase === 'exploring') boundary(next,'bfs')
    else if(state.phase === 'tracing' && next.pathCount === next.bfs?.path.length && next.phase === 'tracing') boundary(next,'path')
    else if(state.phase === 'moving' && next.phase === 'sorted') boundary(next,'robot')
    else if(!isRunning(next.phase)) boundary(next,'result')
    else publish({...snapshot,simulation:next})
    schedule()
  }
  return {
    getSnapshot:() => snapshot,
    subscribe:(listener:() => void) => {listeners.add(listener);return () => {listeners.delete(listener)}},
    start() {
      if(disposed || active())return
      try {
        const simulation=startSimulation(snapshot.config)
        clock.cancel()
        savedFrames=null;replayIndex=0;trace=[]
        publish({...snapshot,config:simulation.config,simulation,session:snapshot.session+1,checkpoint:'object',status:snapshot.mode === 'step' ? 'paused' : 'playing',singleStep:false,settling:false,replayId:null,error:null})
        schedule()
      } catch(error) {publish({...snapshot,error:error instanceof Error ? error.message : 'Invalid setup.'})}
    },
    replay(record:HistoryRecord) {
      if(disposed||active())return false
      try {
        const frames=replayFrames(record)
        clock.cancel();savedFrames=frames;replayIndex=0;trace=[]
        publish({...snapshot,config:frames[0].config,simulation:frames[0],replayId:record.id,session:snapshot.session+1,checkpoint:'object',status:snapshot.mode==='step'?'paused':'playing',singleStep:false,settling:false,error:null})
        schedule();return true
      } catch(error) {publish({...snapshot,error:error instanceof Error?error.message:'Replay could not be loaded.'});return false}
    },
    pause() {if(snapshot.status !== 'playing')return;clock.cancel();publish({...snapshot,status:'paused',singleStep:false})},
    resume() {if(snapshot.status !== 'paused')return;publish({...snapshot,status:'playing',singleStep:false});schedule()},
    nextStep() {if(snapshot.status !== 'paused')return;publish({...snapshot,status:'playing',singleStep:true});schedule()},
    reset() {
      clock.cancel();savedFrames=null;replayIndex=0;trace=[]
      publish({config:defaultConfig(),simulation:createSimulation(),status:'idle',mode:'automatic',stepMs:180,session:snapshot.session+1,checkpoint:null,singleStep:false,settling:false,replayId:null,error:null})
    },
    setMode(mode:SimulationMode) {if(mode !== 'automatic' && mode !== 'step')throw new TypeError('Invalid simulation mode.');publish({...snapshot,mode});schedule()},
    setSpeed(stepMs:number) {if(![90,180,400].includes(stepMs))throw new RangeError('Select an available animation speed.');publish({...snapshot,stepMs});schedule()},
    configure(patch:Partial<SimulationConfig>) {
      if(active())return
      clock.cancel()
      savedFrames=null;replayIndex=0;trace=[]
      const merged={...snapshot.config,...patch}
      const config={...merged,initialPriors:{...merged.initialPriors},parameters:merged.parameters?{...merged.parameters}:undefined,obstacles:[...merged.obstacles],sensor:merged.sensor.mode==='seeded'?{...merged.sensor}:{...merged.sensor,observations:[...merged.sensor.observations]}}
      publish({...snapshot,config,simulation:{...createSimulation(),config,belief:{...config.initialPriors},robotCell:config.start},status:'idle',checkpoint:null,replayId:null,error:null})
    },
    // Detach scheduled work when the React owner unmounts (also Strict Mode safe).
    suspend() {clock.cancel()},
    activate() {schedule()},
    dispose() {clock.cancel();listeners.clear();disposed=true},
  }
}
export type SimulationTransport = ReturnType<typeof createSimulationTransport>
