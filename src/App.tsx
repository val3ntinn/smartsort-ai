import ExperimentLab from './ExperimentLab'
import HistoryView from './HistoryView'
import SensorMonitor from './SensorMonitor'
import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ArrowDown, ArrowRight, Box, BrainCircuit, Check, ChevronRight, Command, Leaf, PanelLeftClose, RotateCcw, Route, Workflow, X } from 'lucide-react'
import Sidebar from './Sidebar'
import { readPreferences, writePreferences } from './interface/preferences'
import { useMediaQuery } from './interface/useMediaQuery'
import { isShortcutTarget, shortcutAction } from './interface/shortcuts'
import { Robot } from './components'
import DecisionPanel from './DecisionPanel'
import AgentSetup from './AgentSetup'
import SimulationMonitor from './SimulationMonitor'
import SimulationControls from './SimulationControls'
import { MotionPlaybackProvider } from './motion/MotionPlayback'
import { NavigationGrid, NavigationMetrics } from './NavigationGrid'
import { useSimulation } from './useSimulation'
import BayesianPanel from './BayesianPanel'

export default function App() {
  const reducedMotion = useReducedMotion()
  const [preferences,setPreferences]=useState(readPreferences)
  const simulation = useSimulation(preferences)
  const mobile=useMediaQuery('(max-width:720px)')
  const tablet=useMediaQuery('(max-width:900px)')
  const collapsed=preferences.sidebarCollapsed??tablet
  const bayesianResult = simulation.state.bayesian

  const [page, setPage] = useState('Simulator')

  const [expanded, setExpanded] = useState(false)

  const [help, setHelp] = useState(false)
  const [shortcuts,setShortcuts]=useState(false)
  const [sidebar, setSidebar] = useState(false)
  const dialogOpen=help||shortcuts
  useEffect(()=>{writePreferences(preferences)},[preferences])
  useEffect(()=>{setPreferences(previous=>previous.mode===simulation.playback.mode&&previous.stepMs===simulation.playback.stepMs?previous:{...previous,mode:simulation.playback.mode,stepMs:simulation.playback.stepMs as 90|180|400})},[simulation.playback.mode,simulation.playback.stepMs])
  useEffect(()=>{if(!mobile)setSidebar(false)},[mobile])
  const toggleSidebar=useCallback(()=>{if(mobile)setSidebar(previous=>!previous);else setPreferences(previous=>({...previous,sidebarCollapsed:!(previous.sidebarCollapsed??tablet)}))},[mobile,tablet])
  const closeSidebar=useCallback(()=>setSidebar(false),[])
  const navigate=useCallback((next:string)=>{setPage(next);setSidebar(false)},[])
  const showGuide=useCallback(()=>{setSidebar(false);setHelp(true)},[])
  const showShortcuts=useCallback(()=>{setSidebar(false);setShortcuts(true)},[])
  useEffect(() => {
    const keydown=(event:KeyboardEvent)=>{
      if(event.key==='Escape'){setHelp(false);setShortcuts(false);setSidebar(false);return}
      if(event.defaultPrevented||event.isComposing||isShortcutTarget(event.target)||dialogOpen)return
      if(event.key===' '&&event.target instanceof Element&&event.target.closest('button,a[href],[role="button"]'))return
      const action=shortcutAction(event,simulation.transport.getSnapshot(),page==='Simulator'&&!sidebar)
      if(!action)return
      event.preventDefault()
      if(action==='toggleSidebar'){if(mobile)setSidebar(previous=>!previous);else setPreferences(previous=>({...previous,sidebarCollapsed:!(previous.sidebarCollapsed??tablet)}))}
      else if(action==='reset'){simulation.reset();setExpanded(false)}
      else simulation.transport[action]()
    }
    window.addEventListener('keydown',keydown)
    return()=>window.removeEventListener('keydown',keydown)
  },[simulation.transport,page,dialogOpen,sidebar,mobile,tablet])
  useEffect(()=>{
    if(!dialogOpen&&!sidebar)return
    const previous=document.activeElement as HTMLElement|null
    const dialog=document.querySelector<HTMLElement>('[role="dialog"]')
    const buttons=()=>Array.from(dialog?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input,select,[tabindex="0"]')??[]).filter(element=>element.getClientRects().length>0)
    const focusFirst=()=>{(sidebar?dialog?.querySelector<HTMLElement>('.mobile-close'):buttons()[0])?.focus()}
    focusFirst()
    const focusFrame=requestAnimationFrame(focusFirst)
    const oldOverflow=document.body.style.overflow
    document.body.style.overflow='hidden'
    const trap=(event:KeyboardEvent)=>{if(event.key!=='Tab')return;const list=buttons(),first=list[0],last=list.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus()}}
    document.addEventListener('keydown',trap)
    return()=>{cancelAnimationFrame(focusFrame);document.removeEventListener('keydown',trap);document.body.style.overflow=oldOverflow;if(sidebar)document.querySelector<HTMLElement>('.mobile-toggle')?.focus();else if(previous?.isConnected&&!previous.closest('[inert]'))previous.focus();else document.querySelector<HTMLElement>('.mobile-toggle')?.focus()}
  },[dialogOpen,sidebar])
  const navigationState = simulation.navigation
  function reset() { simulation.reset(); setExpanded(false) }
  return <MotionPlaybackProvider paused={simulation.paused} speed={simulation.playback.stepMs}><div className={`app-shell ${collapsed?'sidebar-collapsed':'sidebar-expanded'}`} data-paused={simulation.paused}>
    <Sidebar page={page} collapsed={collapsed} mobile={mobile} open={sidebar} blocked={dialogOpen} onToggle={toggleSidebar} onClose={closeSidebar} onNavigate={navigate} onGuide={showGuide} onShortcuts={showShortcuts}/>
    {sidebar&&<button className="drawer-backdrop" aria-label="Close navigation backdrop" onClick={()=>setSidebar(false)}/>}
    <div className="main-shell" inert={dialogOpen||sidebar}><header className="topbar"><div className="breadcrumbs"><button className="mobile-toggle icon-button" aria-label="Toggle navigation" aria-controls="application-sidebar" aria-expanded={sidebar} onClick={() => setSidebar(!sidebar)}><PanelLeftClose size={18}/></button><span>{page}</span><ChevronRight size={14}/><strong>Workspace</strong></div><div className="topbar-actions"><span className="system-status"><span className="status-dot"/>{simulation.paused ? 'Agent paused' : simulation.playing ? 'Agent running' : 'System ready'}</span><span className="top-divider"/><button className="reset-button" onClick={reset}><RotateCcw size={14}/>Reset simulation</button></div></header>
    <main><AnimatePresence mode="wait"><motion.div key={page} data-view={page} initial={{ opacity: 0, y: reducedMotion ? 0 : 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reducedMotion ? 0 : -3 }} transition={{ duration: reducedMotion ? 0 : .18 }}>
      <div className="page-heading"><div><div className="eyebrow"><span/>INTELLIGENT RECYCLING AGENT</div><h1>{page === 'Experiment Lab' ? 'Explore the decision boundary.' : page === 'Simulator' ? 'A smarter path to sorting.' : page === 'Overview' ? 'Small world. Intelligent decisions.' : page === 'Algorithms' ? 'Inside the decision loop.' : page === 'History' ? 'Every step, accounted for.' : 'Intelligence with a purpose.'}</h1><p>{page === 'Experiment Lab' ? 'Adjust the model. Compare the outcomes. Keep every calculation accountable.' : page === 'Simulator' ? 'Select an object. Follow the reasoning. Watch it sort.' : page === 'Overview' ? 'A controlled environment for exploring perception, planning, and action.' : page === 'Algorithms' ? 'Three connected ideas. One autonomous sorting agent.' : page === 'History' ? 'Replay the latest ten completed runs saved in this browser.' : 'An interactive AI Fundamentals project exploring intelligent recycling.'}</p></div><div className="workspace-badge"><Box size={15}/><span>4 x 4 environment</span><span className="tiny-dot"/>Deterministic</div></div>
      {page === 'Simulator' ? <>
      <div className={`workspace-grid ${expanded ? 'expanded' : ''}`}>
      <NavigationGrid navigation={navigationState} expanded={expanded} onExpand={() => setExpanded(!expanded)} setup={<AgentSetup simulation={simulation}/>} controls={<SimulationControls simulation={simulation}/>} sensor={<SensorMonitor playback={simulation.playback}/>}/>
      <aside className="reasoning-column"><div className="reasoning-title"><h2>Agent reasoning</h2><span className="mono">PERCEIVE &rarr; PLAN &rarr; ACT</span></div><BayesianPanel key={`bayes-${simulation.session}`} active={simulation.state.phase === 'bayes'} result={bayesianResult} initialPriors={simulation.config.initialPriors}/>
      <div className="pipeline-link"><ArrowDown size={13}/><span>CLASSIFICATION</span></div><DecisionPanel key={`mdp-${simulation.session}`} active={simulation.state.phase === 'decision'} result={simulation.state.decision}/>
      <div className="pipeline-link"><ArrowDown size={13}/><span>TARGET DESTINATION</span></div><NavigationMetrics navigation={navigationState}/><div className="foundation-note"><Command size={13}/><span>Sensor &rarr; Bayes &rarr; MDP &rarr; BFS &rarr; Robot &rarr; Result.<br/>{simulation.config.parameters?.maxInspections??3} inspections maximum. All outputs computed locally.</span></div></aside></div>
      <SimulationMonitor key={`monitor-${simulation.session}`} playback={simulation.playback}/>
      </> : page === 'Experiment Lab' ? <ExperimentLab simulation={simulation} onSimulator={()=>setPage('Simulator')}/> : page === 'History' ? <HistoryView simulation={simulation} onReplay={record=>{if(simulation.transport.replay(record)){setPage('Simulator');setExpanded(false)}}}/> : page === 'Algorithms' ? <div className="algorithm-explain">{[{icon:BrainCircuit,title:'Bayesian inference',tag:'PERCEPTION',formula:'P(M | O) = P(O | M) * P(M) / P(O)',description:'Classify Plastic or Paper from a discrete sensor observation using equal priors and a fixed likelihood model. Repeated inspections use the previous posterior as the next prior.'},{icon:Workflow,title:'Markov decision process',tag:'DECISION',formula:'V_h(b) = max_a [R(b,a) + sum P(b_next | b,a) V_(h-1)(b_next)]',description:'Evaluate SORT and INSPECT AGAIN from the Bayesian posterior over correct and wrong classification. A finite-horizon Bellman update accounts for future sensor observations and Bayesian belief transitions. Sorting terminates; budget exhaustion allows a safe unresolved outcome.'},{icon:Route,title:'Breadth-first search',tag:'NAVIGATION',formula:'Frontier > Explore neighbors > Reach destination',description:'Search adjacent traversable cells with a FIFO queue. On this unweighted 4 x 4 grid, BFS will find a shortest route while avoiding obstacles.'}].map(({icon:Icon,title,tag,formula,description},i) => <section className="panel explain-panel" key={title}><span className="eyebrow">0{i+1} / {tag}</span><Icon size={28}/><h2>{title}</h2><p>{description}</p><code>{formula}</code><div className="algorithm-footer"><span className="status-dot"/>{i === 0 ? 'Implemented - Plastic / Paper' : i === 2 ? 'Implemented - Four-directional BFS' : 'Implemented - Finite-horizon Bellman planning'}</div></section>)}</div> : <section className="panel introduction"><div className="intro-art"><div className="intro-orbit"><Robot/></div><span>PERCEPTION / DECISION / ACTION</span></div><div><span className="eyebrow">SMARTSORT AI / FOUNDATION</span><h2>{page === 'About' ? 'A little robot. A bigger idea.' : 'Your intelligent sorting laboratory.'}</h2><p>Explore how an autonomous agent could identify recyclable materials, choose a destination, and navigate its environment. SmartSort brings the core concepts of artificial intelligence into one tangible workspace.</p><div className="intro-features"><span><Check size={15}/>Interactive 4 x 4 environment</span><span><Check size={15}/>Three objects / two material categories</span><span><Check size={15}/>Configurable obstacles</span><span><Check size={15}/>Session event logging</span></div><p className="intro-disclaimer">A complete local agent connects imperfect sensing, sequential Bayesian updates, expected-reward decisions, shortest-path planning, and robot movement. Cardboard maps to Paper. Final results report the actual sorting outcome, including classification errors.</p><button className="primary-button" onClick={() => setPage('Simulator')}>Enter workspace<ArrowRight size={15}/></button></div></section>}
      <footer className="page-footer"><span><Leaf size={12}/> A little intelligence. A lighter footprint.</span><span>SMARTSORT AI <span className="footer-slash">/</span> CONNECTED AGENT</span></footer>
    </motion.div></AnimatePresence></main></div>
    <AnimatePresence>{dialogOpen && <motion.div className="modal-backdrop" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:reducedMotion ? 0 : .16}} onClick={() => {setHelp(false);setShortcuts(false)}}><motion.section role="dialog" aria-modal="true" aria-label={shortcuts?'Keyboard shortcuts':'Workspace guide'} className={`guide-modal panel ${shortcuts?'shortcuts-panel':''}`} initial={{y:reducedMotion ? 0 : 8}} animate={{y:0}} transition={{duration:reducedMotion ? 0 : .16}} onClick={e => e.stopPropagation()}><div className="section-bar"><h2>{shortcuts?'Keyboard shortcuts':'Workspace guide'}</h2><button className="icon-button" aria-label={shortcuts?'Close shortcuts':'Close guide'} onClick={() => {setHelp(false);setShortcuts(false)}}><X size={18}/></button></div>{shortcuts?<div className="shortcuts-content"><p>Simulator controls, always within reach.</p><dl>{[['Space','Start / Pause / Resume'],['R','Reset simulation'],['N','Next step В· manual mode'],['Ctrl / вЊ + B','Toggle navigation']].map(([key,label])=><div key={key}><dt>{label}</dt><dd><kbd>{key}</kbd></dd></div>)}</dl><p>Simulation keys work in Simulator. Shortcuts are inactive while typing, using form controls, or viewing a dialog. Focused buttons keep their normal keyboard behavior.</p></div>:<div className="guide-content"><h3>Set the scene.</h3><p>1. Choose a Plastic bottle, Paper sheet, or Cardboard box. The robot carries the selected object from its start.</p><p>2. Set the robot start and toggle obstacles. Bins are protected; the agent chooses its destination.</p><p>3. Start Simulation runs automatically. Pause and Resume preserve progress; Next Step completes one stage. Enable Step-by-Step Mode to pause after every major stage. Animation Speed changes future timing. Reset clears the run and preserves your speed and mode preferences.</p><p>Sensor settings expose a seed or predefined observations and an initial prior. A repeated inspection uses the previous posterior. The agent stops safely if classification remains unresolved at its configured inspection limit or if its destination is unreachable. Experiment Lab changes the sensor and reward model. History replays saved runs without new sensing.</p><button className="primary-button" onClick={() => setHelp(false)}>Got it<Check size={15}/></button></div>}</motion.section></motion.div>}</AnimatePresence>
  </div></MotionPlaybackProvider>
}


