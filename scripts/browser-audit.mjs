import {spawn} from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
const qaRoot=path.resolve('.qa')
fs.mkdirSync(qaRoot,{recursive:true})
const profile=fs.mkdtempSync(path.join(qaRoot,'chrome-audit-'))
const candidates=[process.env.CHROME_PATH,'C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','/usr/bin/google-chrome','/usr/bin/chromium','/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].filter(Boolean)
const executable=candidates.find(candidate=>fs.existsSync(candidate))
if(!executable)throw Error('Chrome/Chromium not found. Set CHROME_PATH to its executable.')
const chrome=spawn(executable,['--headless=new','--disable-gpu','--disable-background-timer-throttling','--remote-debugging-port=0',`--user-data-dir=${profile}`,'--no-first-run','--no-default-browser-check','about:blank'],{stdio:'ignore',windowsHide:true})
let base
const sleep=ms=>new Promise(r=>setTimeout(r,ms))
async function until(fn,timeout=30000){const start=Date.now();while(Date.now()-start<timeout){try{const v=await fn();if(v)return v}catch{}await sleep(70)}throw Error('Timed out waiting for browser condition')}
let socket,client
const errors=[],advisories=[]
try {
 await until(async()=>{const port=fs.readFileSync(path.join(profile,'DevToolsActivePort'),'utf8').split('\n')[0];base='http://127.0.0.1:'+port;return (await fetch(base+'/json/version')).ok})
 const target=await (await fetch(`${base}/json/new?about:blank`,{method:'PUT'})).json()
 socket=new WebSocket(target.webSocketDebuggerUrl)
 await new Promise((r,j)=>{socket.onopen=r;socket.onerror=j})
 let sequence=0;const pending=new Map()
 socket.onmessage=event=>{const message=JSON.parse(event.data);if(message.id){const p=pending.get(message.id);pending.delete(message.id);message.error?p?.reject(Error(JSON.stringify(message.error))):p?.resolve(message.result)}else if(message.method==='Runtime.consoleAPICalled'&&['error','warning'].includes(message.params.type)){const text=message.params.args.map(arg=>arg.value??arg.description??'').join(' ');if(message.params.type==='warning'&&text.startsWith('You have Reduced Motion enabled on your device.'))advisories.push(text);else errors.push(message.params.type+': '+text)}else if(message.method==='Log.entryAdded'&&['error','warning'].includes(message.params.entry.level)){errors.push(message.params.entry.text+' '+(message.params.entry.url??''))}else if(message.method==='Runtime.exceptionThrown'){errors.push(message.params.exceptionDetails.exception?.description??message.params.exceptionDetails.text)}}
 client=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}))})
 await client('Runtime.enable');await client('Page.enable');await client('Log.enable');await client('Page.bringToFront')
 const evaluate=async expression=>{const r=await client('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.text);return r.result.value}
 const click=async(text,selector='button')=>{const ok=await evaluate(`(()=>{const el=[...document.querySelectorAll(${JSON.stringify(selector)})].find(e=>e.textContent.trim()===${JSON.stringify(text)});if(!el||el.disabled)return false;el.click();return true})()`);if(!ok)throw Error(`Button unavailable: ${text}`)}
 const setInput=async(selector,value)=>{await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)throw Error('input missing');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(String(value))});e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}))})()`);await sleep(150)}
 const nav=async page=>{if(await evaluate("innerWidth<=720&&!document.querySelector('.sidebar.mobile-open')"))await evaluate("document.querySelector('.mobile-toggle').click()");await click(page,'.nav-item');await until(()=>evaluate(`document.querySelector('.breadcrumbs')?.textContent.includes(${JSON.stringify(page)})`));await sleep(100);await until(()=>evaluate("document.querySelector('main [data-view]')?.dataset.view==="+JSON.stringify(page)+"&&Number(getComputedStyle(document.querySelector('main [data-view]')).opacity)>.999"));await evaluate('window.scrollTo(0,0)')}
 const reload=async()=>{const token=String(Date.now());await evaluate('window.__auditReloadToken='+JSON.stringify(token));await client('Page.reload');await until(()=>evaluate('window.__auditReloadToken!=='+JSON.stringify(token)+'&&document.readyState==="complete"&&!!document.querySelector(".live-sensor-monitor")'))}
 await client('Page.navigate',{url:process.env.SMARTSORT_AUDIT_URL??'http://127.0.0.1:5173/'})
 await until(()=>evaluate(`!!document.querySelector('.live-sensor-monitor')`)).catch(async error=>{console.log('Page diagnostics:',await evaluate('document.body.innerText'));console.log('Runtime errors:',errors);throw error})
 const press=async(key,code,modifiers=0)=>{await client('Input.dispatchKeyEvent',{type:'keyDown',key,code,modifiers});await client('Input.dispatchKeyEvent',{type:'keyUp',key,code,modifiers})}
 await client('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false})
 const shellWidth=()=>evaluate("({sidebar:document.querySelector('.sidebar').getBoundingClientRect().width,main:document.querySelector('.main-shell').getBoundingClientRect().left,grid:document.querySelector('.robot-grid').getBoundingClientRect().width})")
 await until(async()=>(await shellWidth()).sidebar>209)
 const expandedShell=await shellWidth()
 await evaluate("document.querySelector('.sidebar-toggle').click()")
 await until(async()=>Math.abs((await shellWidth()).sidebar-68)<1)
 const railShell=await shellWidth()
 if(Math.abs(railShell.main-68)>1||railShell.main>=expandedShell.main||railShell.grid<expandedShell.grid)throw Error('Collapsed sidebar did not resize the workspace/grid: '+JSON.stringify({expandedShell,railShell}))
 const railShot=await client('Page.captureScreenshot',{format:'png'});fs.writeFileSync('.qa/qol-sidebar-rail.png',Buffer.from(railShot.data,'base64'))
 await evaluate("document.querySelector('.nav-item[aria-label=Algorithms]').focus()")
 await until(()=>evaluate("[...document.querySelectorAll('[role=tooltip]')].some(e=>e.textContent==='Algorithms')")).catch(async error=>{console.log('Tooltip diagnostics',await evaluate("({active:document.activeElement.outerHTML,sidebar:document.querySelector('.sidebar').className,inert:document.querySelector('.sidebar').inert,tooltips:[...document.querySelectorAll('[role=tooltip]')].map(e=>e.textContent)})"),errors);throw error})
 await nav('Algorithms');await nav('Simulator')
 await press('b','KeyB',2)
 await until(async()=>(await shellWidth()).sidebar>209)
 await press('b','KeyB',4)
 await until(async()=>Math.abs((await shellWidth()).sidebar-68)<1)
 await evaluate("document.querySelector('.step-mode-toggle input').click();const select=document.querySelector('.transport-speed select');select.value='400';select.dispatchEvent(new Event('change',{bubbles:true}))")
 await reload()
 if(!await evaluate("document.querySelector('.sidebar').classList.contains('is-collapsed')&&document.querySelector('.step-mode-toggle input').checked&&document.querySelector('.transport-speed select').value==='400'"))throw Error('Interface preferences did not survive reload')
 await evaluate("document.activeElement?.blur()")
 await press(' ','Space');await until(()=>evaluate("document.querySelector('.operation-state').textContent==='PAUSED'"))
 await press('n','KeyN');await until(()=>evaluate("document.querySelector('.operation-state').textContent==='PAUSED'&&document.querySelector('.current-operation h3').textContent==='Sensor'"))
 await press('r','KeyR')
 if(!await evaluate("document.querySelector('.operation-state').textContent==='IDLE'&&document.querySelector('.step-mode-toggle input').checked&&document.querySelector('.transport-speed select').value==='400'"))throw Error('Keyboard Reset lost interface preferences')
 await evaluate("document.querySelector('.agent-sensor-settings').open=true")
 for(const selector of ['input[type=number]','.transport-speed select','.step-mode-toggle input']){
  await evaluate(`document.querySelector(${JSON.stringify(selector)}).focus()`)
  await press('r','KeyR');await press('n','KeyN');await press('b','KeyB',2)
  if(!await evaluate("document.querySelector('.operation-state').textContent==='IDLE'&&document.querySelector('.sidebar').classList.contains('is-collapsed')"))throw Error('Shortcut intercepted a form control')
 }
 for(const tag of ['textarea','div']) {
  await evaluate(`(()=>{const el=document.createElement(${JSON.stringify(tag)});el.id='qa-editor';if(el.tagName==='DIV')el.contentEditable='true';document.body.append(el);el.focus()})()`)
  await press(' ','Space');await press('r','KeyR');await press('n','KeyN');await press('b','KeyB',2)
  if(!await evaluate("document.querySelector('.operation-state').textContent==='IDLE'&&document.querySelector('.sidebar').classList.contains('is-collapsed')"))throw Error('Shortcut intercepted an editable element')
  await evaluate("document.querySelector('#qa-editor').remove()")
 }
 await evaluate("document.activeElement.blur();document.querySelector('.agent-sensor-settings').open=false;document.querySelector('.step-mode-toggle input').click();const select=document.querySelector('.transport-speed select');select.value='180';select.dispatchEvent(new Event('change',{bubbles:true}));document.querySelector('.sidebar-toggle').click()")
 await click('Keyboard shortcuts');await until(()=>evaluate("!!document.querySelector('.shortcuts-panel')"));await press('Escape','Escape');await until(()=>evaluate("!document.querySelector('.shortcuts-panel')"))
 await evaluate('document.activeElement.blur()');await press(' ','Space');await until(()=>evaluate("document.querySelector('.operation-state').textContent==='PLAYING'"));await press(' ','Space');await until(()=>evaluate("document.querySelector('.operation-state').textContent==='PAUSED'"));await press(' ','Space');await until(()=>evaluate("document.querySelector('.operation-state').textContent==='PLAYING'"));await press('r','KeyR')
 for(const width of [1440,1024,768,390,320]) {
  await client('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false})
  for(const page of ['Overview','Simulator','Experiment Lab','Algorithms','History','About']) {
   await nav(page)
   const overflow=await evaluate(`document.documentElement.scrollWidth>innerWidth+1`)
   if(overflow)throw Error(`${page} overflows at ${width}px: `+JSON.stringify(await evaluate(`[...document.querySelectorAll('main *')].filter(e=>e.getBoundingClientRect().right>innerWidth+2).slice(0,8).map(e=>({tag:e.tagName,class:e.className,right:e.getBoundingClientRect().right}))`)))
   if((width===1440&&page==='Simulator')||(width===390&&page==='Simulator')||(width===1440&&page==='Experiment Lab')){const shot=await client('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});fs.writeFileSync(`.qa/audit-${page.replaceAll(' ','-')}-${width}.png`,Buffer.from(shot.data,'base64'))}
  }
 }
 console.log('Responsive overflow checks: 30 view/viewport combinations passed (including 1440/1024/768/390).')
 await evaluate("document.querySelector('.mobile-toggle').click()")
 await until(()=>evaluate("document.activeElement===document.querySelector('.mobile-close')")).catch(async error=>{console.log('Drawer focus diagnostics',await evaluate("({active:document.activeElement.outerHTML,sidebar:document.querySelector('.sidebar').outerHTML.slice(0,1500),closeVisible:getComputedStyle(document.querySelector('.mobile-close')).visibility,hasFocus:document.hasFocus()})"));throw error})
 await press('Tab','Tab',8)
 if(!await evaluate("document.querySelector('.sidebar').contains(document.activeElement)"))throw Error('Mobile drawer focus escaped')
 await press('Escape','Escape');await until(()=>evaluate("!document.querySelector('.sidebar.mobile-open')&&document.activeElement===document.querySelector('.mobile-toggle')"))
 await nav('Simulator')
 if(await evaluate("!!document.querySelector('.sidebar.mobile-open')"))throw Error('Mobile navigation did not close the drawer')
 console.log('Interface checks passed: expanded/rail navigation and layout, keyboard tooltip, Ctrl/Cmd+B, Space/R/N, protected form controls, saved preferences, shortcut help, mobile drawer focus/Escape/navigation.')
 await client('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false})

 await nav('Simulator')
 // Focus trap and restoration for the existing guide.
 await evaluate("document.querySelector('.sidebar-utility[aria-label=\"Workspace guide\"]').focus();document.querySelector('.sidebar-utility[aria-label=\"Workspace guide\"]').click()")
 await until(()=>evaluate("!!document.querySelector('[role=dialog]')"))
 await client('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',modifiers:8});await client('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',modifiers:8})
 if(!await evaluate("document.querySelector('[role=dialog]').contains(document.activeElement)"))throw Error('Dialog focus escaped')
 await client('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape'});await client('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape'})
 await until(()=>evaluate("!document.querySelector('[role=dialog]')"))
 if(!await evaluate("document.activeElement===document.querySelector('.sidebar-utility[aria-label=\"Workspace guide\"]')"))throw Error('Guide focus was not restored')

 // Exercise actual setup controls before the live run (these partial runs must not be saved).
 await evaluate("document.querySelectorAll('.agent-object-options button')[1].click()")
 if(!await evaluate("document.querySelectorAll('.agent-object-options button')[1].getAttribute('aria-pressed')==='true'"))throw Error('Object selection failed')
 await click('Obstacles')
 await evaluate("document.querySelectorAll('.grid-cell')[1].click()")
 if(!await evaluate("document.querySelectorAll('.grid-cell')[1].classList.contains('obstacle-cell')"))throw Error('Obstacle placement failed')
 if(!await evaluate("document.querySelectorAll('.grid-cell')[3].disabled"))throw Error('Bin placement is not protected')
 await evaluate("document.querySelectorAll('.grid-cell')[1].click()")
 await click('Robot start');await evaluate("document.querySelectorAll('.grid-cell')[13].click()")
 if(!await evaluate("document.querySelectorAll('.grid-cell')[13].classList.contains('robot-cell')"))throw Error('Start placement failed')
 await click('Reset simulation','.reset-button')
 await evaluate("if(document.querySelector('.step-mode-toggle input').checked)document.querySelector('.step-mode-toggle input').click()")
 await evaluate("document.querySelector('.agent-sensor-settings').open=true")
 await setInput('.agent-settings-fields input[type=number]',-1);await click('Start Simulation')
 await until(()=>evaluate("!!document.querySelector('.sensor-error')"))
 await click('Reset simulation','.reset-button')
 // Keyboard activation of manual mode and real major-stage stepping.
 await evaluate("document.querySelector('.step-mode-toggle input').focus()")
 await client('Input.dispatchKeyEvent',{type:'keyDown',key:' ',code:'Space',windowsVirtualKeyCode:32});await client('Input.dispatchKeyEvent',{type:'keyUp',key:' ',code:'Space',windowsVirtualKeyCode:32})
 if(!await evaluate("document.querySelector('.step-mode-toggle input').checked"))throw Error('Mode checkbox is not keyboard accessible')
 await click('Start Simulation');await until(()=>evaluate("document.querySelector('.operation-state').textContent==='PAUSED'"))
 for(const stage of ['Sensor','Bayes','MDP']){await click('Next Step');await until(()=>evaluate("document.querySelector('.operation-state').textContent==='PAUSED'&&document.querySelector('.current-operation h3').textContent==="+JSON.stringify(stage)))}
 if(!await evaluate("document.querySelector('.decision-recommendation').textContent.includes('INSPECT AGAIN')"))throw Error('Manual MDP stage did not expose sequential decision')
 await evaluate("document.querySelector('.decision-breakdown').open=true")
 const firstRect=await evaluate("(()=>{const r=document.querySelector('.decision-panel').getBoundingClientRect();return {x:r.left+scrollX,y:r.top+scrollY,width:r.width,height:r.height}})()")
 const firstShot=await client('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:{...firstRect,scale:1}});fs.writeFileSync('.qa/audit-bellman-transitions.png',Buffer.from(firstShot.data,'base64'))
 await click('Reset simulation','.reset-button')
 await evaluate("if(document.querySelector('.step-mode-toggle input').checked)document.querySelector('.step-mode-toggle input').click()")
 await evaluate("const e=document.querySelector('.transport-speed select');e.value='90';e.dispatchEvent(new Event('change',{bubbles:true}))")
 await evaluate("window.qaMoves=[12];window.qaObserver=new MutationObserver(()=>{const cell=[...document.querySelectorAll('.grid-cell')].findIndex(e=>e.classList.contains('robot-cell'));if(cell>=0&&window.qaMoves.at(-1)!==cell)window.qaMoves.push(cell)});window.qaObserver.observe(document.querySelector('.robot-grid'),{subtree:true,attributes:true,attributeFilter:['class']})")
 await click('Start Simulation')
 await until(()=>evaluate("window.qaMoves.length>=2"))
 await sleep(20);await click('Pause');await sleep(30)
 const before=await evaluate("({log:document.querySelector('.agent-log-heading').textContent,x:document.querySelector('.robot-position-marker').getBoundingClientRect().x,y:document.querySelector('.robot-position-marker').getBoundingClientRect().y})")
 await sleep(650)
 const after=await evaluate("({log:document.querySelector('.agent-log-heading').textContent,x:document.querySelector('.robot-position-marker').getBoundingClientRect().x,y:document.querySelector('.robot-position-marker').getBoundingClientRect().y})")
 if(before.log!==after.log||Math.abs(before.x-after.x)>.3||Math.abs(before.y-after.y)>.3)throw Error('Pause did not freeze actual robot interpolation and controller state')
 await click('Resume');await until(()=>evaluate("document.querySelector('.operation-state')?.textContent==='COMPLETED'"))
 let records=await evaluate(`JSON.parse(localStorage.getItem('smartsort.history.v1')||'[]')`)
 if(records.length!==1)throw Error('Live history count '+records.length+'; page: '+await evaluate('document.body.innerText'));const moves=await evaluate('window.qaMoves');if(JSON.stringify(moves)!==JSON.stringify(records[0].bfs.path))throw Error('Robot departed from actual BFS path');await evaluate('window.qaObserver.disconnect()')
 const original=records[0];if(original.decision.kind!=='finite-horizon')throw Error('Live policy is not sequential');await evaluate("document.querySelector('.decision-breakdown').open=true");const rect=await evaluate("(()=>{const r=document.querySelector('.decision-panel').getBoundingClientRect();return {x:r.left+scrollX,y:r.top+scrollY,width:r.width,height:r.height}})()");const shot=await client('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:{...rect,scale:1}});fs.writeFileSync('.qa/audit-bellman.png',Buffer.from(shot.data,'base64'))
 await nav('Experiment Lab');await setInput('.experiment-settings-body input[type=range]',50);await setInput('.experiment-settings-body label:nth-of-type(2) input[type=range]',40)
 await until(()=>evaluate(`document.querySelector('.experiment-comparison tbody tr:last-child td:last-child')?.textContent==='unresolved'`))
 await click('Reset to Defaults')
 await until(()=>evaluate(`document.querySelector('.experiment-settings-body input[type=range]')?.value==='85'`))
 await nav('History');await click('Replay');await sleep(180);await click('Reset simulation','.reset-button')
 await sleep(750)
 if(await evaluate(`document.querySelector('.operation-state').textContent`)!=='IDLE')throw Error('Replay reset did not cancel scheduled work')
 await nav('History');await click('Replay');await until(()=>evaluate(`document.querySelector('.operation-state')?.textContent==='COMPLETED'`))
 records=await evaluate(`JSON.parse(localStorage.getItem('smartsort.history.v1')||'[]')`)
 if(records.length!==1||JSON.stringify(records[0])!==JSON.stringify(original))throw Error('Replay changed history or added a duplicate')

 // Reload tests persistence; a legal-looking forged movement frame must be discarded.
 const bad=JSON.parse(JSON.stringify(original));bad.id='forged';bad.frames.find(f=>f.robotIndex>0).robotCell=15
 await evaluate('localStorage.setItem("smartsort.history.v1",'+JSON.stringify(JSON.stringify([original,bad]))+')')
 await reload();await nav('History')
 if(await evaluate("document.querySelectorAll('.history-row').length")!==1)throw Error('Forged replay was not rejected on reload')
 if(!await evaluate("!!document.querySelector('.history-warning')"))throw Error('Corrupt record did not produce a notice')

 await client('Emulation.setDeviceMetricsOverride',{width:390,height:900,deviceScaleFactor:1,mobile:false})
 await nav('History');await evaluate("document.querySelector('.history-row-select').click()")
 if(await evaluate('document.documentElement.scrollWidth>innerWidth+1'))throw Error('Populated mobile history overflows')
 const historyShot=await client('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});fs.writeFileSync('.qa/audit-history-390.png',Buffer.from(historyShot.data,'base64'))
 await click('Clear History')
 if(await evaluate(`localStorage.getItem('smartsort.history.v1')`)!==null)throw Error('Clear History did not persist')
 console.log('Browser interactions passed: Start/Pause/Resume, Lab parameter recalculation/defaults, persistence, replay/reset, replay completion, and Clear History.')
 if(errors.length)throw Error('Browser runtime errors: '+errors.join('\n'))

 await client('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]})
 await reload()
 await nav('Simulator');await click('Start Simulation');await sleep(50)
 if(await evaluate("getComputedStyle(document.querySelector('.sensor-activity-wave')).animationName")!=='none')throw Error('Reduced-motion waveform still animates')
 await click('Reset simulation','.reset-button');await sleep(700)
 if(await evaluate("document.querySelector('.operation-state').textContent")!=='IDLE')throw Error('Reduced-motion reset leaked a timer')
 console.log('Additional checks passed: keyboard guide focus, physical pause, actual BFS route, saved-record reload/corruption rejection, reduced motion and reset.')
 if(errors.length)throw Error('Browser runtime errors: '+errors.join('\n'))
 if(advisories.length)console.log('Expected development advisory: Motion confirms reduced-motion mode.');console.log('No browser runtime exceptions or unexpected console warnings.')
} finally {
 if(client)try{await client('Browser.close')}catch{}
 socket?.close();chrome.kill()
}


