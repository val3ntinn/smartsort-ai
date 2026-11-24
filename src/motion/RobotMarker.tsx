import { useReducedMotion } from 'motion/react'
import { Check } from 'lucide-react'
import { PausableElement } from './MotionPlayback'
import { robotPresentation } from './presentation'
import type { SimulationState } from '../simulation/controller'

export default function RobotMarker({state,stepMs,paused=false}:{state:SimulationState;stepMs:number;paused?:boolean}) {
  const reducedMotion=!!useReducedMotion(),pose=robotPresentation(state,stepMs,reducedMotion)
  return <PausableElement className={`robot-position-marker ${pose.active&&!paused?'is-active':''} ${pose.arrived?'has-arrived':''}`} aria-hidden="true" animate={{left:`calc(${pose.column*25}% + ${pose.column*1.25}px)`,top:`calc(${pose.row*25}% + ${pose.row*1.25}px)`}} duration={pose.duration}>
    {pose.arrived&&!reducedMotion&&<PausableElement as="span" className="robot-arrival-ring" initial={{opacity:.6,scale:.8}} animate={{opacity:0,scale:1.05}} duration={.4} delay={pose.duration}/>}
    <PausableElement className="robot-chassis" animate={{rotate:pose.heading}} duration={reducedMotion?0:.14}><svg viewBox="0 0 48 48" fill="none"><path className="chassis-track" d="M8 15h5v23H8zM35 15h5v23h-5z"/><rect className="chassis-body" x="14" y="12" width="20" height="27" rx="4"/><path className="chassis-nose" d="m19 9 5-5 5 5M18 21h12M20 33h8"/><circle className="chassis-sensor" cx="24" cy="26" r="3"/></svg><span className="robot-active-indicator"/></PausableElement>
    <span className="robot-marker-caption">{pose.arrived?<><Check size={9}/>Arrived</>:paused?'Paused':'Robot'}</span>
  </PausableElement>
}
