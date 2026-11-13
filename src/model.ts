export type LogEntry = { id: number; time: string; message: string }
export const bins = [
  { cell: 3, material: 'plastic', label: 'Plastic' },
  { cell: 7, material: 'paper', label: 'Paper' },
] as const
export const robotCell = 12
export const coordinates = (cell: number) => `${Math.floor(cell / 4)}, ${cell % 4}`
