import { memo } from 'react'
﻿import { motion, useReducedMotion } from 'motion/react'
import { Check, Workflow } from 'lucide-react'
import AnimatedNumber from './motion/AnimatedNumber'
import { PausableElement, useMotionPlayback } from './motion/MotionPlayback'
import { PanelHeader } from './components'
import type { SimulationState } from './simulation/controller'

const signed=(value:number)=>`${value>0?'+':''}${value.toFixed(2)}`
function DecisionPanel({result,active=false}:{result:SimulationState['decision'];active?:boolean}) {
  const reducedMotion=useReducedMotion()
  const {speed}=useMotionPlayback()
  const sequential=result && 'kind' in result && result.kind==='finite-horizon'?result:null
  const actionValue=(action:'SORT'|'INSPECT AGAIN')=>sequential?sequential.actionValues[action]:result?.expectedRewards[action]??null
  const minimum=Math.min(-8,result?.evaluations[0].rewards.wrong??-8)
  const maximum=Math.max(10,Math.ceil(Math.max(actionValue('SORT')??0,actionValue('INSPECT AGAIN')??0)))
  const position=(value:number)=>(value-minimum)/(maximum-minimum)*100
  const zero=position(0)
  return <section className="algorithm-panel panel decision-panel" aria-label="MDP sorting decision" data-active={active}>
    <PanelHeader icon={Workflow} title="MDP decision" number="02" status={result?'COMPUTED':'READY'}/>
    <div className="algorithm-content"><div className="algorithm-description">What should I do?<span>{sequential?'Finite-horizon belief-state planning.':'Awaiting Bayesian evidence.'}</span></div>
      {result?<><div className="decision-belief"><span>Proposed material / confidence</span><strong>{result.proposedMaterial} / {(result.probabilities.correct*100).toFixed(2)}%</strong></div>
      <div className="decision-state-probabilities"><span>{sequential?`${sequential.horizon} further sensor reads`:'Legacy one-step record'}</span><span>{sequential?'Terminal unresolved value: 0':'Immediate rewards only'}</span></div>
      <div className="reward-comparison" aria-label={sequential?'Bellman action values':'Immediate expected rewards'}>{result.evaluations.map(evaluation=>{
        const selected=result.selectedAction===evaluation.action,value=actionValue(evaluation.action)
        return <div key={evaluation.action} className={`reward-action ${selected?'selected':''} ${evaluation.action==='INSPECT AGAIN'?'inspect-action':'sort-action'}`}>
          <div className="reward-action-heading"><span>{evaluation.action}{selected&&<motion.span className="reward-selected" initial={reducedMotion?false:{opacity:0}} animate={{opacity:1}}><Check size={10}/>SELECTED</motion.span>}</span><strong>{value===null?'Unavailable':<AnimatedNumber value={value} signed from={0}/>}</strong></div>
          {value!==null&&<div className="reward-track" role="meter" aria-label={`${evaluation.action} ${sequential?'Bellman action value':'expected reward'}`} aria-valuemin={minimum} aria-valuemax={maximum} aria-valuenow={value}>
            <span className="reward-zero" style={{left:`${zero}%`}}/><PausableElement className={value<0?'negative-reward':''} initial={reducedMotion?false:{left:`${zero}%`,width:'0%'}} animate={{left:`${Math.min(zero,position(value))}%`,width:`${Math.abs(position(value)-zero)}%`}} duration={reducedMotion?0:Math.min(.36,speed*.002)}/>
          </div>}
          <p className="action-value-parts">Immediate {signed(evaluation.expectedReward)}{sequential&&evaluation.action==='INSPECT AGAIN'?value===null?' / no reads left':` + future ${signed(sequential.evaluations[1].continuationValue)}`:sequential?' / terminal':''}</p>
        </div>
      })}<div className="reward-scale" aria-hidden="true"><span>{minimum}</span><span style={{left:`${zero}%`}}>0</span><span>+{maximum}</span></div></div>
      <div className={`decision-recommendation ${result.selectedAction==='SORT'?'':'inspect-recommendation'}`} role="status" aria-live="polite"><span><Check size={12}/>{result.selectedAction}</span><span>Value {signed(sequential?.value??result.selectedExpectedReward)}</span></div>
      <details className="decision-breakdown"><summary>{sequential?'Bellman calculation':'Reward calculation'}</summary>
        <p className="bellman-formula">{sequential?'V_h(b) = max[R_sort(b), R_inspect(b) + sum P(O | b) V_(h-1)(Bayes(b,O))]':'R(a) = P(correct) R(correct,a) + P(wrong) R(wrong,a)'}</p>
        <table><caption>Immediate state rewards and their expectation</caption><thead><tr><th scope="col">Action</th><th scope="col">Correct</th><th scope="col">Wrong</th><th scope="col">E[R]</th></tr></thead><tbody>{result.evaluations.map(e=><tr key={e.action}><th scope="row">{e.action}</th><td>{signed(e.rewards.correct)}</td><td>{signed(e.rewards.wrong)}</td><td>{signed(e.expectedReward)}</td></tr>)}</tbody></table>
        {sequential&&<><table className="transition-table"><caption>Inspection transitions: actual observation probabilities and future values</caption><thead><tr><th scope="col">Observation</th><th scope="col">P(O | b)</th><th scope="col">Next P(Plastic)</th><th scope="col">V next</th></tr></thead><tbody>{sequential.transitions.map(t=><tr key={t.observation}><th scope="row">{t.observation}</th><td>{(t.probability*100).toFixed(2)}%</td><td>{(t.posterior.PLASTIC*100).toFixed(2)}%</td><td>{t.nextValue.toFixed(2)}</td></tr>)}</tbody></table>{sequential.terminalReason&&<p className="decision-model-note">{sequential.terminalReason}</p>}</>}
        <p className="decision-explanation">{result.explanation}</p>
      </details><p className="decision-model-note">{sequential?'Inspection has a positive immediate reward, so the optimal policy may use the full finite budget. No future reading or true material is revealed to the planner.':'Saved historical one-step policy; replay preserves its original decision.'}</p></>:<div className="decision-awaiting"><Workflow size={20}/><div>Awaiting agent classification.<span>Future observation probabilities and rewards will be evaluated from its Bayesian belief.</span></div></div>}
    </div>
  </section>
}

export default memo(DecisionPanel)
