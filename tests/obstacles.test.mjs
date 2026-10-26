import test from 'node:test';
import assert from 'node:assert/strict';
import './register-typescript.mjs';
const {hitsObstacle}=await import('../lib/obstacles.ts');
const {advance,newRoom,player,courseFor,input}=await import('../lib/game.ts');
const {replayRace}=await import('../lib/replay.ts');

test('the empty upper corners of rubble and spilled trash do not cause hits',()=>{
  for(const kind of [1,3]){
    const ob={x:100,w:120,h:80,kind};
    assert.equal(hitsObstacle(ob,{x:155,y:60},{x:158,y:60}),false);
    assert.equal(hitsObstacle(ob,{x:98,y:40},{x:104,y:40}),true);
  }
});
test('grazing the top is forgiven while a body collision still slows the cat',()=>{
  const ob={x:100,w:64,h:86,kind:0};
  assert.equal(hitsObstacle(ob,{x:95,y:84},{x:101,y:84}),false);
  assert.equal(hitsObstacle(ob,{x:95,y:60},{x:101,y:60}),true);
});
test('landing after clearing the obstacle does not hit its trailing edge',()=>{
  const ob={x:100,w:64,h:86,kind:0};
  assert.equal(hitsObstacle(ob,{x:139,y:90},{x:145,y:65}),false);
  assert.equal(hitsObstacle(ob,{x:130,y:65},{x:135,y:60}),true);
});
test('every course obstacle is hittable on the ground and has a timed jump window',()=>{
  const sizes=[...new Map(courseFor(55).obstacles.map(o=>[`${o.w}:${o.h}`,o])).values()];
  assert.equal(sizes.length,5);
  for(const size of sizes){
    const ob={...size,x:180};
    assert.equal(hitsObstacle(ob,{x:170,y:0},{x:180,y:0}),true);
    let passes=0;
    for(let jumpAt=0;jumpAt<=600;jumpAt+=20){
      const r=newRoom('TEST',player('a','Baby'),'practice',55);
      r.status='racing';r.startAt=1;r.course={obstacles:[ob],pickups:[]};
      advance(r,1+jumpAt);input(r,'a','jump',1+jumpAt);advance(r,1501);
      if(!r.players[0].hits.length)passes++;
    }
    assert.ok(passes>=3,`No usable jump window for ${size.w}x${size.h}`);
  }
});
test('old queued replays use their original physics and new ones use the fix',()=>{
  const data={id:crypto.randomUUID(),seed:55,mode:'practice',duration:150000,players:[{name:'Baby',skin:'tuxedo'}],events:[]};
  const replay=replayRace(data);
  const legacy=newRoom('OLD',player('p1','Baby'),'practice',55);
  delete legacy.physicsVersion;legacy.status='racing';legacy.startAt=1;advance(legacy,150001);
  assert.equal(replay.players[0].finish,legacy.players[0].finish);
  assert.equal(replay.physicsVersion,1);
  assert.equal(replayRace({...data,physicsVersion:2}).physicsVersion,2);
  assert.throws(()=>replayRace({...data,physicsVersion:99}),/physics/);
});
