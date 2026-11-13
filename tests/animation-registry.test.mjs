import test from 'node:test'
import assert from 'node:assert/strict'
import { createAnimationRegistry } from '../src/motion/registry.ts'
const control=()=>{const calls=[];return {calls,pause(){calls.push('pause')},play(){calls.push('play')},stop(){calls.push('stop')}}}

test('Pause freezes registered interpolation and Resume continues it exactly once',()=>{
  const registry=createAnimationRegistry(),animation=control()
  registry.register(animation)
  registry.setPaused(true);registry.setPaused(true)
  registry.setPaused(false);registry.setPaused(false)
  assert.deepEqual(animation.calls,['pause','play'])
})
test('new interpolation starts paused; completed/unregistered tweens never replay on resume',()=>{
  const registry=createAnimationRegistry(true),animation=control()
  const unregister=registry.register(animation)
  assert.deepEqual(animation.calls,['pause'])
  unregister();registry.setPaused(false)
  assert.deepEqual(animation.calls,['pause'])
})
test('unmount/reset cleanup stops all live interpolation and supports Strict Mode registration again',()=>{
  const registry=createAnimationRegistry(),first=control(),second=control()
  registry.register(first);registry.clear();registry.clear()
  registry.register(second);registry.setPaused(true);registry.setPaused(false);registry.clear()
  assert.deepEqual(first.calls,['stop'])
  assert.deepEqual(second.calls,['pause','play','stop'])
})
