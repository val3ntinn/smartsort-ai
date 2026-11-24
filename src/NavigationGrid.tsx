import { isTraversedCell,isTraversedEdge } from './simulator/presentation'
import { useState, useRef } from 'react'
import { useReducedMotion } from 'motion/react'
import { Check, Map, Maximize2, Route, ScanLine, Square, Trash2, X } from 'lucide-react'
import { MaterialIcon, PanelHeader } from './components'
import { bins, coordinates } from './model'
import RobotMarker from './motion/RobotMarker'
import { PausableElement } from './motion/MotionPlayback'
import type { SimulationNavigation } from './useSimulation'

const statusLabels = { idle:'Ready to sort', sensor:'Collecting observation', bayes:'Updating belief', decision:'Evaluating actions', planning:'Planning route', exploring:'Exploring cells', tracing:'Tracing shortest path', moving:'Robot in motion', sorted:'Sorting complete', unreachable:'No route available', unresolved:'Classification unresolved', error:'Simulation error', cancelled:'Simulation stopped' }
export function NavigationGrid({ navigation: nav, expanded, onExpand }: { navigation: SimulationNavigation; expanded: boolean; onExpand: () => void }) {
  const [showCoordinates, setShowCoordinates] = useState(true)
  const gridRef=useRef<HTMLDivElement>(null)
  const reducedMotion = useReducedMotion()
  const revealDuration = reducedMotion ? 0 : Math.min(nav.stepMs*0.8/1000,.2)
  const toolHint = nav.tool === 'start' ? 'Choose an empty cell for the robot start.' : nav.tool === 'obstacle' ? 'Click a cell to toggle an obstacle.' : 'Click a cell to clear an obstacle.'
  return <section className="environment-panel navigation-environment" aria-label="Robot environment">
    <div className="floor-heading"><div className="floor-title"><span className="instrument-index">03 / Act</span><h2>Robot environment</h2></div><div className="navigation-toolbar"><div className="grid-edit-tools" role="group" aria-label="Grid editing mode">{[{id:'start',name:'Robot start',Icon:ScanLine},{id:'obstacle',name:'Obstacles',Icon:Square},{id:'erase',name:'Erase',Icon:X}].map(({id,name,Icon}) => <button key={id} disabled={nav.busy} aria-pressed={nav.tool === id} className={nav.tool === id ? 'selected' : ''} onClick={() => nav.setTool(id as 'start' | 'obstacle' | 'erase')}><Icon size={13}/>{name}</button>)}</div><span className="automatic-target">TARGET / {nav.target === null ? 'AGENT DECIDES' : bins.find(bin => bin.cell === nav.target)?.label.toUpperCase()}</span></div><button className="icon-button" aria-label={expanded ? 'Restore workspace layout' : 'Expand environment'} onClick={onExpand}><Maximize2 size={16}/></button></div>
    <div className="environment-body"><div className="environment-meta"><span><Map size={13}/> SORTING FLOOR <span className="mono">/ ENV-01</span></span><span className="mono">START [{coordinates(nav.start)}] / GOAL [{nav.target === null ? '--' : coordinates(nav.target)}]</span></div>
      <div className="grid-stage"><div className="axis-top">{['0','1','2','3'].map(value => <span key={value}>{value}</span>)}</div><div className="grid-with-axis"><div className="axis-left">{[0,1,2,3].map(value => <span key={value}>{value}</span>)}</div><div className="robot-grid" ref={gridRef} data-phase={nav.status}>{Array.from({length:16}, (_,cell) => {
        const bin = bins.find(value => value.cell === cell)
        const isRobot = cell === nav.robotCell
        const obstacle = nav.obstacles.includes(cell)

        const visited = nav.visitedCells.includes(cell)
        const pathIndex = nav.path.indexOf(cell)
        const inPath = pathIndex >= 0
        const traversed=isTraversedCell(nav.state,nav.path,cell)
        const next = nav.path[pathIndex + 1]
        const direction = next === undefined ? '' : next === cell + 1 ? 'right' : next === cell - 1 ? 'left' : next > cell ? 'down' : 'up'
        const protectedCell = !!bin || isRobot || (nav.tool === 'start' && obstacle)
        const description = isRobot ? `Robot position${bin ? ', '+bin.label+' bin' : ''}` : bin ? `${bin.label} bin${cell === nav.target ? ', target' : ''}` : obstacle ? 'Obstacle' : 'Empty'
        return <button key={cell} disabled={nav.busy || protectedCell} onClick={() => nav.editCell(cell)} className={`grid-cell ${bin ? `bin-cell ${bin.material}` : ''} ${isRobot ? 'robot-cell' : ''} ${obstacle ? 'obstacle-cell' : ''} ${visited ? 'bfs-visited' : ''} ${nav.status === 'exploring' && cell === nav.visitedCells.at(-1) ? 'bfs-current' : ''} ${inPath ? 'bfs-path' : ''} ${traversed?'path-traversed':''} ${isTraversedEdge(nav.state,nav.path,cell)?'edge-traversed':''} ${cell === nav.target ? 'target-cell' : ''}`} aria-label={`Cell [${coordinates(cell)}]: ${description}${visited ? ', explored' : ''}${inPath ? ', shortest path' : ''}${traversed?', traversed':''}`} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();if(!event.repeat)event.currentTarget.click();return}const delta:Record<string,number>={ArrowUp:-4,ArrowRight:1,ArrowDown:4,ArrowLeft:-1};const step=delta[event.key];if(!step)return;event.preventDefault();let candidate=cell+step;while(candidate>=0&&candidate<16){if(Math.abs(step)===1&&Math.floor(candidate/4)!==Math.floor(cell/4))break;const button=gridRef.current?.querySelectorAll<HTMLButtonElement>('.grid-cell')[candidate];if(button&&!button.disabled){button.focus();break}candidate+=step}}}>
          {visited && <PausableElement as="span" className="visited-overlay" initial={reducedMotion ? false : {opacity:0}} animate={{opacity:1}} duration={revealDuration}/>}
          {inPath && <PausableElement as="span" className={`path-overlay path-${direction}`} initial={reducedMotion ? false : {opacity:0,scale:.94}} animate={{opacity:1,scale:1}} duration={revealDuration}><span className="path-point"/>{direction && <PausableElement as="span" className="path-connector" initial={reducedMotion ? false : {scaleX:direction === 'left' || direction === 'right' ? 0 : 1,scaleY:direction === 'up' || direction === 'down' ? 0 : 1}} animate={{scaleX:1,scaleY:1}} duration={revealDuration}/>}</PausableElement>}
          <span className="cell-coordinate">{showCoordinates && coordinates(cell)}</span>
          {bin ? <><div className="bin-symbol"><Trash2 size={26} strokeWidth={1.4}/><MaterialIcon type={bin.material} size={11}/></div><span className="bin-label">{bin.label}</span>{cell === nav.target && <span className="cell-badge">GOAL</span>}</>  : obstacle ? <><Square size={24}/><span className="bin-label">Blocked</span></> : inPath ? <span className="path-step">{traversed?<Check size={12}/>:pathIndex}</span> : visited ? <span className="visit-index">{nav.visitedCells.indexOf(cell) + 1}</span> : <span className="cell-cross">+</span>}
        </button>
      })}<RobotMarker key={nav.session} state={nav.state} stepMs={nav.stepMs} paused={nav.paused}/></div></div></div>
      <div className="grid-legend navigation-legend"><span><i className="legend-robot"/>Robot</span><span><i className="legend-bin"/>Bin</span><span><i className="legend-obstacle"/>Obstacle</span><span><i className="legend-visited"/>Explored</span><span><i className="legend-path"/>Planned</span><span><i className="legend-traversed"/>Travelled</span><button onClick={() => setShowCoordinates(!showCoordinates)} aria-pressed={showCoordinates} className="coordinate-toggle"><ScanLine size={12}/>{showCoordinates ? 'Hide' : 'Show'} coordinates</button></div>
    </div>
    <div className="navigation-hint"><span><span className="status-dot neutral"/>{nav.busy ? 'Playback in progress. Grid editing is locked.' : toolHint}</span><span>Bins are fixed.</span></div>
    {nav.status === 'unreachable' && <div className="unreachable-note">No traversable route reaches the target. Remove an obstacle or move the robot, then run again.</div>}
  </section>
}

