import { ScanLine, BrainCircuit, Route } from 'lucide-react'
export default function WorkflowDiagram() {
  return <figure className="workflow-diagram" aria-label="Agent data flow"><ol>{[
    {title:'Observe',icon:ScanLine,input:'Sensor observation',output:'Bayesian belief',description:'An imperfect reading becomes a probability distribution over Plastic and Paper.'},
    {title:'Reason',icon:BrainCircuit,input:'Belief + inspection budget',output:'SORT or INSPECT AGAIN',description:'Finite-horizon planning compares acting now with the expected value of another inspection.'},
    {title:'Act',icon:Route,input:'Selected destination',output:'BFS route + sorting result',description:'A shortest feasible path takes the robot to its selected bin. The result checks the classification.'}
  ].map(({title,icon:Icon,input,output,description})=><li key={title}><div className="workflow-title"><Icon size={20}/><h3>{title}</h3></div><span className="workflow-input">{input}</span><strong>{output}</strong><p>{description}</p></li>)}</ol><figcaption><span className="workflow-loop" aria-hidden="true"/>Inspect again: repeat sensing and carry the previous posterior forward as the next prior.</figcaption></figure>
}
