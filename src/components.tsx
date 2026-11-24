import { StatusBadge } from './design-system/components'
import { Package } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export function MaterialIcon({ type, size = 20 }: { type: string; size?: number }) {
  return type === 'plastic' ? <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 3h6v4l2 3v9a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-9l2-3V3Z"/><path d="M9 5h6M7 12h10M7 17h10"/></svg> : type === 'paper' ? <Package size={size} strokeWidth={1.5}/> : <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><ellipse cx="12" cy="5" rx="6" ry="2.5"/><path d="M6 5v14c0 3 12 3 12 0V5M6 18c0 3 12 3 12 0M10 5h4"/></svg>
}
export function Robot() { return <div className="robot"><div className="robot-antenna"/><div className="robot-face"><i/><i/></div><div className="robot-wheels"><i/><i/></div></div> }
export function PanelHeader({ icon: Icon, title, number, status = 'IDLE' }: { icon: LucideIcon; title: string; number: string; status?: 'IDLE' | 'READY' | 'COMPUTED' | 'PROCESSING' | 'FAILED' | 'WAITING' }) { return <div className="panel-heading"><span className="step-number">{number}</span><Icon size={15}/><h3>{title}</h3><StatusBadge tone={status==='FAILED'?'error':status==='COMPUTED'||status==='PROCESSING'?'info':'neutral'} className={`idle-label ${status === 'COMPUTED' ? 'computed-label' : ''}`}>{status}</StatusBadge></div> }