export function NavigationMetrics({ navigation: nav }: { navigation: SimulationNavigation }) {
  const showResult = ['tracing','moving','sorted'].includes(nav.status) || nav.status === 'unreachable'
  return <section className="algorithm-panel panel bfs-metrics-panel" data-active={['planning','exploring','tracing'].includes(nav.status)}><PanelHeader icon={Route} title="BFS navigation" number="03" status={nav.status==='unreachable'?'FAILED':showResult?'COMPUTED':['planning','exploring'].includes(nav.status)?'PROCESSING':'WAITING'}/><div className="algorithm-content"><div className="algorithm-description">How do I get there?<span>FIFO exploration. Four directions. Shortest route.</span></div><dl className="bfs-metrics"><div><dt>Path length</dt><dd>{showResult && nav.result?.pathFound ? <>{nav.result.pathLength}<small>moves</small></> : '--'}</dd></div><div><dt>Visited cells</dt><dd>{nav.result ? nav.visitedCells.length : '--'}<small>/ 16</small></dd></div><div><dt>Search status</dt><dd className={`metric-search-status ${nav.status}`}>{statusLabels[nav.status]}</dd></div></dl>{['tracing','moving','sorted'].includes(nav.status) && <div className="bfs-route"><span><Check size={12}/>SHORTEST ROUTE</span><code>{nav.result?.path.map(cell => `[${coordinates(cell)}]`).join(' > ')}</code></div>}{nav.status === 'unreachable' && <p className="bfs-unreachable">No path found. Every reachable cell was explored.</p>}<div className="algorithm-footer"><span className={`status-dot ${['tracing','moving','sorted'].includes(nav.status) ? '' : 'neutral'}`}/>{nav.busy ? `${nav.visitedCells.length} cells explored; ${nav.path.length} route cells revealed` : 'Other bin is protected; obstacles are impassable.'}</div></div></section>
}
