import test from 'node:test';
import assert from 'node:assert/strict';
import './register-typescript.mjs';
const { replayRace }=await import('../lib/replay.ts');
const { advance,input,newRoom,player }=await import('../lib/game.ts');
function replay(mode='practice'){return {id:crypto.randomUUID(),seed:55,mode,duration:150000,players:[{name:'Tuxedo',skin:'tuxedo'},...(mode==='local'?[{name:'Calico',skin:'calico'}]:[])],events:[]};}
test('solo and local replays compute real finish times and selected cats',()=>{
 for(const mode of ['practice','local']){const r=replayRace(replay(mode));assert.equal(r.status,'finished');assert.equal(r.players[0].skin,'tuxedo');assert.ok(r.players.every(p=>p.finish>80000&&p.finish<110000));if(mode==='local')assert.equal(r.players[1].skin,'calico');}
});
test('input replay reproduces the played race exactly',()=>{
 const data=replay('local'),r=newRoom('LOCAL',player('p1','Tuxedo',0,undefined,'tuxedo'),'local',data.seed);r.players.push(player('p2','Calico',1,undefined,'calico'));r.status='racing';r.startAt=1;
 for(let t=0;t<150000&&r.status==='racing';t+=20){advance(r,t+1);const p=r.players[0];let move;
  if(r.course.obstacles.some(o=>o.x-p.x>90&&o.x-p.x<120)&&p.y===0)move='jump';
  else if(r.course.pickups.some(o=>o.x-p.x>0&&o.x-p.x<90))move='grab';
  if(move&&input(r,p.id,move,t+1))data.events.push({player:0,move,t:r.tick});
 }
 data.duration=r.tick;const played=replayRace(data);assert.ok(data.events.length>0);assert.deepEqual(played.players.map(p=>[p.finish,p.hits,p.collected]),r.players.map(p=>[p.finish,p.hits,p.collected]));
});
test('unfinished, malformed and excessive local records are rejected',()=>{
 assert.throws(()=>replayRace({...replay(),duration:1000}),/Finish/);
 assert.throws(()=>replayRace({...replay(),events:[{player:0,move:'teleport',t:20}]}),/input/);
 assert.throws(()=>replayRace({...replay(),events:[{player:4,move:'jump',t:20}]}),/input/);
 assert.throws(()=>replayRace({...replay(),events:[{player:0,move:'jump',t:200},{player:0,move:'grab',t:100}]}),/input/);
 assert.throws(()=>replayRace({...replay(),events:Array(1201).fill({player:0,move:'jump',t:20})}),/record/);
 assert.throws(()=>replayRace({...replay(),mode:'online'}),/record/);
});
