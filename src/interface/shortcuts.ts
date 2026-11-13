import type { TransportSnapshot } from '../simulation/transport.ts'
export type ShortcutAction='toggleSidebar'|'start'|'pause'|'resume'|'reset'|'nextStep'
interface ShortcutKey {key:string;ctrlKey:boolean;metaKey:boolean;altKey:boolean;shiftKey:boolean;repeat:boolean}
/** Resolve only unmodified simulator commands or the explicit sidebar chord. */
export function shortcutAction(event:ShortcutKey,state:Pick<TransportSnapshot,'status'|'mode'>,simulator:boolean):ShortcutAction|null {
  if(event.repeat||event.altKey||event.shiftKey)return null
  const key=event.key.toLowerCase()
  if((event.ctrlKey||event.metaKey)&&key==='b')return 'toggleSidebar'
  if(event.ctrlKey||event.metaKey||!simulator)return null
  if(key===' ')return state.status==='playing'?'pause':state.status==='paused'?'resume':'start'
  if(key==='r')return 'reset'
  if(key==='n'&&state.mode==='step'&&state.status==='paused')return 'nextStep'
  return null
}
export function isShortcutTarget(target:EventTarget|null):boolean {
  return target instanceof Element && !!target.closest('input,textarea,select,[contenteditable]:not([contenteditable="false"]),[role="textbox"],[role="slider"],[role="combobox"]')
}
