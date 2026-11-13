import { memo, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CircleHelp, FlaskConical, History, Keyboard, LayoutDashboard, PanelLeftClose, PanelLeftOpen, Recycle, ScanLine, ShieldCheck, Workflow, X, type LucideIcon } from 'lucide-react'

const navigation=[{label:'Overview',icon:LayoutDashboard},{label:'Simulator',icon:ScanLine},{label:'Experiment Lab',icon:FlaskConical},{label:'Algorithms',icon:Workflow},{label:'History',icon:History},{label:'About',icon:CircleHelp}]

function SidebarButton({label,icon:Icon,collapsed,active=false,onClick,className='nav-item'}:{label:string;icon:LucideIcon;collapsed:boolean;active?:boolean;onClick:()=>void;className?:string}) {
  const id=useId(),ref=useRef<HTMLButtonElement>(null)
  const [hover,setHover]=useState(false),[focus,setFocus]=useState(false)
  const [top,setTop]=useState(0)
  const show=()=>setTop(ref.current?.getBoundingClientRect().top??0)
  return <><button ref={ref} aria-label={label} aria-current={active?'page':undefined} aria-describedby={collapsed&&(hover||focus)?id:undefined} className={`${className} ${active?'active':''}`} onClick={onClick} onPointerEnter={()=>{show();setHover(true)}} onPointerLeave={()=>setHover(false)} onFocus={()=>{show();setFocus(true)}} onBlur={()=>setFocus(false)}><Icon size={18}/><span className="sidebar-label">{label}</span>{active&&<span className="nav-dot"/>}</button>{collapsed&&(hover||focus)&&createPortal(<span id={id} role="tooltip" className="rail-tooltip" style={{top:top+6,left:76}}>{label}</span>,document.body)}</>
}

export default memo(function Sidebar({page,collapsed,mobile,open,blocked,onToggle,onClose,onNavigate,onGuide,onShortcuts}:{page:string;collapsed:boolean;mobile:boolean;open:boolean;blocked:boolean;onToggle:()=>void;onClose:()=>void;onNavigate:(page:string)=>void;onGuide:()=>void;onShortcuts:()=>void}) {
  const rail=collapsed&&!mobile
  return <aside id="application-sidebar" aria-label="Workspace sidebar" role={mobile&&open?'dialog':undefined} aria-modal={mobile&&open?true:undefined} inert={blocked||mobile&&!open} className={`sidebar ${rail?'is-collapsed':''} ${open?'mobile-open':''}`}>
    <div className="sidebar-heading"><a aria-label="SmartSort AI, open Simulator" className="brand" href="#" onClick={event=>{event.preventDefault();onNavigate('Simulator')}}><div className="brand-mark"><Recycle size={24}/></div><span className="sidebar-label">SmartSort<span className="brand-ai">AI</span></span></a><button className="sidebar-toggle icon-button" aria-label={rail?'Expand sidebar':'Collapse sidebar'} aria-controls="application-sidebar" aria-expanded={!rail} onClick={onToggle}>{rail?<PanelLeftOpen size={17}/>:<PanelLeftClose size={17}/>}</button><button className="mobile-close icon-button" aria-label="Close navigation" onClick={onClose}><X size={18}/></button></div>
    <div className="workspace-label">WORKSPACE <span>01</span></div>
    <nav aria-label="Workspace navigation">{navigation.map(({label,icon})=><SidebarButton key={label} label={label} icon={icon} collapsed={rail} active={page===label} onClick={()=>onNavigate(label)}/>)}</nav>
    <div className="sidebar-bottom"><div className="project-note"><FlaskConical size={18}/><span>Built to learn.<br/><strong>Designed to sort.</strong></span></div><div className="version"><span className="status-dot"/> Agent v0.2 <span className="version-tag">LOCAL</span></div><SidebarButton label="Keyboard shortcuts" icon={Keyboard} collapsed={rail} onClick={onShortcuts} className="sidebar-utility"/><SidebarButton label="Workspace guide" icon={CircleHelp} collapsed={rail} onClick={onGuide} className="sidebar-utility"/><div className="profile"><div className="avatar">SS</div><div>AI Fundamentals<span>University project</span></div><ShieldCheck size={16}/></div></div>
  </aside>
})

