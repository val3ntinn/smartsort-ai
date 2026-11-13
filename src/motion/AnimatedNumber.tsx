import { useEffect } from 'react'
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'motion/react'
import { useMotionPlayback } from './MotionPlayback'
import { motionEase } from './presentation'

/** Interpolation is visual only. Assistive technology receives the exact target.
 * Cleanup stops an interrupted tween; null/reset clears the display immediately.
 */
export default function AnimatedNumber({value,suffix='',signed=false,decimals=2,from}: {value:number | null;suffix?:string;signed?:boolean;decimals?:number;from?:number}) {
  const {register,speed}=useMotionPlayback()
  const reducedMotion = useReducedMotion()
  const current = useMotionValue(from ?? value ?? 0)
  const format = (number: number) => `${signed && number > 0 ? '+' : ''}${number.toFixed(decimals)}${suffix}`
  const display = useTransform(current,number => format(number))
  useEffect(() => {
    if (value === null || reducedMotion) {current.set(value ?? 0);return}
    const animation = animate(current,value,{duration:Math.min(.36,speed*.002),ease:motionEase})
    const unregister=register(animation)
    animation.then(()=>unregister())
    return () => {unregister();animation.stop()}
  },[current,value,reducedMotion,register,speed])
  if (value === null) return <span className="animated-number">--</span>
  if (reducedMotion) return <span className="animated-number">{format(value)}</span>
  return <span className="animated-number"><span className="sr-only">{format(value)}</span><motion.span aria-hidden="true">{display}</motion.span></span>
}
