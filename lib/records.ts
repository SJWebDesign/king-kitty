import { type Room, standings } from './game';
import { validCat } from './cats';
export type ProfileKey = {id:string;token:string};
export function cleanRacer(value:unknown){return typeof value==='string'?value.trim().replace(/[<>\u0000-\u001f]/g,'').slice(0,18)||'Kitty':'Kitty';}
async function hash(token:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token))),n=>n.toString(16).padStart(2,'0')).join('');}
export async function ensureProfile(db:D1Database,key:unknown,name:unknown,updateName=true):Promise<ProfileKey>{
  const value=key as Partial<ProfileKey>|undefined;
  if(value&&typeof value.id==='string'&&typeof value.token==='string'&&value.token.length<=100){
    const tokenHash=await hash(value.token);
    const row=await db.prepare('SELECT secret_hash FROM profiles WHERE id = ?').bind(value.id).first<{secret_hash:string}>();
    if(row){if(row.secret_hash!==tokenHash)throw new Error('This racer could not be verified.');if(updateName)await db.prepare('UPDATE profiles SET name = ? WHERE id = ?').bind(cleanRacer(name),value.id).run();return {id:value.id,token:value.token};}
    if(/^[a-f0-9-]{36}$/i.test(value.id)&&value.token.length>=64){
      await db.prepare('INSERT OR IGNORE INTO profiles(id,secret_hash,name,created_at) VALUES(?,?,?,?)').bind(value.id,tokenHash,cleanRacer(name),Date.now()).run();
      const saved=await db.prepare('SELECT secret_hash FROM profiles WHERE id = ?').bind(value.id).first<{secret_hash:string}>();
      if(saved?.secret_hash!==tokenHash)throw new Error('This racer could not be verified.');
      return {id:value.id,token:value.token};
    }
  }
  const id=crypto.randomUUID(),token=crypto.randomUUID()+crypto.randomUUID();
  await db.prepare('INSERT INTO profiles(id,secret_hash,name,created_at) VALUES(?,?,?,?)').bind(id,await hash(token),cleanRacer(name),Date.now()).run();
  return {id,token};
}
export async function recordRace(db:D1Database,room:Room,matchId=`${room.code}:${room.createdAt}:${room.round}`){
  if(room.status!=='finished')return;
  const finishers=standings(room).filter(p=>p.finish!==null&&p.profileId);
  if(!finishers.length)return;
  const count=await db.prepare('SELECT COUNT(*) AS n FROM race_results WHERE match_id = ?').bind(matchId).first<{n:number}>();
  if(count?.n===finishers.length)return;
  const tie=finishers.length>1&&Math.abs(finishers[0].finish!-finishers[1].finish!)<.001;
  await db.batch(finishers.map((p,i)=>db.prepare('INSERT OR IGNORE INTO race_results(id,profile_id,match_id,mode,time_ms,won,skin,finished_at) VALUES(?,?,?,?,?,?,?,?)').bind(`${matchId}:${p.id}`,p.profileId,matchId,room.mode,Math.round(p.finish!),i===0&&!tie&&room.mode!=='practice'?1:0,validCat(p.skin),Date.now())));
}
