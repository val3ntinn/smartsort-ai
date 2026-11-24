import { memo } from 'react'
import { useReducedMotion } from 'motion/react'
import { BrainCircuit } from 'lucide-react'
import AnimatedNumber from './motion/AnimatedNumber'
import { PausableElement, useMotionPlayback } from './motion/MotionPlayback'
import { PanelHeader } from './components'
import { BAYES_MATERIALS, getBayesPriors, type Probabilities, type BayesMaterial, type BayesResult } from './algorithms/bayes'

const percent = (value: number) => `${(value * 100).toFixed(2)}%`
const decimal = (value: number) => Number(value.toFixed(4)).toString()
const label = (material: BayesMaterial) => material === 'PLASTIC' ? 'Plastic' : 'Paper'

function BayesianPanel({ result, initialPriors, active=false }: {
  result: BayesResult | null
  initialPriors?: Probabilities
  active?: boolean
}) {
  const observation = result?.observation ?? null
  const priors = result?.priors ?? initialPriors ?? getBayesPriors()
  const reducedMotion = useReducedMotion()
  const {speed}=useMotionPlayback()
  const tweenDuration=Math.min(.36,speed*.002)
  return <section className="algorithm-panel panel bayes-panel" aria-label="Bayesian inference" data-active={active}>
    <PanelHeader icon={BrainCircuit} title="Bayesian inference" number="01" status={active?'PROCESSING':result?'COMPUTED':'WAITING'}/>
    <div className="algorithm-content">
      <div className="belief-introduction"><p>{observation?<>Evidence received: <strong>{observation}</strong></>:'No sensor evidence yet.'}</p><span>Each observation updates the current belief.</span></div>
      <div className="belief-table"><div className="belief-table-head"><span>Material</span><span>Prior</span><span>Posterior</span></div>{BAYES_MATERIALS.map(material=><div className={`belief-material ${material.toLowerCase()}`} key={material}>
        <div className="belief-numbers"><span>{label(material)}{result?.mostLikelyMaterial===material&&<small>Most likely</small>}</span><span>{percent(priors[material])}</span><strong><AnimatedNumber value={result?result.posteriors[material]*100:null} suffix="%"/></strong></div>
        <div className="belief-axis" role="img" aria-label={`${label(material)}: prior ${percent(priors[material])}; posterior ${result?percent(result.posteriors[material]):'awaiting observation'}`}>
          <span className="belief-axis-rule"/><span className="belief-prior-marker" style={{left:`${priors[material]*100}%`}}/>
          {result&&<><PausableElement className="belief-shift" animate={{left:`${Math.min(priors[material],result.posteriors[material])*100}%`,width:`${Math.abs(priors[material]-result.posteriors[material])*100}%`}} duration={reducedMotion?0:tweenDuration}/><PausableElement className="belief-posterior-marker" animate={{left:`${result.posteriors[material]*100}%`}} duration={reducedMotion?0:tweenDuration}/></>}
        </div><div className="belief-axis-labels"><span>0%</span><span>{result?`${result.posteriors[material]>=priors[material]?'+':''}${((result.posteriors[material]-priors[material])*100).toFixed(2)} percentage points`:'Awaiting update'}</span><span>100%</span></div>
      </div>)}</div>
      <div className="belief-key"><span><i className="key-prior"/>Prior belief</span><span><i className="key-posterior"/>Updated belief</span></div>
      <div className="bayes-result" role="status" aria-live="polite" aria-atomic="true">{result?<><span>Proposed material <strong>{label(result.mostLikelyMaterial)}</strong></span><span><strong>{percent(result.confidence)}</strong> confidence</span></>:<span>Start the agent to calculate its first posterior.</span>}</div>
      <details className="bayes-calculation">
        <summary>Calculation breakdown <span>Bayes' theorem</span></summary>
        <div className="bayes-formula">P(M | O) = P(O | M) &times; P(M) / P(O)</div>
        {result ? <div className="bayes-calculation-values">
          <div className="bayes-likelihoods"><span>Likelihood P(O | M)</span>{BAYES_MATERIALS.map(material => <span key={material}>{label(material)} <b>{decimal(result.likelihoods[material])}</b></span>)}</div>
          <p><span>Evidence P(O)</span><code>{BAYES_MATERIALS.map(material => `${decimal(result.likelihoods[material])} * ${decimal(result.priors[material])}`).join(' + ')} = {decimal(result.evidence)}</code></p>
          {BAYES_MATERIALS.map(material => <p key={material}><span>P({label(material)} | {label(result.observation)})</span><code>({decimal(result.likelihoods[material])} * {decimal(result.priors[material])}) / {decimal(result.evidence)} = {percent(result.posteriors[material])}</code></p>)}
        </div> : <p className="bayes-calculation-empty">The agent will use the configured prior for the first observation, then carry its posterior forward for any reinspection.</p>}
      </details>
      <div className="algorithm-footer"><span className={`status-dot ${result ? '' : 'neutral'}`}/>{result ? 'Calculated locally from the sensor model' : 'Awaiting sensor observation'}</div>
      <p className="bayes-model-note">Prior shown is the belief before this inspection. Repeated inspections retain earlier evidence.</p>
    </div>
  </section>
}



export default memo(BayesianPanel)
