import { Pause, Play, RotateCcw, SkipForward, Workflow } from 'lucide-react'
import type { SimulationControls as Controls } from './useSimulation'

export default function SimulationControls({simulation:sim}:{simulation:Controls}) {
  const {playback,transport}=sim
  return <div className="transport-controls" aria-label="Simulation controls">
    {playback.replayId&&<p className="replay-notice">REPLAY / Saved observations and decisions. Start Simulation creates a new run after replay completes.</p>}
    <div className="transport-settings"><label className="step-mode-toggle"><input type="checkbox" checked={playback.mode==='step'} onChange={event=>transport.setMode(event.target.checked?'step':'automatic')}/><Workflow size={13}/><span>Step-by-Step Mode</span></label><label className="transport-speed">Animation speed<select value={playback.stepMs} onChange={event=>transport.setSpeed(Number(event.target.value))}><option value={400}>Slow</option><option value={180}>Normal</option><option value={90}>Fast</option></select></label></div>
    <div className="transport-buttons"><button className="primary-button" disabled={sim.busy} onClick={transport.start}><Play size={13} fill="currentColor"/>Start Simulation</button><button className="transport-button" disabled={!sim.playing} onClick={transport.pause}><Pause size={13}/>Pause</button><button className="transport-button" disabled={!sim.paused} onClick={transport.resume}><Play size={13}/>Resume</button><button className="transport-button" disabled={!sim.paused} onClick={transport.nextStep}><SkipForward size={14}/>Next Step</button><button className="transport-button reset-transport" onClick={sim.reset}><RotateCcw size={13}/>Reset</button></div>
    <p role="status" aria-live="polite">{sim.paused ? 'Paused. Resume continues playback; Next Step completes one major stage.' : sim.playing ? playback.singleStep ? 'Advancing to the next stage boundary...' : playback.mode==='step' ? 'Running this stage. Playback will pause at its boundary.' : 'Automatic mode. The complete agent pipeline is running.' : playback.status==='completed' ? 'Run complete. Start again or reset the simulation.' : playback.mode==='step' ? 'Manual mode. Start selects the object; Next Step advances each stage.' : 'Automatic mode. Start runs the complete pipeline.'}</p>
  </div>
}
