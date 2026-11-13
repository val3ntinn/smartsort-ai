import test from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_PREFERENCES,PREFERENCES_KEY,readPreferences,writePreferences } from '../src/interface/preferences.ts'
import { shortcutAction } from '../src/interface/shortcuts.ts'
const key=(key,patch={})=>({key,ctrlKey:false,metaKey:false,altKey:false,shiftKey:false,repeat:false,...patch})
test('interface preferences restore validated fields and keep history isolated',()=>{
 const data=new Map([['smartsort.history.v1','untouched']]);const storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)}
 assert.deepEqual(readPreferences(storage),DEFAULT_PREFERENCES)
 const saved={sidebarCollapsed:true,stepMs:90,mode:'step'};writePreferences(saved,storage)
 assert.deepEqual(readPreferences(storage),saved);assert.equal(data.get('smartsort.history.v1'),'untouched')
 data.set(PREFERENCES_KEY,JSON.stringify({sidebarCollapsed:'false',stepMs:0,mode:'unknown'}));assert.deepEqual(readPreferences(storage),DEFAULT_PREFERENCES)
 data.set(PREFERENCES_KEY,'{broken');assert.deepEqual(readPreferences(storage),DEFAULT_PREFERENCES)
 assert.deepEqual(readPreferences(null),DEFAULT_PREFERENCES)
 const unavailable={getItem(){throw Error('blocked')},setItem(){throw Error('blocked')}}
 assert.deepEqual(readPreferences(unavailable),DEFAULT_PREFERENCES);assert.doesNotThrow(()=>writePreferences(saved,unavailable))
})
test('shortcuts choose valid transport actions without consuming browser chords or repeats',()=>{
 for(const [status,expected] of [['idle','start'],['playing','pause'],['paused','resume'],['completed','start']])assert.equal(shortcutAction(key(' '),{status,mode:'automatic'},true),expected)
 assert.equal(shortcutAction(key('n'),{status:'paused',mode:'step'},true),'nextStep')
 assert.equal(shortcutAction(key('n'),{status:'paused',mode:'automatic'},true),null)
 assert.equal(shortcutAction(key('n'),{status:'playing',mode:'step'},true),null)
 assert.equal(shortcutAction(key('R'),{status:'playing',mode:'step'},true),'reset')
 for(const event of [key('r',{ctrlKey:true}),key('r',{metaKey:true}),key(' ',{repeat:true}),key('r',{altKey:true}),key('b',{ctrlKey:true,shiftKey:true})])assert.equal(shortcutAction(event,{status:'idle',mode:'automatic'},true),null)
 assert.equal(shortcutAction(key(' '),{status:'idle',mode:'automatic'},false),null)
 for(const modifier of ['ctrlKey','metaKey'])assert.equal(shortcutAction(key('b',{[modifier]:true}),{status:'idle',mode:'automatic'},false),'toggleSidebar')
})
