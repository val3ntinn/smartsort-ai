import {PageBoundary,PageEntry} from './pages/PageFrame'
import SimulatorWorkspace from './SimulatorWorkspace'
import { useCallback, useEffect, useState, useRef, lazy, Suspense } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Check, ChevronRight, PanelLeftClose, RotateCcw, X } from 'lucide-react'
import Sidebar from './Sidebar'
import { readPreferences, writePreferences } from './interface/preferences'
import { useMediaQuery } from './interface/useMediaQuery'
import { isShortcutTarget, shortcutAction } from './interface/shortcuts'
import { MotionPlaybackProvider } from './motion/MotionPlayback'
import { useSimulation } from './useSimulation'

const OverviewPage=lazy(()=>import('./pages/OverviewPage'))
const AlgorithmsPage=lazy(()=>import('./pages/AlgorithmsPage'))
const AboutPage=lazy(()=>import('./pages/AboutPage'))
const ExperimentLab=lazy(()=>import('./ExperimentLab'))
const HistoryView=lazy(()=>import('./HistoryView'))

export default function App() {
  const reducedMotion = useReducedMotion()
  const [preferences,setPreferences]=useState(readPreferences)
  const simulation = useSimulation(preferences)
  const mobile=useMediaQuery('(max-width:720px)')
  const tablet=useMediaQuery('(max-width:900px)')
  const collapsed=preferences.sidebarCollapsed??tablet

  const [page, setPage] = useState('Simulator')
  const focusNewPage=useRef(false)
  useEffect(()=>{document.title=`${page} | SmartSort AI`},[page])

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
  const navigate=useCallback((next:string)=>{focusNewPage.current=!!document.activeElement?.closest('main');setPage(next);setSidebar(false);window.scrollTo(0,0)},[])
  const showGuide=useCallback(()=>{setSidebar(false);setHelp(true)},[])
  const showShortcuts=useCallback(()=>{setSidebar(false);setShortcuts(true)},[])
  useEffect(() => {
    const keydown=(event:KeyboardEvent)=>{
      if(event.key==='Escape'){setHelp(false);setShortcuts(false);setSidebar(false);return}
      if(event.defaultPrevented||event.isComposing||isShortcutTarget(event.target)||dialogOpen)return
      if(event.key===' '&&event.target instanceof Element&&event.target.closest('button,a[href],[role="button"],summary'))return
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
  function reset() { simulation.reset(); setExpanded(false) }
  return <MotionPlaybackProvider paused={simulation.paused} speed={simulation.playback.stepMs}><div className={`app-shell ${collapsed?'sidebar-collapsed':'sidebar-expanded'}`} data-paused={simulation.paused} data-page={page}>
    <a className="skip-navigation" href="#workspace-content" onClick={()=>document.getElementById('workspace-content')?.focus()}>Skip to workspace</a>
    <Sidebar page={page} collapsed={collapsed} mobile={mobile} open={sidebar} blocked={dialogOpen} onToggle={toggleSidebar} onClose={closeSidebar} onNavigate={navigate} onGuide={showGuide} onShortcuts={showShortcuts}/>
    {sidebar&&<button className="drawer-backdrop" aria-label="Close navigation backdrop" onClick={()=>setSidebar(false)}/>}
    <div className="main-shell" inert={dialogOpen||sidebar}><header className="topbar"><div className="breadcrumbs"><button className="mobile-toggle icon-button" aria-label="Toggle navigation" aria-controls="application-sidebar" aria-expanded={sidebar} onClick={() => setSidebar(!sidebar)}><PanelLeftClose size={18}/></button><span>{page}</span><ChevronRight size={14}/><strong>{['Simulator','Experiment Lab','History'].includes(page)?'Laboratory':'Reference'}</strong></div><div className="topbar-actions"><span className="system-status"><span className="status-dot"/>{simulation.error||simulation.state.phase==='error'?'Setup error':simulation.paused?'Agent paused':simulation.playing?'Agent running':simulation.state.result?simulation.state.result.outcome==='correct'?'Run complete':simulation.state.result.outcome==='incorrect'?'Classification error':'Run stopped':'System ready'}</span><span className="top-divider"/><button className="reset-button" onClick={reset}><RotateCcw size={14}/>Reset simulation</button></div></header>
    <main id="workspace-content" tabIndex={-1}><AnimatePresence mode="wait"><motion.div key={page} data-view={page} initial={{ opacity: 0, y: reducedMotion ? 0 : 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reducedMotion ? 0 : -3 }} transition={{ duration: reducedMotion ? 0 : .18 }}>
      <PageBoundary key={page} onSimulator={()=>navigate('Simulator')}><Suspense fallback={<div className="page-loading" role="status">Loading {page}...</div>}><PageEntry focusFlag={focusNewPage}>{page==='Simulator'?<SimulatorWorkspace simulation={simulation} expanded={expanded} onExpand={()=>setExpanded(!expanded)}/>:page==='Experiment Lab'?<ExperimentLab simulation={simulation} onSimulator={()=>navigate('Simulator')}/>:page==='History'?<HistoryView simulation={simulation} onSimulator={()=>navigate('Simulator')} onReplay={record=>{if(simulation.transport.replay(record)){navigate('Simulator');setExpanded(false)}}}/>:page==='Algorithms'?<AlgorithmsPage onSimulator={()=>navigate('Simulator')}/>:page==='Overview'?<OverviewPage onNavigate={navigate}/>:<AboutPage onAlgorithms={()=>navigate('Algorithms')}/>}</PageEntry></Suspense></PageBoundary>
      <footer className="page-footer"><span>SmartSort AI / AI Fundamentals</span><span>Simulated sensing / model-based planning / local execution</span></footer>
    </motion.div></AnimatePresence></main></div>
    <AnimatePresence>{dialogOpen && <motion.div className="modal-backdrop" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:reducedMotion ? 0 : .16}} onClick={() => {setHelp(false);setShortcuts(false)}}><motion.section role="dialog" aria-modal="true" aria-label={shortcuts?'Keyboard shortcuts':'Workspace guide'} className={`guide-modal panel ${shortcuts?'shortcuts-panel':''}`} initial={{y:reducedMotion ? 0 : 8}} animate={{y:0}} transition={{duration:reducedMotion ? 0 : .16}} onClick={e => e.stopPropagation()}><div className="section-bar"><h2>{shortcuts?'Keyboard shortcuts':'Workspace guide'}</h2><button className="icon-button" aria-label={shortcuts?'Close shortcuts':'Close guide'} onClick={() => {setHelp(false);setShortcuts(false)}}><X size={18}/></button></div>{shortcuts?<div className="shortcuts-content"><p>Simulator controls, always within reach.</p><dl>{[['Space','Start / Pause / Resume'],['R','Reset simulation'],['N','Next step · manual mode'],['Ctrl / ⌘ + B','Toggle navigation']].map(([key,label])=><div key={key}><dt>{label}</dt><dd><kbd>{key}</kbd></dd></div>)}</dl><p>Simulation keys work in Simulator. Shortcuts are inactive while typing, using form controls, or viewing a dialog. Focused buttons keep their normal keyboard behavior.</p></div>:<div className="guide-content"><h3>Set the scene.</h3><p>1. Choose a Plastic bottle, Paper sheet, or Cardboard box. The robot carries the selected object from its start.</p><p>2. Set the robot start and toggle obstacles. Bins are protected; the agent chooses its destination.</p><p>3. Start Simulation runs automatically. Pause and Resume preserve progress; Next Step completes one stage. Enable Step-by-Step Mode to pause after every major stage. Animation Speed changes future timing. Reset clears the run and preserves your speed and mode preferences.</p><p>Sensor settings expose a seed or predefined observations and an initial prior. A repeated inspection uses the previous posterior. The agent stops safely if classification remains unresolved at its configured inspection limit or if its destination is unreachable. Experiment Lab changes the sensor and reward model. History replays saved runs without new sensing.</p><button className="primary-button" onClick={() => setHelp(false)}>Got it<Check size={15}/></button></div>}</motion.section></motion.div>}</AnimatePresence>
  </div></MotionPlaybackProvider>
}


