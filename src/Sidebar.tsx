import { memo, Fragment } from 'react'
import { Tooltip } from './design-system/components'
import { CircleHelp, FlaskConical, History, Keyboard, LayoutDashboard, PanelLeftClose, PanelLeftOpen, Recycle, ScanLine, Workflow, X, type LucideIcon } from 'lucide-react'

const navigation=[{label:'Simulator',icon:ScanLine},{label:'Experiment Lab',icon:FlaskConical},{label:'History',icon:History},{label:'Overview',icon:LayoutDashboard},{label:'Algorithms',icon:Workflow},{label:'About',icon:CircleHelp}]

function SidebarButton({label,icon:Icon,collapsed,active=false,onClick,className='nav-item'}:{label:string;icon:LucideIcon;collapsed:boolean;active?:boolean;onClick:()=>void;className?:string}) {
  return <Tooltip label={label} enabled={collapsed}>{bindings=><button {...bindings} aria-label={label} aria-current={active?'page':undefined} className={`${className} ${active?'active':''}`} onClick={onClick}><Icon size={18}/><span className="sidebar-label">{label}</span>{active&&<span className="nav-dot"/>}</button>}</Tooltip>
}

export default memo(function Sidebar({page,collapsed,mobile,open,blocked,onToggle,onClose,onNavigate,onGuide,onShortcuts}:{page:string;collapsed:boolean;mobile:boolean;open:boolean;blocked:boolean;onToggle:()=>void;onClose:()=>void;onNavigate:(page:string)=>void;onGuide:()=>void;onShortcuts:()=>void}) {
  const rail=collapsed&&!mobile
  return <aside id="application-sidebar" aria-label="Workspace sidebar" role={mobile&&open?'dialog':undefined} aria-modal={mobile&&open?true:undefined} inert={blocked||mobile&&!open} className={`sidebar ${rail?'is-collapsed':''} ${open?'mobile-open':''}`}>
    <div className="sidebar-heading"><a aria-label="SmartSort AI, open Simulator" className="brand" href="#" onClick={event=>{event.preventDefault();onNavigate('Simulator')}}><div className="brand-mark"><Recycle size={24}/></div><span className="sidebar-label">SmartSort<span className="brand-ai">AI</span></span></a><button className="sidebar-toggle icon-button" aria-label={rail?'Expand sidebar':'Collapse sidebar'} aria-controls="application-sidebar" aria-expanded={!rail} onClick={onToggle}>{rail?<PanelLeftOpen size={17}/>:<PanelLeftClose size={17}/>}</button><button className="mobile-close icon-button" aria-label="Close navigation" onClick={onClose}><X size={18}/></button></div>
    <div className="workspace-label">Laboratory</div>
    <nav aria-label="Workspace navigation">{navigation.map(({label,icon},index)=><Fragment key={label}>{index===3&&<div className="nav-group-label">Reference</div>}<SidebarButton label={label} icon={icon} collapsed={rail} active={page===label} onClick={()=>onNavigate(label)}/></Fragment>)}</nav>
    <div className="sidebar-bottom"><SidebarButton label="Keyboard shortcuts" icon={Keyboard} collapsed={rail} onClick={onShortcuts} className="sidebar-utility"/><SidebarButton label="Workspace guide" icon={CircleHelp} collapsed={rail} onClick={onGuide} className="sidebar-utility"/><p className="sidebar-context">AI Fundamentals<span><br/>Local simulation laboratory</span></p></div>
  </aside>
})

