import assert from 'node:assert/strict';
const base=process.env.TEST_URL || 'http://127.0.0.1:5173';
async function call(action,extra={},expected=200){
 const r=await fetch(base+'/api/game',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,...extra})});
 const data=await r.json();assert.equal(r.status,expected,JSON.stringify(data));return data;
}
let a=await call('create',{name:'QA Jump Kitty',skin:'tuxedo'});const aid=a.identity;
assert.ok(!JSON.stringify(a.room).includes(aid.token));assert.equal(a.room.players[0].skin,'tuxedo');
await call('start',aid,409);
const b=await call('join',{code:a.room.code,name:'QA Runner',skin:'calico'}),bid=b.identity;
await call('start',bid,403);
await call('state',{...aid,token:'wrong'},401);
await call('ready',{...aid,ready:true});await call('ready',{...bid,ready:true});
a=await call('start',aid);
await call('join',{code:a.room.code,name:'Late racer'},409);
console.log('PASS: create, join, readiness, host-only start, token protection, closed race entry.');
let seq=0,lastLog=0;
const expires=Date.now()+90000;
while(a.room.status!=='finished'&&Date.now()<expires){
 const r=a.room,p=r.players.find(p=>p.id===aid.id),now=r.serverNow;
 if(now>=r.startAt){
  const obstacle=r.course.obstacles.find(o=>o.x-p.x>40&&o.x-p.x<105&&!p.hits.includes(o.id));
  if(obstacle&&p.y===0)a=await call('input',{...aid,move:'jump',seq:++seq});
  const pickup=r.course.pickups.find(o=>o.x-p.x>-15&&o.x-p.x<90&&!p.collected.includes(o.id)&&Math.abs(o.y-(p.y+30))<62);
  if(pickup&&r.tick>=p.nextGrab)a=await call('input',{...aid,move:'grab',seq:++seq});
 }
 if(r.tick-lastLog>=10000){lastLog=r.tick;console.log('Race verified through',Math.round(r.tick/1000),'seconds.');}
 await new Promise(resolve=>setTimeout(resolve,100));
 a=await call('state',aid);
}
assert.equal(a.room.status,'finished');
const final=await call('state',bid);
assert.deepEqual(a.room.players.map(p=>p.finish),final.room.players.map(p=>p.finish));
assert.ok(a.room.players.every(p=>p.finish!==null));
assert.ok(a.room.players.find(p=>p.id===aid.id).finish<a.room.players.find(p=>p.id===bid.id).finish);
console.log('PASS: full two-player race, jumps/grabs affect finish, consistent authoritative results.',a.room.players.map(p=>({name:p.name,time:p.finish,boosts:p.collected.length,hits:p.hits.length})));
await call('rematch',bid,403);const reset=await call('rematch',aid);
assert.deepEqual(reset.room.players.map(p=>p.skin),['tuxedo','calico']);assert.equal(reset.room.status,'lobby');assert.ok(reset.room.players.every(p=>p.x===0&&!p.ready));
console.log('PASS: rematch resets the room and retains players.');
await call('leave',bid);await call('leave',aid);
