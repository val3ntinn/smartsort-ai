import { useRef } from 'react'
import { useReducedMotion } from 'motion/react'
import { Check, Navigation2 } from 'lucide-react'
import { Robot } from '../components'
import { PausableElement } from './MotionPlayback'
import { robotPresentation } from './presentation'
import type { SimulationState } from '../simulation/controller'

export default function RobotMarker({state,stepMs,paused=false}: {state:SimulationState;stepMs:number;paused?:boolean}) {
  const reducedMotion = !!useReducedMotion()
  const pose = robotPresentation(state,stepMs,reducedMotion)
  const initiallyArrived = useRef(pose.arrived)
  return <PausableElement className={`robot-position-marker ${pose.active && !paused ? 'is-active' : ''} ${pose.arrived ? 'has-arrived' : ''}`} aria-hidden="true"
    animate={{left:`calc(${pose.column*25}% + ${pose.column*1.25}px)`,top:`calc(${pose.row*25}% + ${pose.row*1.25}px)`}}
    duration={pose.duration}>
    {pose.arrived && !initiallyArrived.current && !reducedMotion && <PausableElement as="span" className="robot-arrival-ring" initial={{opacity:0.6,scale:.8}} animate={{opacity:0,scale:1.05}} duration={.4} delay={pose.duration}/>}
    <PausableElement className="robot-body-marker" animate={{rotate:pose.tilt}} duration={reducedMotion ? 0 : .14}><Robot/>
      <span className="robot-active-indicator"/>
      <PausableElement as="span" className="robot-heading" animate={{rotate:pose.heading}} duration={reducedMotion ? 0 : .14}><Navigation2 size={9}/></PausableElement>
    </PausableElement>
    <span className="robot-marker-caption">{pose.arrived ? <><Check size={7}/>ARRIVED</> : paused ? 'PAUSED' : 'AGENT'}</span>
  </PausableElement>
}
