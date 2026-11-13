export interface BfsInput {
  rows: number
  columns: number
  start: number
  target: number
  obstacles: readonly number[]
}
export interface BfsResult {
  /** Cell IDs in start-to-target order, including both endpoints. */
  path: number[]
  /** Number of moves; null when unreachable. */
  pathLength: number | null
  /** Cells in queue-dequeue (exploration) order, including the target if found. */
  visitedCells: number[]
  pathFound: boolean
}

/** Unweighted four-neighbor BFS. Cell IDs are row * columns + column.
 * Neighbors are considered up, right, down, left for deterministic playback.
 */
export function bfs({ rows, columns, start, target, obstacles }: BfsInput): BfsResult {
  if (!Number.isSafeInteger(rows) || !Number.isSafeInteger(columns) || rows < 1 || columns < 1 || !Number.isSafeInteger(rows * columns)) {
    throw new RangeError('Grid dimensions must be positive safe integers.')
  }
  const validCell = (cell: number) => Number.isInteger(cell) && cell >= 0 && cell < rows * columns
  if (!validCell(start) || !validCell(target)) throw new RangeError('Start and target must be inside the grid.')
  if (!Array.isArray(obstacles) || obstacles.some(cell => !validCell(cell))) throw new RangeError('Obstacles must contain valid cell IDs.')
  const blocked = new Set(obstacles)
  if (blocked.has(start) || blocked.has(target)) throw new RangeError('Start and target cannot be obstacles.')
  const queue: number[] = [start]
  const discovered = new Set<number>([start])
  const parents = new Map<number, number>()
  const visitedCells: number[] = []
  let head = 0
  while (head < queue.length) {
    const current = queue[head++]
    visitedCells.push(current)
    if (current === target) {
      const path = [target]
      while (path[path.length - 1] !== start) path.push(parents.get(path[path.length - 1])!)
      path.reverse()
      return { path, pathLength: path.length - 1, visitedCells, pathFound: true }
    }
    const row = Math.floor(current / columns)
    const column = current % columns
    for (const [dr, dc] of [[-1, 0], [0, 1], [1, 0], [0, -1]]) {
      const nextRow = row + dr
      const nextColumn = column + dc
      if (nextRow < 0 || nextRow >= rows || nextColumn < 0 || nextColumn >= columns) continue
      const next = nextRow * columns + nextColumn
      if (blocked.has(next) || discovered.has(next)) continue
      discovered.add(next)
      parents.set(next, current)
      queue.push(next)
    }
  }
  return { path: [], pathLength: null, visitedCells, pathFound: false }
}
