import type { StageId, TransportSnapshot } from './transport.ts'

export function simulationStages(playback:TransportSnapshot) {
  const s=playback.simulation
  const latest=s.inspections.at(-1)
  const next:StageId = !['playing','paused'].includes(playback.status) ? playback.status==='completed'?'result':'object' :
    !['sensor','bayes','decision','planning','exploring','tracing','moving'].includes(s.phase) ? 'result' :
    s.phase==='sensor' ? playback.checkpoint==='mdp' && s.decision?.selectedAction==='INSPECT AGAIN'?'reinspect':'sensor' :
    s.phase==='bayes'?'bayes':s.phase==='decision'?'mdp':s.phase==='planning'?'bfs':s.phase==='exploring' ? playback.checkpoint==='bfs'?(s.bfs?.pathFound?'path':'result'):'bfs':s.phase==='tracing' ? playback.checkpoint==='path'?'robot':'path':'robot'
  const atBoundary = (playback.checkpoint==='object' && s.phase==='sensor' && !s.inspections.length) ||
    (playback.checkpoint==='sensor' && s.phase==='bayes') || (playback.checkpoint==='bayes' && s.phase==='decision') ||
    (playback.checkpoint==='mdp' && ['sensor','planning','unresolved','error'].includes(s.phase)) ||
    (playback.checkpoint==='reinspect' && s.phase==='sensor') || (playback.checkpoint==='bfs' && s.visitedCount===s.bfs?.visitedCells.length) ||
    (playback.checkpoint==='path' && s.pathCount===s.bfs?.path.length) || (playback.checkpoint==='robot' && s.phase==='sorted')
  const cursor = playback.status==='paused' && atBoundary && playback.checkpoint ? playback.checkpoint : next
  const defs: {id:StageId;name:string;algorithm:string;description:string;done:boolean;optional?:boolean;skipped?:boolean}[] = [
    {id:'object',name:'Object',algorithm:'Object selection',description:'The robot carries the selected recyclable from its configured start.',done:s.phase!=='idle'},
    {id:'sensor',name:'Sensor',algorithm:'Imperfect sensor',description:'Collect a seeded or predefined material observation without changing the sensor model.',done:!!latest && !(s.phase==='sensor')},
    {id:'bayes',name:'Bayes',algorithm:'Bayesian inference',description:'Multiply likelihoods by the current prior, normalize, and retain the posterior for future inspections.',done:!!latest?.bayesian && s.phase!=='sensor'},
    {id:'mdp',name:'MDP',algorithm:'Expected reward',description:'Compare SORT and INSPECT AGAIN using the exact Bayesian posterior.',done:!!latest?.decision && s.phase!=='sensor'},
    {id:'reinspect',name:'Reinspect',algorithm:'Repeated inspection',description:'Carry the previous posterior forward as the new prior before collecting another observation.',done:s.inspections.length>1 || playback.checkpoint==='reinspect' || (playback.status==='completed'&&s.inspections.some(inspection=>inspection.decision?.selectedAction==='INSPECT AGAIN')),optional:true,skipped:!!s.bfs && s.inspections.length===1},
    {id:'bfs',name:'BFS',algorithm:'Breadth-first search',description:'Explore traversable cells in actual FIFO order until the search completes.',done:!!s.bfs && s.visitedCount===s.bfs.visitedCells.length,skipped:playback.status==='completed'&&!s.bfs},
    {id:'path',name:'Path',algorithm:'Shortest-path reconstruction',description:'Reveal the actual shortest route reconstructed from BFS parent links.',done:!!s.bfs?.pathFound && s.pathCount===s.bfs.path.length,skipped:(s.bfs?.pathFound===false&&s.visitedCount===s.bfs.visitedCells.length)||(playback.status==='completed'&&!s.bfs?.pathFound)},
    {id:'robot',name:'Robot',algorithm:'Route execution',description:'Move the robot along each computed route edge, preserving all algorithm outputs.',done:s.phase==='sorted',skipped:(s.bfs?.pathFound===false&&s.visitedCount===s.bfs.visitedCells.length)||(playback.status==='completed'&&s.phase!=='sorted')},
    {id:'result',name:'Result',algorithm:'Outcome evaluation',description:'Display the computed sorting outcome, including incorrect, unreachable, and unresolved classifications.',done:playback.status==='completed'},
  ]
  const stages=defs.map(stage=>({...stage,status:stage.skipped?'skipped':stage.done?'completed':stage.id===cursor?'current':'pending',cursor:stage.id===cursor}))
  const current=stages.find(stage=>stage.id===cursor)!
  const nextName=stages.find(stage=>stage.id===next)?.name ?? 'Result'
  const explanation=playback.status==='idle'?'Choose an object, configure the grid, and start the simulation.':playback.status==='paused' && atBoundary ? `Paused after ${current.name}. Next Step continues with ${nextName}. ${current.description}` : playback.status==='completed' ? (s.result?.message ?? 'Simulation complete.') : `${playback.status==='paused'?'Paused during this operation. Resume or Next Step continues from the same state. ':''}${current.description}`
  return {stages,current,nextName,explanation}
}
