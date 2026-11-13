import { BAYES_MATERIALS, getSensorLikelihoods, inferMaterial, validateSensorModel, type BayesMaterial, type Probabilities, type SensorModel } from './bayes.ts'
import { evaluateSortingDecision, type ActionEvaluation, type MdpAction } from './mdp.ts'

export interface InspectionTransition {
  observation:BayesMaterial
  probability:number
  posterior:Probabilities
  remainingInspections:number
  nextValue:number
  weightedValue:number
}
export interface SequentialEvaluation extends ActionEvaluation {
  available:boolean
  continuationValue:number
  actionValue:number|null
}
export interface FiniteHorizonResult {
  kind:'finite-horizon'
  horizon:number
  proposedMaterial:BayesMaterial
  probabilities:{correct:number;wrong:number}
  evaluations:SequentialEvaluation[]
  expectedRewards:Record<MdpAction,number>
  actionValues:Record<MdpAction,number|null>
  selectedAction:MdpAction|'UNRESOLVED'
  selectedExpectedReward:number
  value:number
  rewardAdvantage:number
  isTie:boolean
  transitions:InspectionTransition[]
  terminalReason:string|null
  explanation:string
  statesEvaluated:number
}
export interface PlanningOptions {model:SensorModel;remainingInspections:number;wrongSortReward?:number}

/** Finite belief-state MDP (a small POMDP expressed as a fully observed belief MDP).
 * State: (P(Plastic), P(Paper), remaining sensor reads). Hidden material is fixed.
 * SORT terminates with its expected reward. INSPECT receives the given immediate
 * inspection reward, samples O with P(O|belief), and transitions to Bayes(belief,O).
 * V_0(b)=max(0, R_SORT(b)); 0 is a safe unresolved terminal outcome.
 * V_h(b)=max(R_SORT(b), R_INSPECT(b)+sum_O P(O|b)V_(h-1)(Bayes(b,O))).
 * The inspection cap guarantees termination. No future seeded/scripted reading
 * or object ground truth is consulted by the planner.
 */
export function solveSortingMDP(belief:Readonly<Probabilities>,options:PlanningOptions):FiniteHorizonResult {
  const {model,remainingInspections,wrongSortReward=-8}=options
  validateSensorModel(model)
  if(!Number.isInteger(remainingInspections)||remainingInspections<0||remainingInspections>10)throw new RangeError('Remaining inspections must be an integer from 0 to 10.')
  const memo=new Map<string,FiniteHorizonResult>()
  function solve(b:Readonly<Probabilities>,h:number):FiniteHorizonResult {
    const key=`${b.PLASTIC.toPrecision(15)}:${b.PAPER.toPrecision(15)}:${h}`
    const cached=memo.get(key)
    if(cached)return cached
    const immediate=evaluateSortingDecision(b,wrongSortReward)
    const transitions:InspectionTransition[]=[]
    if(h>0)for(const observation of BAYES_MATERIALS) {
      const likelihood=getSensorLikelihoods(observation,model)
      const probability=likelihood.PLASTIC*b.PLASTIC+likelihood.PAPER*b.PAPER
      if(probability===0)continue // Impossible readings have zero weight, not an invalid Bayes call.
      const posterior=inferMaterial(observation,b,model).posteriors
      const nextValue=solve(posterior,h-1).value
      transitions.push({observation,probability,posterior,remainingInspections:h-1,nextValue,weightedValue:probability*nextValue})
    }
    const continuationValue=transitions.reduce((sum,t)=>sum+t.weightedValue,0)
    const sort=immediate.expectedRewards.SORT
    const inspect=h>0?immediate.expectedRewards['INSPECT AGAIN']+continuationValue:null
    const alternative=inspect??0
    const isTie=Math.abs(sort-alternative)<=1e-12
    const selectedAction=sort>alternative+1e-12?'SORT':h>0?'INSPECT AGAIN':'UNRESOLVED'
    const value=selectedAction==='SORT'?sort:selectedAction==='INSPECT AGAIN'?inspect!:0
    const evaluations=immediate.evaluations.map(e=>({...e,available:e.action==='SORT'||h>0,continuationValue:e.action==='INSPECT AGAIN'?continuationValue:0,actionValue:e.action==='SORT'?sort:inspect}))
    const terminalReason=h===0?'No sensor reads remain. Inspection is unavailable; unresolved terminal value is 0.':null
    const explanation=`State: ${immediate.proposedMaterial} confidence ${(immediate.probabilities.correct*100).toFixed(2)}%, ${h} additional inspection(s). `+
      `SORT immediate/terminal value ${sort.toFixed(2)}. `+(inspect===null?'INSPECT AGAIN unavailable; safe stop value 0. ':`INSPECT AGAIN immediate ${immediate.expectedRewards['INSPECT AGAIN'].toFixed(2)} + expected future ${continuationValue.toFixed(2)} = ${inspect.toFixed(2)}. `)+
      `Choose ${selectedAction}${isTie?' (inspection/safe-stop tie-break)':''}.`
    const result:FiniteHorizonResult={kind:'finite-horizon',horizon:h,proposedMaterial:immediate.proposedMaterial,probabilities:immediate.probabilities,evaluations,expectedRewards:immediate.expectedRewards,actionValues:{SORT:sort,'INSPECT AGAIN':inspect},selectedAction,selectedExpectedReward:selectedAction==='UNRESOLVED'?0:immediate.expectedRewards[selectedAction],value,rewardAdvantage:Math.abs(sort-alternative),isTie,transitions,terminalReason,explanation,statesEvaluated:0}
    memo.set(key,result)
    return result
  }
  // Validate before making a memo key, including malformed inputs from JavaScript.
  evaluateSortingDecision(belief,wrongSortReward)
  const result=solve(belief,remainingInspections)
  return {...result,statesEvaluated:memo.size}
}
