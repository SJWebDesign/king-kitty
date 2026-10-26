import { advance, input, newRoom, player, type Room } from './game';
import { validCat } from './cats';
export type ReplayEvent={player:number;move:'jump'|'grab';t:number};
export type LocalReplay={id:string;seed:number;mode:'practice'|'local';duration:number;players:{name:string;skin:string;profile?:{id:string;token:string}}[];events:ReplayEvent[]};
export function replayRace(data:LocalReplay):Room {
  if(!data||!/^[-a-zA-Z0-9]{16,80}$/.test(data.id)||!['practice','local'].includes(data.mode)||!Number.isSafeInteger(data.seed)||!Number.isFinite(data.duration)||data.duration<0||data.duration>150000)throw new Error('Invalid race record.');
  if(!Array.isArray(data.players)||data.players.length!==(data.mode==='local'?2:1)||!Array.isArray(data.events)||data.events.length>1200)throw new Error('Invalid race record.');
  const r=newRoom('LOCAL',player('p1','Kitty',0,undefined,validCat(data.players[0].skin)),data.mode,data.seed);
  if(data.mode==='local')r.players.push(player('p2','Kitty Two',1,undefined,validCat(data.players[1].skin)));
  r.status='racing';r.startAt=1;let previous=0;
  for(const e of data.events){
    if(!e||!Number.isInteger(e.player)||e.player<0||e.player>=r.players.length||!['jump','grab'].includes(e.move)||!Number.isFinite(e.t)||e.t<previous||e.t>data.duration)throw new Error('Invalid race input.');
    advance(r,1+e.t);input(r,r.players[e.player].id,e.move,1+e.t);previous=e.t;
  }
  advance(r,1+data.duration);
  if(r.players.some(p=>p.finish===null))throw new Error('Finish the race before saving your time.');
  return r;
}
