import { env } from "cloudflare:workers";
import { advance, input, newRoom, player, publicRoom, rematch, start, type Room } from "@/lib/game";
import { ensureProfile, recordRace, type ProfileKey } from "@/lib/records";
import { validCat } from "@/lib/cats";
export const dynamic = "force-dynamic";
type Row = { code: string; state: string; revision: number; expires_at: number };
function response(value: unknown, status = 200) {
  return Response.json(value, {status, headers: {"Cache-Control": "no-store"}});
}
function cleanName(value: unknown) { return typeof value === "string" ? value.trim().replace(/[<>\u0000-\u001f]/g, "").slice(0,18) || "Kitty" : "Kitty"; }
function secret() { return crypto.randomUUID().replaceAll("-", ""); }
function code() { const chars="ABCDEFGHJKLMNPQRSTUVWXYZ23456789", a=crypto.getRandomValues(new Uint8Array(6)); return Array.from(a,n=>chars[n%chars.length]).join(""); }
export async function POST(request: Request) {
  if (!env.DB) return response({error: "The game server is starting. Please try again shortly."},503);
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return response({error:"Request origin is not allowed."},403);
  if (Number(request.headers.get("content-length") || 0) > 4096) return response({error:"Request too large."},413);
  let b: Record<string,unknown>;
  try { const raw=await request.text(); if(raw.length>4096) return response({error:"Request too large."},413); b=JSON.parse(raw); if (!b || Array.isArray(b) || typeof b!=="object") throw new Error(); }
  catch { return response({error:"Please send a valid game request."},400); }
  const action = b.action, now=Date.now();
  try {
    if (action === "create") {
      const profile=await ensureProfile(env.DB,b.profile,cleanName(b.name));
      const host = player(secret().slice(0,12),cleanName(b.name),0,secret(),validCat(b.skin));
      host.profileId=profile.id;
      const room = newRoom(code(),host,"online",crypto.getRandomValues(new Uint32Array(1))[0]);
      // Expired lobbies never retain nicknames or session tokens indefinitely.
      await env.DB.prepare("DELETE FROM rooms WHERE expires_at < ?").bind(now).run();
      await env.DB.prepare("INSERT INTO rooms (code,state,revision,expires_at) VALUES (?,?,0,?)")
        .bind(room.code,JSON.stringify(room),now+2*60*60*1000).run();
      return response({room:publicRoom(room,0,now),identity:{id:host.id,token:host.token,code:room.code},profile});
    }
    if (!/^[A-Z2-9]{6}$/.test(String(b.code ?? ""))) return response({error:"Enter the six-character room code."},400);
    let joinedProfile:ProfileKey|undefined;
    const joinId = secret().slice(0,12), joinToken=secret();
    for(let attempt=0;attempt<8;attempt++) {
      const row=await env.DB.prepare("SELECT * FROM rooms WHERE code = ?").bind(b.code).first<Row>();
      if(!row || row.expires_at<now) return response({error:"That room has expired or does not exist."},404);
      const room:Room=JSON.parse(row.state);
      let identity: {id:string;token?:string;code:string}|undefined;
      if(action==="join") {
        if(room.status!=="lobby") return response({error:"This race has already started. Join after the next rematch."},409);
        if(room.players.length>=8) return response({error:"This room is full (8 racers)."},409);
        joinedProfile??=await ensureProfile(env.DB,b.profile,cleanName(b.name));
        const p=player(joinId,cleanName(b.name),room.players.length,joinToken,validCat(b.skin));
        p.profileId=joinedProfile.id;
        room.players.push(p); identity={id:p.id,token:p.token,code:room.code};
      } else {
        const p=room.players.find(p=>p.id===b.id && p.token===b.token && !p.left);
        if(!p) return response({error:"Your seat is no longer active. Please rejoin the room."},401);
        advance(room,now); p.seenAt=now;
        if(action==="ready") { if(room.status!=="lobby") return response({error:"The race has started."},409); p.ready=Boolean(b.ready); }
        else if(action==="start") {
          if(p.id!==room.host) return response({error:"Only the host can start the race."},403);
          if(room.status!=="lobby") return response({error:"A race is already underway."},409);
          if(room.players.length<2 || room.players.some(q=>!q.ready)) return response({error:"At least two racers must join, and everyone must be ready."},409);
          start(room,now);
        } else if(action==="input") {
          if((b.move!=="jump" && b.move!=="grab") || !Number.isSafeInteger(b.seq) || Number(b.seq)<1) return response({error:"Invalid race input."},400);
          input(room,p.id,b.move,now,Number(b.seq));
        } else if(action==="rematch") {
          if(p.id!==room.host) return response({error:"Only the host can set up a rematch."},403);
          if(room.status!=="finished") return response({error:"Wait for the race to finish."},409);
          rematch(room,crypto.getRandomValues(new Uint32Array(1))[0]);
        } else if(action==="leave") {
          if(room.status==="lobby") room.players=room.players.filter(q=>q.id!==p.id); else p.left=true;
          if(room.host===p.id) room.host=room.players.find(q=>!q.left)?.id ?? "";
        } else if(action!=="state") return response({error:"Unknown game action."},400);
      }
      const update=await env.DB.prepare("UPDATE rooms SET state = ?, revision = revision + 1 WHERE code = ? AND revision = ?")
        .bind(JSON.stringify(room),room.code,row.revision).run();
      if(update.meta.changes===1) {
        await recordRace(env.DB,room);
        return response({room:publicRoom(room,row.revision+1,now),...(identity?{identity,profile:joinedProfile}:{})});
      }
    }
    return response({error:"The room is busy. Please try again."},409);
  } catch(error) {
    console.error("King Kitty game service",error instanceof Error?error.message:"unknown error");
    return response({error:"The alley connection dropped. Please try again."},503);
  }
}
