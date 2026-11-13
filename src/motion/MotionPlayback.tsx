import { createContext, createElement, useContext, useLayoutEffect, useRef, useState, useMemo, type HTMLAttributes, type ReactNode } from 'react'
import { useAnimate, useReducedMotion } from 'motion/react'
import { createAnimationRegistry, type ManagedAnimation } from './registry'
import { motionEase } from './presentation'

type Controls=ManagedAnimation
const PlaybackContext=createContext({paused:false,speed:180,register:(_control:Controls):(()=>void)=>()=>{}})
export function MotionPlaybackProvider({paused,speed,children}:{paused:boolean;speed:number;children:ReactNode}) {
  const [registry]=useState(()=>createAnimationRegistry(paused))
  useLayoutEffect(()=>{registry.setPaused(paused)},[registry,paused])
  useLayoutEffect(()=>registry.clear,[registry])
  const value=useMemo(()=>({paused,speed,register:registry.register}),[paused,speed,registry])
  return <PlaybackContext.Provider value={value}>{children}</PlaybackContext.Provider>
}
export const useMotionPlayback=()=>useContext(PlaybackContext)
type Values=Record<string,number|string>
interface PausableProps extends HTMLAttributes<HTMLElement> {as?:'div'|'span';animate:Values;initial?:Values|false;duration:number;delay?:number}
/** Imperative Motion controls are registered so Pause freezes actual interpolation,
 * not just controller ticks. Changes cancel the previous tween before starting another.
 */
export function PausableElement({as='div',animate:target,initial=false,duration,delay=0,children,...props}:PausableProps) {
  const [scope,animateElement]=useAnimate<HTMLElement>()
  const {register}=useMotionPlayback()
  const reducedMotion=useReducedMotion()
  const first=useRef(true)
  const key=JSON.stringify(target)
  useLayoutEffect(()=>{
    if(!scope.current)return
    if(first.current) {
      first.current=false
      animateElement(scope.current,initial===false?target:initial,{duration:0}).complete()
    }
    const control=animateElement(scope.current,target,{duration:reducedMotion?0:duration,delay:reducedMotion?0:delay,ease:motionEase})
    const unregister=register(control)
    control.then(()=>unregister())
    return()=>{unregister();control.stop()}
    // Values, timing, and accessibility preference own this animation's lifetime.
  },[key,duration,delay,reducedMotion,register,animateElement,scope])
  return createElement(as,{...props,ref:scope},children)
}
