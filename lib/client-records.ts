import type { ProfileKey } from './records';
import type { LocalReplay } from './replay';
const PROFILE='king-kitty-profiles',QUEUE='king-kitty-pending-results';
const NAMES='king-kitty-pending-names';
export function nameStorageKey(index=0){return index===0?'king-kitty-name':'king-kitty-second-name';}
export function savedProfiles():ProfileKey[]{try{return JSON.parse(localStorage.getItem(PROFILE)||'[]');}catch{return [];}}
export function keepProfile(profile:ProfileKey,index=0){const profiles=savedProfiles();profiles[index]=profile;localStorage.setItem(PROFILE,JSON.stringify(profiles));}
export function racerProfile(index=0):ProfileKey{const saved=savedProfiles()[index];if(saved)return saved;const key={id:crypto.randomUUID(),token:crypto.randomUUID()+crypto.randomUUID()};keepProfile(key,index);return key;}
export function rememberRacerName(name:string,index=0){
  const clean=name.trim().replace(/[<>\u0000-\u001f]/g,'').slice(0,18);if(!clean)throw new Error('Choose a nickname first.');
  localStorage.setItem(nameStorageKey(index),clean);
  const pending=JSON.parse(localStorage.getItem(NAMES)||'{}');pending[index]=clean;localStorage.setItem(NAMES,JSON.stringify(pending));return clean;
}
export async function syncRacerNames(){
  const pending=JSON.parse(localStorage.getItem(NAMES)||'{}') as Record<string,string>;
  for(const [slot,name] of Object.entries(pending)){
    const index=Number(slot),profile=racerProfile(index);
    const res=await fetch('/api/leaderboard',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({profile,name}),signal:AbortSignal.timeout(8000)});
    if(!res.ok)throw new Error('Your name is saved here. Reconnect to update the leaderboard.');
    const data=await res.json() as {profile:ProfileKey};keepProfile(data.profile,index);
    const current=JSON.parse(localStorage.getItem(NAMES)||'{}');if(current[slot]===name)delete current[slot];localStorage.setItem(NAMES,JSON.stringify(current));
  }
}
export function queueReplay(replay:LocalReplay){const queue:LocalReplay[]=JSON.parse(localStorage.getItem(QUEUE)||'[]');if(!queue.some(q=>q.id===replay.id))queue.push(replay);localStorage.setItem(QUEUE,JSON.stringify(queue));}
let saving:Promise<void>|null=null;
export function saveQueuedResults(){
  if(saving)return saving;
  saving=(async()=>{
    await syncRacerNames();
    let queue:LocalReplay[]=JSON.parse(localStorage.getItem(QUEUE)||'[]');
    while(queue.length){
      const replay=queue[0],profiles=savedProfiles();
      replay.players.forEach((p,i)=>{p.profile=p.profile||profiles[i]||racerProfile(i);});
      const res=await fetch('/api/leaderboard',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(replay),signal:AbortSignal.timeout(15000)});
      const data=await res.json() as {error?:string;profiles?:ProfileKey[]};
      if(!res.ok)throw new Error(data.error||'Your result is saved here. Try again when connected.');
      data.profiles?.forEach((profile,i)=>keepProfile(profile,i));
      queue=JSON.parse(localStorage.getItem(QUEUE)||'[]').filter((q:LocalReplay)=>q.id!==replay.id);
      localStorage.setItem(QUEUE,JSON.stringify(queue));
    }
  })().finally(()=>{saving=null;});
  return saving;
}
