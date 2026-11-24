import {Component,useEffect,type ReactNode,type RefObject} from 'react'
import {Button,Notice} from '../design-system/components'
export class PageBoundary extends Component<{children:ReactNode;onSimulator:()=>void},{failed:boolean}> {
  state={failed:false}
  static getDerivedStateFromError(){return {failed:true}}
  render(){return this.state.failed?<div className="page-loading"><Notice tone="error">This page could not be loaded. Check the local server before trying again.</Notice><Button onClick={this.props.onSimulator}>Return to Simulator</Button></div>:this.props.children}
}
/** Suspense commits this wrapper only once the destination is available. */
export function PageEntry({children,focusFlag}:{children:ReactNode;focusFlag:RefObject<boolean>}) {
  useEffect(()=>{if(focusFlag.current){const heading=document.querySelector<HTMLElement>('main [data-view] h1');if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true})}focusFlag.current=false}},[focusFlag])
  return <>{children}</>
}
