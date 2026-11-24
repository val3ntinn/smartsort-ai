import { inspectorForStage } from './simulator/presentation'
import { useEffect, useState } from 'react'
import { ArrowRight, CircleCheck, CircleAlert, ScanLine } from 'lucide-react'
import type { SimulationControls as Simulation } from './useSimulation'
import { simulationStages } from './simulation/stages'
import { StatusBadge, Tabs, Button } from './design-system/components'
import AgentSetup from './AgentSetup'
import SimulationControls from './SimulationControls'
import { NavigationGrid, NavigationMetrics } from './NavigationGrid'
import SensorMonitor from './SensorMonitor'
import BayesianPanel from './BayesianPanel'
import DecisionPanel from './DecisionPanel'
import SimulationMonitor from './SimulationMonitor'

/** Presentation only: the controller and transport remain the single source of truth. */
export default function SimulatorWorkspace({simulation:sim,expanded,onExpand}:{simulation:Simulation;expanded:boolean;onExpand:()=>void}) {
  const {state,playback}=sim
  const {current,explanation}=simulationStages(playback)
  const [inspector,setInspector]=useState('observe')
  const [follow,setFollow]=useState(true)
  useEffect(()=>{setFollow(true);setInspector('observe')},[playback.session])
  useEffect(()=>{
    if(follow)setInspector(inspectorForStage(playback.checkpoint))
  },[playback.checkpoint,playback.session,follow])
  const failure=!!sim.error||['unreachable','unresolved','error','cancelled'].includes(state.phase)
  const tone=sim.error||state.phase==='error'?'error':failure?'warning':state.phase==='sorted'?state.result?.outcome==='correct'?'success':'error':sim.paused?'warning':sim.playing?'info':'neutral'
  const operation=sim.error?'Setup error':playback.status==='completed'?state.result?.outcome==='correct'?'Sorting complete':state.result?.outcome==='incorrect'?'Classification error':state.result?.outcome==='unreachable'?'Destination unreachable':state.result?.outcome==='unresolved'?'Classification unresolved':state.result?.outcome==='error'?'Simulation error':current.name:current.name
  const params=sim.config.parameters
  return <div className={`simulator-lab ${expanded?'floor-expanded':''}`}>
    <header className="lab-heading"><div><div className="lab-kicker"><ScanLine size={14}/>SmartSort / Simulation laboratory</div><h1>Observe. Reason. Act.</h1></div><div className="lab-model current-operation lab-status" role="status" aria-live="polite"><div><StatusBadge className="operation-state" tone={tone}>{playback.status.toUpperCase()}</StatusBadge><h3>{operation}</h3></div><span>{state.inspections.length} / {params?.maxInspections??3} inspections</span></div></header>
    <AgentSetup simulation={sim}/>
    <SimulationControls simulation={sim}/>
    <div className="lab-workbench">
      <div className="lab-floor-column">
        <NavigationGrid navigation={sim.navigation} expanded={expanded} onExpand={onExpand}/>
        <div className={`operation-explanation ${failure?'has-failure':''}`}><p>{sim.error??explanation}</p></div>
      </div>
      <aside className="reasoning-inspector" aria-label="Agent reasoning inspector">
        <header className="inspector-heading"><span className="instrument-index">Agent reasoning</span><Button variant="quiet" size="compact" className="inspector-follow" aria-pressed={follow} title="Follow the active algorithm stage; choosing a tab holds your selected view" onClick={()=>setFollow(!follow)}>{follow?'Following stages':'Follow stages'}</Button></header>
        <Tabs label="Agent reasoning" value={inspector} onChange={value=>{setInspector(value);setFollow(false)}} items={[
          {id:'observe',label:'01 Observe',content:<><SensorMonitor playback={playback}/><BayesianPanel key={`bayes-${sim.session}`} active={state.phase==='bayes'} result={state.bayesian} initialPriors={sim.config.initialPriors}/></>},
          {id:'reason',label:'02 Reason',content:<><DecisionPanel key={`mdp-${sim.session}`} active={state.phase==='decision'} result={state.decision}/><div className="inspector-destination"><span>Selected destination</span><strong>{state.target===null?'Awaiting SORT':state.target===3?'Plastic bin [0, 3]':'Paper bin [1, 3]'}</strong><ArrowRight size={16}/></div></>},
          {id:'act',label:'03 Act',content:<><NavigationMetrics navigation={sim.navigation}/><div className={`inspector-outcome ${state.result?.outcome??''}`}>{state.result?<>{state.result.outcome==='correct'?<CircleCheck size={22}/>:<CircleAlert size={22}/>}<strong>{state.result.outcome==='correct'?'Sorted successfully':state.result.outcome==='incorrect'?'Incorrect classification':state.result.outcome==='unreachable'?'Destination unreachable':state.result.outcome==='unresolved'?'Classification unresolved':'Run stopped'}</strong><p>{state.result.message}</p></>:<><ScanLine size={22}/><strong>Awaiting route execution</strong><p>A SORT decision selects the bin. BFS then plans the route; the robot follows its exact cells.</p></>}</div></>}
        ]}/>
        <p className="inspector-footnote">Selecting a tab holds that view. Follow stages returns to the active algorithm; it does not change playback.</p>
      </aside>
    </div>
    <SimulationMonitor key={`monitor-${sim.session}`} playback={playback}/>
  </div>
}
