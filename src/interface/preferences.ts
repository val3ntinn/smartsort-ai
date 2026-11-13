export const PREFERENCES_KEY='smartsort.interface.v1'
export interface InterfacePreferences {sidebarCollapsed:boolean|null;stepMs:90|180|400;mode:'automatic'|'step'}
export const DEFAULT_PREFERENCES:InterfacePreferences={sidebarCollapsed:null,stepMs:180,mode:'automatic'}
type PreferenceStorage=Pick<Storage,'getItem'|'setItem'>
function browserStorage():PreferenceStorage|null {try{return typeof window==='undefined'?null:window.localStorage}catch{return null}}
export function readPreferences(storage:PreferenceStorage|null=browserStorage()):InterfacePreferences {
  try {
    const saved=JSON.parse(storage?.getItem(PREFERENCES_KEY)??'null')
    return {sidebarCollapsed:typeof saved?.sidebarCollapsed==='boolean'?saved.sidebarCollapsed:null,stepMs:[90,180,400].includes(saved?.stepMs)?saved.stepMs:180,mode:saved?.mode==='step'?'step':'automatic'}
  }catch{return {...DEFAULT_PREFERENCES}}
}
export function writePreferences(preferences:InterfacePreferences,storage:PreferenceStorage|null=browserStorage()):void {
  try {storage?.setItem(PREFERENCES_KEY,JSON.stringify(preferences))}catch{/* Interface preferences are optional; controls remain usable without storage. */}
}
