import { sensorModel, DEFAULT_PARAMETERS } from './simulation/parameters'
import { Box, FileText, Package } from 'lucide-react'
import { MaterialIcon } from './components'
import { OBJECTS } from './simulation/sensor'
import type { BayesMaterial } from './algorithms/bayes'
import type { SimulationControls } from './useSimulation'

export default function AgentSetup({ simulation: sim }: { simulation: SimulationControls }) {
  const sensor = sim.config.sensor
  const parameters=sim.config.parameters??DEFAULT_PARAMETERS
  const model=sensorModel(parameters)
  return <div className="agent-setup">
    <div className="small-heading"><span><strong>Select an object</strong></span><span>ONE COMPLETE SORTING RUN</span></div>
    <div className="agent-object-options" role="group" aria-label="Object to recycle">{OBJECTS.map(object => <button key={object.id} disabled={sim.busy} aria-pressed={sim.config.objectId === object.id} className={sim.config.objectId === object.id ? 'selected' : ''} onClick={() => sim.updateConfig({objectId:object.id})}>{object.id === 'plastic-bottle' ? <MaterialIcon type="plastic" size={22}/> : object.id === 'paper-sheet' ? <FileText size={22} strokeWidth={1.5}/> : <Package size={22} strokeWidth={1.5}/>}<span>{object.label}<small>{object.material === 'PLASTIC' ? 'Plastic' : 'Paper'} category</small></span></button>)}</div>
    <details className="agent-sensor-settings"><summary><span><Box size={12}/>Sensor &amp; reproducibility</span><span>{sensor.mode === 'seeded' ? `SEED ${sensor.seed}` : 'PREDEFINED'}</span></summary><div className="agent-settings-fields"><label>Observation source<select disabled={sim.busy} value={sensor.mode} onChange={event => sim.updateConfig({sensor:event.target.value === 'seeded' ? {mode:'seeded',seed:42} : {mode:'predefined',observations:(['PLASTIC','PAPER'] as BayesMaterial[]).slice(0,parameters.maxInspections)}})}><option value="seeded">Imperfect seeded sensor</option><option value="predefined">Predefined observations</option></select></label>{sensor.mode === 'seeded' ? <label>Seed (32-bit unsigned)<input type="number" min="0" max="4294967295" step="1" value={sensor.seed} disabled={sim.busy} onChange={event => sim.updateConfig({sensor:{mode:'seeded',seed:Number(event.target.value)}})}/></label> : <label>Observations (up to {parameters.maxInspections}, comma-separated)<input disabled={sim.busy} value={sensor.observations.join(',')} onChange={event => sim.updateConfig({sensor:{mode:'predefined',observations:event.target.value.toUpperCase().split(',').map(value => value.trim()) as BayesMaterial[]}})} placeholder="PLASTIC,PAPER"/></label>}
      <label className="initial-prior-control">Initial Plastic prior <span>{(sim.config.initialPriors.PLASTIC*100).toFixed(0)}% Plastic / {(sim.config.initialPriors.PAPER*100).toFixed(0)}% Paper</span><input type="range" min="1" max="99" step="1" disabled={sim.busy} value={sim.config.initialPriors.PLASTIC*100} onChange={event => {const plastic=Number(event.target.value)/100;sim.updateConfig({initialPriors:{PLASTIC:plastic,PAPER:1-plastic}})}}/></label></div><p>Default priors: 50/50. Sensor likelihoods: P(Plastic observation | Plastic) = {model.PLASTIC.PLASTIC.toFixed(2)}; P(Plastic observation | Paper) = {model.PLASTIC.PAPER.toFixed(2)}. Reinspections carry the posterior forward.</p><p>Original-model example for a Paper object: set Plastic prior to 20%, then use PLASTIC,PAPER,PAPER with a three-read limit. This example uses the original model. Experiment Lab changes sensor accuracy, sorting penalty, and the inspection limit.</p></details>
    {sim.error && <p className="agent-config-error" role="alert">{sim.error}</p>}
  </div>
}
