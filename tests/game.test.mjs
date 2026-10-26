import test from 'node:test';
import assert from 'node:assert/strict';
import './register-typescript.mjs';
const { advance, courseFor, input, LENGTH, newRoom, player, publicRoom, pickupPosition, rematch, SPEED, start, standings } = await import('../lib/game.ts');
function setup(){const r=newRoom('ABC234',player('a','A',0,'private-a'),'online',42);r.players.push(player('b','B',1,'private-b'));start(r,10000);return r;}
test('seeded course is shared, random across seeds, and finish is clear',()=>{assert.deepEqual(courseFor(42),courseFor(42));assert.notDeepEqual(courseFor(42),courseFor(43));assert.ok(courseFor(42).obstacles.every(o=>o.x<LENGTH-450));});
test('shared countdown prevents early movement and input',()=>{const r=setup();advance(r,13999);assert.equal(r.players[0].x,0);assert.equal(input(r,'a','jump',13999),false);advance(r,15000);assert.equal(r.players[0].x,r.players[1].x);assert.ok(r.players[0].x>0);});
test('obstacles slow but never eliminate; a timed jump avoids contact',()=>{const r=setup();r.course={obstacles:[{id:1,x:170,h:40,kind:0}],pickups:[]};advance(r,14200);input(r,'b','jump',14200);advance(r,14800);assert.deepEqual(r.players[0].hits,[1]);assert.deepEqual(r.players[1].hits,[]);assert.ok(r.players[1].x>r.players[0].x);assert.equal(r.players[0].left,undefined);});
test('grab collects one reachable pickup per player and adds a small boost',()=>{const r=setup();r.course={obstacles:[],pickups:[{id:1,x:50,y:20,kind:'mouse'}]};input(r,'a','grab',14000,1);advance(r,14200);assert.deepEqual(r.players[0].collected,[1]);assert.deepEqual(r.players[1].collected,[]);assert.ok(r.players[0].x>r.players[1].x);assert.ok(r.players[0].x<=SPEED*1.25*.2+.001);assert.equal(input(r,'a','grab',14200,1),false);});
test('full two-player game finishes and retains exact crossing times',()=>{const r=setup();advance(r,15000);input(r,'a','jump',15000,1);advance(r,120000);assert.equal(r.status,'finished');for(const p of r.players){assert.equal(p.x,LENGTH);assert.ok(p.finish>0);assert.ok(p.finish<140000);}const times=r.players.map(p=>p.finish);advance(r,130000);assert.deepEqual(r.players.map(p=>p.finish),times);});
test('public state never exposes player session secrets',()=>{const r=setup();const json=JSON.stringify(publicRoom(r));assert.ok(!json.includes('private-a'));assert.ok(!json.includes('private-b'));assert.ok(!json.includes('"token"'));});
test('rematch keeps seats and resets physics, readiness, and pickups',()=>{const r=setup();advance(r,120000);rematch(r,99);assert.equal(r.round,2);assert.equal(r.status,'lobby');assert.equal(r.players.length,2);assert.equal(r.players[0].token,'private-a');assert.ok(r.players.every(p=>!p.ready&&p.x===0&&p.finish===null));assert.deepEqual(r.course,courseFor(99));});

test('moving pickups use a shared deterministic clock and birds stay out of ground reach',()=>{
  const bird={id:0,x:60,y:125,kind:'bird'};
  assert.deepEqual(pickupPosition(bird,500),pickupPosition(bird,500));
  assert.notEqual(pickupPosition(bird,500).x,pickupPosition(bird,1000).x);
  for(let t=0;t<10000;t+=20)assert.ok(pickupPosition(bird,t).y>=115);
  const r=setup();r.course={obstacles:[],pickups:[bird]};
  input(r,'a','grab',14000);advance(r,14200);
  assert.deepEqual(r.players[0].collected,[]);
  const jumped=setup();jumped.course={obstacles:[],pickups:[bird]};
  input(jumped,'a','jump',14000);advance(jumped,14160);input(jumped,'a','grab',14160);advance(jumped,14300);
  assert.deepEqual(jumped.players[0].collected,[0]);
});

test('cat selections stay with players through the finish and rematch',()=>{
  const r=newRoom('CAT234',player('a','Tuxedo runner',0,'secret-a','tuxedo'),'online',7);
  r.players.push(player('b','Calico runner',1,'secret-b','calico'));
  start(r,10000);advance(r,120000);
  assert.equal(publicRoom(r).players[0].skin,'tuxedo');
  assert.equal(standings(r).find(p=>p.id==='b').skin,'calico');
  rematch(r,8);assert.deepEqual(r.players.map(p=>p.skin),['tuxedo','calico']);
  assert.equal(player('x','Unknown',0,undefined,'invalid-skin').skin,'ginger');
});

test('long courses contain varied widths/heights and tall obstacles reward timing',()=>{
  const course=courseFor(55);assert.equal(LENGTH,24000);
  assert.ok(new Set(course.obstacles.map(o=>o.w)).size>2);
  assert.ok(new Set(course.obstacles.map(o=>o.h)).size>2);
  assert.ok(course.obstacles.every(o=>o.h<=86&&o.w<=126));
  const r=setup();r.course={obstacles:[{id:1,x:180,h:86,w:64,kind:0}],pickups:[]};
  input(r,'a','jump',14000);advance(r,14200);input(r,'b','jump',14200);advance(r,15100);
  assert.ok(r.players[0].hits.includes(1));assert.equal(r.players[1].hits.length,0);
});
