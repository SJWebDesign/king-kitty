import assert from 'node:assert/strict';
const base=process.env.TEST_URL||'http://127.0.0.1:5173';
if(!/^http:\/\/(127\.0\.0\.1|localhost):/.test(base))throw new Error('Run leaderboard write checks only against a local test database.');
const key=()=>({id:crypto.randomUUID(),token:crypto.randomUUID()+crypto.randomUUID()});
const keys=[key(),key()];
const replay={id:crypto.randomUUID(),seed:55,mode:'practice',duration:150000,players:[{name:'QA Tuxedo',skin:'tuxedo',profile:keys[0]}],events:[]};
async function post(body,expected=200){const response=await fetch(base+'/api/leaderboard',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const data=await response.json();assert.equal(response.status,expected,JSON.stringify(data));return data;}
async function board(mode='all'){const res=await fetch(base+'/api/leaderboard?mode='+mode);assert.equal(res.status,200);return res.json();}
const one=await post(replay);assert.equal(one.profiles[0].id,keys[0].id);assert.ok(one.times[0]>80000);
await post(replay); // Simulates a retry after a dropped first response.
let data=await board();let entry=data.entries.find(e=>e.profile_id===keys[0].id);assert.equal(entry.races,1);assert.equal(entry.wins,0);assert.equal(entry.skin,'tuxedo');assert.ok(!JSON.stringify(data).includes(keys[0].token));assert.ok(!JSON.stringify(data).includes('secret_hash'));
await post({...replay,duration:1,id:crypto.randomUUID()},400);
await post({...replay,id:crypto.randomUUID(),players:[{...replay.players[0],profile:{...keys[0],token:'x'.repeat(72)}}]},400);
const rename=await fetch(base+'/api/leaderboard',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({profile:keys[0],name:'Moon Paws'})});assert.equal(rename.status,200);
assert.equal((await board()).entries.find(e=>e.profile_id===keys[0].id).name,'Moon Paws');
await post(replay); // An older queued replay must not undo a newer nickname.
assert.equal((await board()).entries.find(e=>e.profile_id===keys[0].id).name,'Moon Paws');
await post({...replay,id:crypto.randomUUID(),mode:'local',players:[...replay.players,{name:'QA Calico',skin:'calico',profile:keys[1]}]});
data=await board();entry=data.entries.find(e=>e.profile_id===keys[0].id);assert.equal(entry.races,2);
assert.equal((await board('practice')).entries.find(e=>e.profile_id===keys[0].id).races,1);
assert.equal((await board('local')).entries.find(e=>e.profile_id===keys[1].id).skin,'calico');
assert.ok(!(await board('online')).entries.some(e=>e.profile_id===keys[0].id));
console.log('PASS: persistent profiles and nicknames, solo and local records, exact replay validation, idempotent retry, filters, cat identity, and no public secrets.');
