import type { ProfileKey } from './records';
import type { LocalReplay } from './replay';
const PROFILE='king-kitty-profiles',QUEUE='king-kitty-pending-results';
export function savedProfiles():ProfileKey[]{try{return JSON.parse(localStorage.getItem(PROFILE)||'[]');}catch{return [];}}
export function keepProfile(profile:ProfileKey,index=0){const profiles=savedProfiles();profiles[index]=profile;localStorage.setItem(PROFILE,JSON.stringify(profiles));}
export function racerProfile(index=0):ProfileKey{const saved=savedProfiles()[index];if(saved)return saved;const key={id:crypto.randomUUID(),token:crypto.randomUUID()+crypto.randomUUID()};keepProfile(key,index);return key;}
export function queueReplay(replay:LocalReplay){const queue:LocalReplay[]=JSON.parse(localStorage.getItem(QUEUE)||'[]');if(!queue.some(q=>q.id===replay.id))queue.push(replay);localStorage.setItem(QUEUE,JSON.stringify(queue));}
let saving:Promise<void>|null=null;
export function saveQueuedResults(){
  if(saving)return saving;
  saving=(async()=>{
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
