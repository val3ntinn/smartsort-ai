export interface TimeoutScheduler {
  set(callback: () => void, delay: number): unknown
  clear(handle: unknown): void
}
/** One pending tick. Generation checks also reject callbacks already queued
 * before a reset/cancel, even if the host cannot remove them from its queue.
 */
export function createPlaybackClock(scheduler: TimeoutScheduler = {
  set:(callback,delay) => globalThis.setTimeout(callback,delay),
  clear:handle => globalThis.clearTimeout(handle as ReturnType<typeof setTimeout>),
}) {
  let generation = 0
  let handle: unknown = null
  function cancel() {
    generation++
    if (handle !== null) scheduler.clear(handle)
    handle = null
  }
  function arm(callback: () => void, delay: number) {
    cancel()
    const ticket = generation
    handle = scheduler.set(() => {
      if (ticket !== generation) return
      handle = null
      generation++
      callback()
    }, delay)
  }
  return {arm,cancel}
}
