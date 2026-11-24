import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {createRequire} from 'node:module'
import ts from 'typescript'
import {createElement} from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
const source=fs.readFileSync(new URL('../src/design-system/components.tsx',import.meta.url),'utf8')
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText
const module={exports:{}};new Function('require','module','exports',compiled)(createRequire(import.meta.url),module,module.exports)
const {Button,IconButton,StatusBadge,Tabs,Notice}=module.exports
const html=(component,props,...children)=>renderToStaticMarkup(createElement(component,props,...children))
test('shared buttons prevent implicit form submission and loading actions are natively disabled',()=>{
 assert.match(html(Button,{},'Run'),/type="button"/)
 const loading=html(Button,{busy:true},'Sorting')
 assert.match(loading,/aria-busy="true"/);assert.match(loading,/disabled=""/);assert.match(loading,/>Sorting<|Sorting<\/button>/)
 assert.match(html(Button,{type:'submit'},'Save'),/type="submit"/)
 assert.match(html(IconButton,{label:'Reset simulation'},'icon'),/aria-label="Reset simulation"/)
})
test('status and notices preserve text semantics without making every badge a live region',()=>{
 assert.doesNotMatch(html(StatusBadge,{tone:'warning'},'Unresolved'),/role="status"/)
 assert.match(html(Notice,{tone:'error'},'Invalid seed'),/role="alert"/)
 assert.match(html(Notice,{},'Saved'),/role="status"/)
})
test('tabs associate unique controls and panels, preserve disabled controls, and hide inactive panels',()=>{
 const output=html(Tabs,{label:'Evidence',items:[{id:'a',label:'Summary',content:'A'},{id:'b',label:'Math',content:'B',disabled:true}],value:'a',onChange(){}})
 const tabs=[...output.matchAll(/role="tab" id="([^"]+)" aria-controls="([^"]+)"/g)]
 assert.equal(tabs.length,2);assert.notEqual(tabs[0][1],tabs[1][1])
 for(const [,id,panel] of tabs){assert.ok(output.includes(`id="${panel}" aria-labelledby="${id}"`))}
 assert.match(output,/aria-selected="true" tabindex="0"/);assert.match(output,/aria-selected="false" tabindex="-1" disabled=""/)
 assert.match(output,/hidden=""/)
})
const tokens=Object.fromEntries([...fs.readFileSync(new URL('../src/design-system/tokens.css',import.meta.url),'utf8').matchAll(/(--[\w-]+):\s*(#[\da-f]{6})\s*;/gi)].map(m=>[m[1],m[2]]))
const luminance=hex=>{const rgb=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722}
const ratio=(a,b)=>{const [low,high]=[luminance(tokens[a]),luminance(tokens[b])].sort((x,y)=>x-y);return (high+.05)/(low+.05)}
test('semantic text, primary controls, statuses, focus and chart colors meet their contrast targets',()=>{
 for(const text of ['--text-primary','--text-secondary','--text-muted'])assert.ok(ratio(text,'--surface')>=4.5,text)
 assert.ok(ratio('--text-inverse','--interactive')>=4.5)
 for(const tone of ['success','warning','error','info'])assert.ok(ratio(`--status-${tone}`,`--status-${tone}-surface`)>=4.5,tone)
 for(const [a,b] of [['--focus-ring','--surface'],['--border-control','--surface'],['--grid-border','--grid-empty'],['--chart-prior','--chart-track'],['--chart-posterior','--chart-track']])assert.ok(ratio(a,b)>=3,`${a} / ${b}`)
})
