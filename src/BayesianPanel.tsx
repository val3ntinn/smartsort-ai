import { memo } from 'react'
import { motion, useReducedMotion } from 'motion/react'
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
    <PanelHeader icon={BrainCircuit} title="Bayesian inference" number="01" status={result ? 'COMPUTED' : 'READY'}/>
    <div className="algorithm-content">
      <div className="algorithm-description">What is this object?<span>Two-material classification from a sensor observation.</span></div>
      <div className="sensor-reading"><span>Sensor observation</span><strong>{observation ?? 'AWAITING SENSOR'}</strong></div>
      <div className="bayes-chart-legend"><span><i className="prior-key"/>Prior</span><span><i className="posterior-key"/>Posterior</span></div>
      <div className="bayes-probabilities">{BAYES_MATERIALS.map(material => <div className={`bayes-material ${material.toLowerCase()}`} key={material}>
        {result && !reducedMotion && <motion.span key={result.observation+result.priors.PLASTIC} className="bayes-update-flash" initial={{opacity:result.mostLikelyMaterial === material ? .1 : .035}} animate={{opacity:0}} transition={{duration:.55}}/>}
        <div className="bayes-material-heading"><span>{label(material)}{result?.mostLikelyMaterial === material && <motion.small className="probability-leader" initial={reducedMotion ? false : {opacity:0,x:-3}} animate={{opacity:1,x:0}} transition={{duration:reducedMotion ? 0 : .18}}>LIKELY</motion.small>}</span><strong><AnimatedNumber value={result ? result.posteriors[material]*100 : null} suffix="%"/></strong></div>
        <div className="bayes-bar-row"><span>Prior</span><div className="bayes-track prior-track"><PausableElement animate={{width: `${priors[material]*100}%`}} duration={reducedMotion ? 0 : tweenDuration}/></div><span><AnimatedNumber value={priors[material]*100} suffix="%"/></span></div>
        <div className="bayes-bar-row"><span>Posterior</span><div className="bayes-track" role="progressbar" aria-label={`${label(material)} posterior probability`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={result ? result.posteriors[material] * 100 : undefined} aria-valuetext={result ? percent(result.posteriors[material]) : 'Awaiting observation'}><PausableElement animate={{width: `${(result?.posteriors[material] ?? 0) * 100}%`}} duration={reducedMotion || !result ? 0 : tweenDuration}/></div><span><AnimatedNumber value={result ? result.posteriors[material]*100 : null} suffix="%"/></span></div>
      </div>)}</div>
      <div className="bayes-result" role="status" aria-live="polite" aria-atomic="true">
        {result ? <><span>Most likely <strong>{label(result.mostLikelyMaterial)}</strong></span><span><strong><AnimatedNumber value={result.confidence*100} suffix="%"/></strong> confidence</span></> : <span>Run the agent to collect a sensor observation.</span>}
      </div>
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
