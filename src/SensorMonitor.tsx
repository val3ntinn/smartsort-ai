import { Activity } from 'lucide-react'
import { sensorPresentation } from './simulation/experiments'
import type { TransportSnapshot } from './simulation/transport'

export default function SensorMonitor({playback}:{playback:TransportSnapshot}) {
  const sensor=sensorPresentation(playback)
  return <section className={`live-sensor-monitor sensor-${sensor.status}`} aria-label="Simulated sensor monitor">
    <div className="sensor-monitor-heading"><span><Activity size={13}/>Live sensor monitor</span><span className="sensor-state"><i/>{sensor.status.toUpperCase()}</span></div>
    <div className="sensor-monitor-body"><div className="sensor-activity"><svg viewBox="0 0 200 40" aria-hidden="true"><path className="sensor-baseline" d="M0 20H200"/><path className="sensor-activity-wave" d="M-100 20h20l5-5 5 10 5-20 5 30 5-15h35l5-5 5 10 5-20 5 30 5-15h35l5-5 5 10 5-20 5 30 5-15h35l5-5 5 10 5-20 5 30 5-15h35l5-5 5 10 5-20 5 30 5-15h100"/></svg><span>Activity indicator / not a measured signal</span></div>
    <div className="sensor-observation"><span>Current observation</span><strong>{sensor.observation??'--'}</strong><span>Classification confidence</span><strong>{sensor.confidence===null?'Awaiting Bayes':`${(sensor.confidence*100).toFixed(2)}%`}</strong></div>
    <table className="sensor-likelihood-table"><caption>Sensor likelihoods P(observation | material)</caption><thead><tr><th>Observation</th><th>Plastic</th><th>Paper</th></tr></thead><tbody>{(['PLASTIC','PAPER'] as const).map(observation=><tr key={observation} className={sensor.observation===observation?'selected':''}><th scope="row">{observation}</th><td>{sensor.model?.[observation].PLASTIC.toFixed(2)??'--'}</td><td>{sensor.model?.[observation].PAPER.toFixed(2)??'--'}</td></tr>)}</tbody></table></div>
    {sensor.error&&<p className="sensor-error-message" role="alert">{sensor.error}</p>}<p className="sensor-simulation-note">Simulated observations. No hardware measurements or physical telemetry.</p>
  </section>
}
