import { env } from 'cloudflare:workers';
import { ensureProfile, cleanRacer, recordRace } from '@/lib/records';
import { replayRace, type LocalReplay } from '@/lib/replay';
export const dynamic='force-dynamic';
function response(body:unknown,status=200){return Response.json(body,{status,headers:{'Cache-Control':'no-store'}});}
export async function GET(request:Request){
  if(!env.DB)return response({error:'The leaderboard is getting ready.'},503);
  const url=new URL(request.url),rawMode=url.searchParams.get('mode'),mode=['online','practice','local'].includes(rawMode||'')?rawMode:'all';
  const offset=Math.max(0,Math.min(1000000,Math.floor(Number(url.searchParams.get('offset'))||0)));
  try{
    const filter=mode==='all'?'':'WHERE mode = ?';
    const args=mode==='all'?[]:[mode];
    const rows=await env.DB.prepare(`WITH filtered AS (SELECT *,ROW_NUMBER() OVER(PARTITION BY profile_id ORDER BY time_ms,finished_at,id) AS pos FROM race_results ${filter}), totals AS (SELECT profile_id,MIN(time_ms) AS bestTime,SUM(won) AS wins,COUNT(*) AS races FROM filtered GROUP BY profile_id) SELECT t.*,p.name,f.skin,f.mode FROM totals t JOIN profiles p ON p.id=t.profile_id JOIN filtered f ON f.profile_id=t.profile_id AND f.pos=1 ORDER BY t.bestTime,t.wins DESC,t.profile_id LIMIT 25 OFFSET ?`).bind(...args,offset).all();
    const count=await env.DB.prepare(`SELECT COUNT(DISTINCT profile_id) AS n FROM race_results ${filter}`).bind(...args).first<{n:number}>();
    return response({entries:rows.results,total:count?.n||0,offset,nextOffset:offset+25<(count?.n||0)?offset+25:null});
  }catch{return response({error:'Could not load the leaderboard. Please try again.'},503);}
}
export async function POST(request:Request){
  const db=env.DB;if(!db)return response({error:'The leaderboard is getting ready.'},503);
  const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return response({error:'Request origin is not allowed.'},403);
  try{
    const raw=await request.text();if(raw.length>200000)return response({error:'Race record is too large.'},413);
    const data=JSON.parse(raw) as LocalReplay,r=replayRace(data);
    const profiles=await Promise.all(data.players.map(p=>ensureProfile(db,p.profile,p.name,false)));
    r.players.forEach((p,i)=>{p.profileId=profiles[i].id;p.name=cleanRacer(data.players[i].name);});
    await recordRace(db,r,`local:${data.id}`);
    return response({saved:true,profiles,times:r.players.map(p=>p.finish)});
  }catch(e){return response({error:e instanceof Error?e.message:'Could not save your result.'},400);}
}
export async function PUT(request:Request){
  const db=env.DB;if(!db)return response({error:'The leaderboard is getting ready.'},503);
  const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return response({error:'Request origin is not allowed.'},403);
  try{
    const raw=await request.text();if(raw.length>2000)return response({error:'Name request is too large.'},413);
    const data=JSON.parse(raw);
    if(typeof data?.name!=='string'||!data.name.trim().replace(/[<>\u0000-\u001f]/g,''))return response({error:'Choose a nickname first.'},400);
    if(!data.profile?.id||!data.profile?.token)return response({error:'Your racer could not be verified.'},400);
    const profile=await ensureProfile(db,data.profile,data.name);
    return response({profile,name:cleanRacer(data.name)});
  }catch{return response({error:'Your name could not be saved. Please try again.'},400);}
}
