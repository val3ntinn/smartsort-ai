import { useEffect, useState, useSyncExternalStore } from 'react'
import { createHistoryRecord, createHistoryStore } from './simulation/history'
import type { InterfacePreferences } from './interface/preferences'
import { bins } from './model'
import { createSimulationTransport } from './simulation/transport'

/** Thin React binding to the independently testable simulation transport. */
export function useSimulation(preferences?:InterfacePreferences) {
  const [historyStore]=useState(createHistoryStore)
  const history=useSyncExternalStore(historyStore.subscribe,historyStore.getSnapshot,historyStore.getSnapshot)
  const [transport] = useState(()=>{const instance=createSimulationTransport(undefined,(state,trace)=>{try{historyStore.add(createHistoryRecord(state,trace))}catch{historyStore.report('Run completed, but its history record could not be saved.')}});if(preferences){instance.setMode(preferences.mode);instance.setSpeed(preferences.stepMs)}return instance})
  const playback = useSyncExternalStore(transport.subscribe,transport.getSnapshot,transport.getSnapshot)
  const [tool,setTool] = useState<'start' | 'obstacle' | 'erase'>('start')
  useEffect(() => {transport.activate();return transport.suspend},[transport])
  const state=playback.simulation
  const config=playback.config
  const busy=playback.status === 'playing' || playback.status === 'paused'
  const paused=playback.status === 'paused'
  function reset() {const {mode,stepMs}=transport.getSnapshot();transport.reset();transport.setMode(mode);transport.setSpeed(stepMs);setTool('start')}
  function editCell(cell:number) {
    if(busy || cell === config.start || !Number.isInteger(cell) || cell<0 || cell>=16 || bins.some(bin=>bin.cell===cell))return
    if(tool==='start') {if(!config.obstacles.includes(cell))transport.configure({start:cell});return}
    transport.configure({obstacles:tool==='obstacle' && !config.obstacles.includes(cell) ? [...config.obstacles,cell] : config.obstacles.filter(value=>value!==cell)})
  }
  const navigation={session:playback.session,state,start:config.start,robotCell:state.robotCell,target:state.target,obstacles:config.obstacles,tool,setTool,result:state.bfs,status:state.phase,busy,paused,playing:playback.status==='playing',visitedCells:state.bfs?.visitedCells.slice(0,state.visitedCount)??[],path:state.bfs?.path.slice(0,state.pathCount)??[],stepMs:playback.stepMs,editCell,reset}
  return {history,historyStore,session:playback.session,config,state,busy,paused,playing:playback.status==='playing',error:playback.error,playback,transport,updateConfig:transport.configure,reset,run:transport.start,navigation}
}
export type SimulationControls=ReturnType<typeof useSimulation>
export type SimulationNavigation=SimulationControls['navigation']

