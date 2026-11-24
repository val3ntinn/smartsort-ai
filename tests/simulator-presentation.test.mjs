import test from 'node:test'
import assert from 'node:assert/strict'
import { inspectorForStage,isTraversedCell,isTraversedEdge } from '../src/simulator/presentation.ts'
test('inspector follows only real stage boundaries, with reinspection returning to observation',()=>{
 for(const stage of [null,'object','sensor','bayes','reinspect'])assert.equal(inspectorForStage(stage),'observe')
 assert.equal(inspectorForStage('mdp'),'reason')
 for(const stage of ['bfs','path','robot','result'])assert.equal(inspectorForStage(stage),'act')
})
test('planned cells become travelled only when the actual robot index has reached them',()=>{
 const path=[12,8,4,0,1,2,3]
 for(const phase of ['idle','sensor','bayes','decision','planning','exploring','tracing'])assert.equal(isTraversedCell({phase,robotIndex:3},path,0),false)
 assert.equal(isTraversedCell({phase:'moving',robotIndex:2},path,4),true)
 assert.equal(isTraversedCell({phase:'moving',robotIndex:2},path,0),false)
 assert.equal(isTraversedCell({phase:'moving',robotIndex:2},path,15),false)
 assert.equal(isTraversedCell({phase:'sorted',robotIndex:6},path,3),true)
 assert.equal(isTraversedCell({phase:'unreachable',robotIndex:0},[],12),false)
})

test('completed links never extend ahead of the current robot cell',()=>{
 const path=[12,8,4,0]
 assert.equal(isTraversedEdge({phase:'moving',robotIndex:1},path,12),true)
 assert.equal(isTraversedEdge({phase:'moving',robotIndex:1},path,8),false)
 assert.equal(isTraversedEdge({phase:'moving',robotIndex:1},path,4),false)
 assert.equal(isTraversedEdge({phase:'sorted',robotIndex:3},path,4),true)
 assert.equal(isTraversedEdge({phase:'sorted',robotIndex:3},path,0),false)
})
