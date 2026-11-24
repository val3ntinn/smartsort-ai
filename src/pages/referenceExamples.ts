import {getBayesPriors,inferMaterial,type BayesMaterial} from '../algorithms/bayes.ts'
import {solveSortingMDP} from '../algorithms/finiteMdp.ts'
import {bfs} from '../algorithms/bfs.ts'
import {DEFAULT_PARAMETERS,sensorModel} from '../simulation/parameters.ts'
export function referenceInference(observation:BayesMaterial,remainingInspections:number) {
 const model=sensorModel(DEFAULT_PARAMETERS)
 const bayesian=inferMaterial(observation,getBayesPriors(),model)
 const decision=solveSortingMDP(bayesian.posteriors,{model,remainingInspections,wrongSortReward:-DEFAULT_PARAMETERS.incorrectSortPenalty})
 return {bayesian,decision}
}
export function referenceRoute(material:BayesMaterial,obstacle:boolean) {
 const target=material==='PLASTIC'?3:7,otherBin=material==='PLASTIC'?7:3
 return bfs({rows:4,columns:4,start:12,target,obstacles:[otherBin,...(obstacle?[8]:[])]})
}
