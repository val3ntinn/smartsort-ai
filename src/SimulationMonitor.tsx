import { useRef } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { Box, BrainCircuit, Check, Recycle, RotateCcw, Route, ScanLine, Terminal, Workflow } from 'lucide-react'
import { motionEase } from './motion/presentation'
import type { TransportSnapshot } from './simulation/transport'
import { simulationStages } from './simulation/stages'
import { OBJECTS } from './simulation/sensor'
import { coordinates } from './model'

const stageIcons = [Box,ScanLine,BrainCircuit,Workflow,RotateCcw,Route,Route,ScanLine,Recycle]
export default function SimulationMonitor({ playback }: { playback: TransportSnapshot }) {
  const state=playback.simulation
  const result=playback.status === 'completed' ? state.result : null
  const reducedMotion = useReducedMotion()
  const initialLastId = useRef(state.logs.at(-1)?.id ?? 0)
  const {stages,current,explanation}=simulationStages(playback)
  return <section className="execution-panel panel agent-monitor">
    <div className="execution-heading"><div><Terminal size={16}/><h2>Agent execution</h2></div><span className="muted-chip">{state.phase.toUpperCase()} / {state.inspections.length} OF {state.config.parameters?.maxInspections??3} INSPECTIONS</span></div>
    <div className="current-operation" role="status" aria-live="polite"><div><span className="operation-state">{playback.status.toUpperCase()}</span><h3>{current.name}</h3><span>{current.algorithm}</span></div><p>{explanation}</p></div>
    <div className="agent-timeline expanded-timeline" role="list" aria-label="Simulation stages">{stages.map(({name,status,cursor,optional},index) => {
      const Icon = stageIcons[index]
      return <div role="listitem" key={name} aria-current={cursor ? 'step' : undefined} aria-label={name+': '+status} data-state={status} className={`agent-timeline-step ${cursor ? 'active' : status === 'completed' ? 'done' : 'pending'} ${status === 'skipped' ? 'skipped' : ''}`}>
        <motion.div className="stage-node" initial={false} animate={{borderColor:status === 'current' ? '#97bd6b' : status === 'completed' ? '#4f6e3b' : '#34412f',backgroundColor:status === 'current' ? '#293a20' : status === 'completed' ? '#23301d' : '#1b241b'}} transition={{duration:reducedMotion ? 0 : .18}}>
          <motion.span key={status === 'completed' ? 'complete' : 'stage'} initial={reducedMotion ? false : {opacity:0,scale:.9}} animate={{opacity:1,scale:1}} transition={{duration:reducedMotion ? 0 : .16}}>{status === 'completed' ? <Check size={14}/> : <Icon size={15}/>}</motion.span>
        </motion.div><span>{name}</span><small>{optional && status==='pending'?'OPTIONAL':status === 'current' ? playback.status==='paused'?'PAUSED':'CURRENT':status.toUpperCase()}</small>{index<stages.length-1 && <div className="agent-stage-connector"><motion.span initial={false} animate={{scaleX:status === 'completed' ? 1 : 0}} transition={{duration:reducedMotion ? 0 : .2,ease:motionEase}}/></div>}
      </div>
    })}</div>
    <motion.div key={result ? result.outcome : 'pending'} initial={result && !reducedMotion ? {opacity:0,y:4} : false} animate={{opacity:1,y:0}} transition={{duration:reducedMotion ? 0 : .2,ease:motionEase}} className={`agent-final-result ${result ? result.outcome : ''}`} role="status" aria-live="polite"><Recycle size={20}/><div><strong>{result ? result.outcome === 'correct' ? 'Sorted successfully' : result.outcome === 'incorrect' ? 'Sorting completed with a classification error' : result.outcome === 'unreachable' ? 'Destination unreachable' : result.outcome === 'unresolved' ? 'Classification unresolved' : result.outcome === 'cancelled' ? 'Simulation stopped' : 'Simulation error' : 'No sorting result yet'}</strong><p>{result?.message ?? 'Select an object and run the agent. Every stage is computed locally.'}</p>{result && <dl><div><dt>Object</dt><dd>{OBJECTS.find(object => object.id === state.config.objectId)?.label}</dd></div><div><dt>Actual</dt><dd>{result.trueMaterial}</dd></div><div><dt>Proposed material</dt><dd>{result.predictedMaterial ?? '--'}</dd></div><div><dt>Destination</dt><dd>{result.destination === null ? '--' : `[${coordinates(result.destination)}]`}</dd></div><div><dt>Moves</dt><dd>{result.moves}</dd></div></dl>}</div></motion.div>
    <div className="agent-log-heading"><h3>Execution log</h3><span>{state.logs.length} EVENTS / CURRENT RUN</span></div>
    <motion.div layoutScroll className="agent-event-log" role="log" aria-label="Simulation execution log">{state.logs.length ? state.logs.slice().reverse().map(event => <motion.div layout={reducedMotion ? false : 'position'} key={event.id} initial={!reducedMotion && event.id > initialLastId.current ? {opacity:0,y:-5} : false} animate={{opacity:1,y:0}} transition={{duration:reducedMotion ? 0 : .16,ease:motionEase}}><span className="event-index">{String(event.id).padStart(2,'0')}</span><span className="event-stage">{event.time}</span><span>{event.message}</span></motion.div>) : <div className="agent-log-empty">Awaiting a simulation run.</div>}</motion.div>
  </section>
}
