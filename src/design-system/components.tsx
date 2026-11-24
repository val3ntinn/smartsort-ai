import { useEffect, useId, useRef, useState, type ButtonHTMLAttributes, type HTMLAttributes, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

export type Tone='neutral'|'info'|'success'|'warning'|'error'
export function Button({variant='secondary',size='normal',busy=false,className='',children,disabled,type='button',...props}:ButtonHTMLAttributes<HTMLButtonElement>&{variant?:'primary'|'secondary'|'quiet'|'danger';size?:'normal'|'compact';busy?:boolean}) {
  return <button {...props} type={type} className={`ss-button ${className}`} data-variant={variant} data-size={size} aria-busy={busy||undefined} disabled={disabled||busy}>{busy&&<span className="ss-spinner" aria-hidden="true"/>}{children}</button>
}
export function IconButton({label,children,className='',...props}:Omit<ButtonHTMLAttributes<HTMLButtonElement>,'aria-label'>&{label:string}) {
  return <Button {...props} variant="quiet" aria-label={label} className={`icon-button ${className}`}>{children}</Button>
}
export function StatusBadge({tone='neutral',children,className='',...props}:HTMLAttributes<HTMLSpanElement>&{tone?:Tone}) {
  return <span {...props} className={`status-badge ${className}`} data-tone={tone}>{children}</span>
}
export function DataPanel({title,meta,children,plain=false,...props}:Omit<HTMLAttributes<HTMLElement>,'title'>&{title:ReactNode;meta?:ReactNode;plain?:boolean}) {
  const id=useId()
  return <section {...props} className={`data-panel ${props.className??''}`} data-surface={plain?'plain':'bounded'} aria-labelledby={id}><header className="data-panel-heading"><h2 id={id}>{title}</h2>{meta}</header><div className="data-panel-body">{children}</div></section>
}
export function Notice({tone='info',children,...props}:HTMLAttributes<HTMLDivElement>&{tone?:Tone}) {
  return <div role={tone==='error'?'alert':'status'} {...props} className={`notice ${props.className??''}`} data-tone={tone}>{children}</div>
}
export function EmptyState({title,children,action}:{title:string;children:ReactNode;action?:ReactNode}) {
  return <div className="empty-state"><h3>{title}</h3><div>{children}</div>{action&&<div className="empty-state-actions">{action}</div>}</div>
}
export function NumericReadout({value,label,...props}:HTMLAttributes<HTMLOutputElement>&{value:string|number;label:string}) {
  return <output {...props} aria-label={label} className={`numeric-readout ${props.className??''}`}>{value}</output>
}
interface TooltipBindings {ref:React.RefObject<HTMLButtonElement|null>;onFocus:()=>void;onBlur:()=>void;onPointerEnter:()=>void;onPointerLeave:()=>void;'aria-describedby':string|undefined}
/** No wrapper geometry: the trigger keeps native button semantics and placement. */
export function Tooltip({label,enabled=true,children}:{label:string;enabled?:boolean;children:(bindings:TooltipBindings)=>ReactNode}) {
  const id=useId(),ref=useRef<HTMLButtonElement>(null)
  const [hover,setHover]=useState(false),[focus,setFocus]=useState(false),[dismissed,setDismissed]=useState(false)
  const [position,setPosition]=useState({top:0,left:0})
  const leaveTimer=useRef<ReturnType<typeof setTimeout>|null>(null)
  const keepHover=()=>{if(leaveTimer.current)clearTimeout(leaveTimer.current);setHover(true)}
  const leave=()=>{if(leaveTimer.current)clearTimeout(leaveTimer.current);leaveTimer.current=setTimeout(()=>setHover(false),120)}
  useEffect(()=>()=>{if(leaveTimer.current)clearTimeout(leaveTimer.current)},[])
  const visible=enabled&&(hover||focus)&&!dismissed
  function positionTooltip(){const rect=ref.current?.getBoundingClientRect();if(rect)setPosition({top:Math.max(8,Math.min(rect.top+6,window.innerHeight-48)),left:Math.max(8,Math.min(rect.right+8,window.innerWidth-180))})}
  function show(){positionTooltip();setDismissed(false)}
  useEffect(()=>{
    if(!visible)return
    const escape=(event:KeyboardEvent)=>{if(event.key==='Escape')setDismissed(true)}
    const dismiss=()=>setDismissed(true)
    document.addEventListener('keydown',escape)
    window.addEventListener('scroll',dismiss,true);window.addEventListener('resize',dismiss)
    return()=>{document.removeEventListener('keydown',escape);window.removeEventListener('scroll',dismiss,true);window.removeEventListener('resize',dismiss)}
  },[visible])
  return <>{children({ref,onFocus:()=>{show();setFocus(true)},onBlur:()=>setFocus(false),onPointerEnter:()=>{show();keepHover()},onPointerLeave:leave,'aria-describedby':visible?id:undefined})}{visible&&createPortal(<span id={id} role="tooltip" className="ss-tooltip" style={position} onPointerEnter={keepHover} onPointerLeave={leave}>{label}</span>,document.body)}</>
}
interface TabItem {id:string;label:string;content:ReactNode;disabled?:boolean}
export function Tabs({label,items,value,onChange}:{label:string;items:readonly TabItem[];value:string;onChange:(id:string)=>void}) {
  const prefix=useId()
  function move(event:React.KeyboardEvent<HTMLButtonElement>,index:number){
    const available=items.map((item,i)=>!item.disabled?i:-1).filter(i=>i>=0)
    const position=available.indexOf(index)
    const next=event.key==='Home'?available[0]:event.key==='End'?available.at(-1):event.key==='ArrowRight'?available[(position+1)%available.length]:event.key==='ArrowLeft'?available[(position-1+available.length)%available.length]:undefined
    if(next===undefined)return
    event.preventDefault();onChange(items[next].id)
    document.getElementById(`${prefix}-tab-${next}`)?.focus()
  }
  return <div className="ss-tabs"><div role="tablist" aria-label={label}>{items.map((item,index)=><button key={item.id} type="button" role="tab" id={`${prefix}-tab-${index}`} aria-controls={`${prefix}-panel-${index}`} aria-selected={value===item.id} tabIndex={value===item.id?0:-1} disabled={item.disabled} onClick={()=>onChange(item.id)} onKeyDown={event=>move(event,index)}>{item.label}</button>)}</div>{items.map((item,index)=><div key={item.id} role="tabpanel" id={`${prefix}-panel-${index}`} aria-labelledby={`${prefix}-tab-${index}`} hidden={value!==item.id} tabIndex={0}>{item.content}</div>)}</div>
}
