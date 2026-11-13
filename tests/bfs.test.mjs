import test from 'node:test'
import assert from 'node:assert/strict'
import { bfs } from '../src/algorithms/bfs.ts'

const grid = (overrides = {}) => ({ rows:4, columns:4, start:12, target:3, obstacles:[], ...overrides })
function validResult(input, result) {
  assert.equal(new Set(result.visitedCells).size, result.visitedCells.length, 'each cell explored once')
  assert.equal(result.visitedCells[0], input.start)
  for (const cell of [...result.visitedCells, ...result.path]) {
    assert.ok(cell >= 0 && cell < input.rows * input.columns)
    assert.ok(!input.obstacles.includes(cell))
  }
  if (result.pathFound) {
    assert.equal(result.path[0], input.start)
    assert.equal(result.path.at(-1), input.target)
    assert.equal(result.pathLength, result.path.length - 1)
    assert.equal(result.visitedCells.at(-1), input.target)
    result.path.slice(1).forEach((cell, index) => {
      const previous = result.path[index]
      const distance = Math.abs(Math.floor(cell / input.columns) - Math.floor(previous / input.columns)) + Math.abs(cell % input.columns - previous % input.columns)
      assert.equal(distance, 1, 'each move is cardinal and does not wrap rows')
      assert.ok(result.visitedCells.includes(cell))
    })
  } else {
    assert.deepEqual(result.path, [])
    assert.equal(result.pathLength, null)
    assert.ok(!result.visitedCells.includes(input.target))
  }
}

test('open 4x4 grid: shortest route and deterministic actual exploration order', () => {
  const input = grid()
  const result = bfs(input)
  assert.equal(result.pathFound, true)
  assert.equal(result.pathLength, 6)
  assert.deepEqual(result.path, [12,8,4,0,1,2,3])
  assert.deepEqual(result.visitedCells, [12,8,13,4,9,14,0,5,10,15,1,6,11,2,7,3])
  validResult(input, result)
})

test('obstacle wall forces a longer shortest detour', () => {
  const input = grid({ start:0, obstacles:[1,5,9] })
  const result = bfs(input)
  assert.equal(result.pathLength, 9)
  validResult(input, result)
})

test('enclosed target: explore reachable region and return no path', () => {
  const input = grid({ obstacles:[2,7] })
  const result = bfs(input)
  assert.equal(result.pathFound, false)
  assert.equal(result.visitedCells.length, 13)
  validResult(input, result)
})

test('enclosed robot: only the start is explored', () => {
  const input = grid({ obstacles:[8,13] })
  const result = bfs(input)
  assert.deepEqual(result.visitedCells, [12])
  assert.equal(result.pathFound, false)
  validResult(input, result)
})

test('same start and target has zero moves, including on a 1x1 grid', () => {
  for (const input of [grid({target:12}), grid({rows:1,columns:1,start:0,target:0})]) {
    const result = bfs(input)
    assert.deepEqual(result.path, [input.start])
    assert.equal(result.pathLength, 0)
    validResult(input, result)
  }
})

test('four directions only: no diagonal shortcuts or row wrapping', () => {
  for (const input of [grid({start:3,target:4}), grid({start:0,target:5}), grid({rows:1,columns:4,start:0,target:3}), grid({rows:4,columns:1,start:0,target:3})]) {
    const result = bfs(input)
    const distance = Math.abs(Math.floor(input.start / input.columns) - Math.floor(input.target / input.columns)) + Math.abs(input.start % input.columns - input.target % input.columns)
    assert.equal(result.pathLength, distance)
    validResult(input, result)
  }
  assert.equal(bfs(grid({ start:0,target:5,obstacles:[1,4] })).pathFound, false)
})

test('invalid dimensions, endpoints, and obstacles are rejected', () => {
  for (const overrides of [{rows:0},{rows:1.5},{columns:-1},{columns:NaN},{rows:Infinity},{start:-1},{start:16},{target:16},{target:0.5},{obstacles:[12]},{obstacles:[3]},{obstacles:[-1]},{obstacles:[16]},{obstacles:[NaN]},{obstacles:null}]) {
    assert.throws(() => bfs(grid(overrides)), RangeError)
  }
})

test('search does not mutate inputs and duplicate obstacles are harmless', () => {
  const obstacles = Object.freeze([1,5,9,9])
  const input = Object.freeze(grid({start:0,obstacles}))
  const first = bfs(input)
  first.path.length = 0
  first.visitedCells.length = 0
  const second = bfs(input)
  assert.equal(second.pathLength, 9)
  assert.deepEqual(obstacles, [1,5,9,9])
  validResult(input, second)
})

test('all 128 obstacle layouts on a 3x3 grid agree with independent distance relaxation', () => {
  const candidates = [1,2,3,4,5,6,7]
  for (let mask = 0; mask < 128; mask++) {
    const input = { rows:3, columns:3, start:0, target:8, obstacles:candidates.filter((_, i) => mask & (1 << i)) }
    const distance = Array(9).fill(Infinity)
    distance[0] = 0
    for (let pass = 0; pass < 9; pass++) {
      for (let a = 0; a < 9; a++) for (let b = 0; b < 9; b++) {
        if (input.obstacles.includes(a) || input.obstacles.includes(b)) continue
        const adjacent = Math.abs(Math.floor(a/3) - Math.floor(b/3)) + Math.abs(a%3 - b%3) === 1
        if (adjacent) distance[b] = Math.min(distance[b], distance[a] + 1)
      }
    }
    const result = bfs(input)
    assert.equal(result.pathFound, Number.isFinite(distance[8]), `layout ${mask}`)
    assert.equal(result.pathLength, Number.isFinite(distance[8]) ? distance[8] : null, `layout ${mask}`)
    validResult(input, result)
  }
})
