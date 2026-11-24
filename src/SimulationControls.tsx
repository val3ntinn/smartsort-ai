import { Button } from './design-system/components'
import { Pause, Play, RotateCcw, SkipForward } from 'lucide-react'
import type { SimulationControls as Controls } from './useSimulation'

export default function SimulationControls({simulation:sim}:{simulation:Controls}) {
  const {playback,transport}=sim
  return <section className="transport-controls lab-transport" aria-label="Simulation controls">
    <div className="transport-buttons">
      {!sim.busy?<Button variant="primary" className="primary-button" onClick={transport.start}><Play size={14} fill="currentColor"/>Start Simulation</Button>:sim.playing?<Button variant="primary" className="primary-button" onClick={transport.pause}><Pause size={14}/>Pause</Button>:<Button variant="primary" className="primary-button" onClick={transport.resume}><Play size={14}/>Resume</Button>}
      <Button className="transport-button" disabled={!sim.paused} title={sim.paused?'Advance one major algorithm stage':'Pause the simulation to advance one stage'} onClick={transport.nextStep}><SkipForward size={15}/>Next Step</Button>
      <Button variant="quiet" className="transport-button reset-transport" onClick={sim.reset} title="Cancel the run and restore the default environment"><RotateCcw size={14}/>Reset</Button>
    </div>
    <div className="transport-settings"><label className="step-mode-toggle"><input type="checkbox" checked={playback.mode==='step'} onChange={event=>transport.setMode(event.target.checked?'step':'automatic')}/><span>Step-by-Step Mode</span></label><label className="transport-speed">Speed<select aria-label="Animation speed" value={playback.stepMs} onChange={event=>transport.setSpeed(Number(event.target.value))}><option value={400}>Slow</option><option value={180}>Normal</option><option value={90}>Fast</option></select></label></div>
    <p className="transport-instruction">{playback.replayId?'Replay uses saved observations, decisions, and route. ':''}{sim.paused?'Paused at the current state. Resume or advance one stage.':sim.playing?'Running the computed agent pipeline.':playback.mode==='step'?'Manual playback: Start, then advance each major stage.':'Automatic playback. Space starts, pauses, or resumes.'}</p>
  </section>
}
