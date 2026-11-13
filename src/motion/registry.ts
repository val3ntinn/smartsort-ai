export type ManagedAnimation={pause:()=>void;play:()=>void;stop:()=>void}
/** A registry contains only live interpolation controls, not finished animations. */
export function createAnimationRegistry(initialPaused=false) {
  const controls=new Set<ManagedAnimation>()
  let paused=initialPaused
  return {
    register(control:ManagedAnimation){controls.add(control);if(paused)control.pause();return()=>{controls.delete(control)}},
    setPaused(value:boolean){if(value===paused)return;paused=value;for(const control of controls)paused?control.pause():control.play()},
    clear(){for(const control of controls)control.stop();controls.clear()},
  }
}
