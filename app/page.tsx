"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { advance, input, newRoom, player, standings, start, type Room } from "@/lib/game";
import { drawRace, loadArt } from "@/lib/renderer";
import { CATS, catAsset, validCat, type CatSkin } from "@/lib/cats";
import Tutorial from "@/components/tutorial";
type Identity = {id:string;token:string;code:string};
type Screen = "menu"|"multiplayer"|"host"|"join"|"lobby"|"race"|"results"|"settings"|"controls"|"tutorial"|"cats";
type Art = Awaited<ReturnType<typeof loadArt>>;
function ImageButton({asset,label,onClick,disabled=false,small=false}:{asset:string;label:string;onClick:()=>void;disabled?:boolean;small?:boolean}) {
  const titles:Record<string,string>={"start-game":"Start game","host-game":"Host game","join-game":"Join game","local-coop":"Local co-op","controls":"Controls","settings":"Settings","continue":"Continue","quit":"Quit","main-menu":"Main menu","back":"Back"};
  return <button className={`image-button ${small?"small":""}`} aria-label={label} onClick={onClick} disabled={disabled}><span className="button-label" aria-hidden="true">{titles[asset]||label}</span></button>;
}
export default function Game() {
  const [screen,setScreen]=useState<Screen>("menu"),[name,setName]=useState(""),[joinCode,setJoinCode]=useState("");
  const [skin,setSkin]=useState<CatSkin>("tuxedo"),[secondSkin,setSecondSkin]=useState<CatSkin>("ginger"),[editingCat,setEditingCat]=useState(0),[catReturn,setCatReturn]=useState<Screen>("menu");
  const [room,setRoom]=useState<Room|null>(null),[identity,setIdentity]=useState<Identity|null>(null);
  const [error,setError]=useState(""),[busy,setBusy]=useState(false),[online,setOnline]=useState(true);
  const [sound,setSound]=useState(false),[volume,setVolume]=useState(.25),[menuOpen,setMenuOpen]=useState(false);
  const [art,setArt]=useState<Art|null>(null),[copied,setCopied]=useState(false),[now,setNow]=useState(Date.now());
  const roomRef=useRef<Room|null>(null),identityRef=useRef<Identity|null>(null),offset=useRef(0),seq=useRef(0);
  const canvases=useRef<(HTMLCanvasElement|null)[]>([]),soundRef=useRef({sound:false,volume:.25}),audio=useRef<AudioContext|null>(null);
  const inFlight=useRef(false),lastGood=useRef(Date.now()),screenRef=useRef<Screen>("menu"),localPaused=useRef<number|null>(null);
  useEffect(()=>{screenRef.current=screen;},[screen]);
  useEffect(()=>{soundRef.current={sound,volume};},[sound,volume]);
  useEffect(()=>{
    loadArt().then(setArt).catch(e=>setError(e.message));
    const saved=localStorage.getItem("king-kitty-name");if(saved)setName(saved);
    const savedCat=localStorage.getItem("king-kitty-cat");if(savedCat)setSkin(validCat(savedCat));
    const savedSecond=localStorage.getItem("king-kitty-second-cat");if(savedSecond)setSecondSkin(validCat(savedSecond));
    try{const s=JSON.parse(localStorage.getItem("king-kitty-sound")||"null");if(s){setSound(!!s.sound);setVolume(Number(s.volume)||.25);}}catch{}
    const code=new URL(window.location.href).searchParams.get("room");if(code){setJoinCode(code.toUpperCase());setScreen("join");}
  },[]);
  function changeSound(value:boolean){setSound(value);localStorage.setItem("king-kitty-sound",JSON.stringify({sound:value,volume}));}
  function beep(kind:"jump"|"grab"|"click") {
    if(!soundRef.current.sound)return;
    try{audio.current??=new AudioContext();void audio.current.resume();const ctx=audio.current,o=ctx.createOscillator(),g=ctx.createGain();o.type="triangle";o.frequency.setValueAtTime(kind==="jump"?310:kind==="grab"?700:210,ctx.currentTime);o.frequency.exponentialRampToValueAtTime(kind==="jump"?690:kind==="grab"?1100:150,ctx.currentTime+.13);g.gain.setValueAtTime(soundRef.current.volume*.15,ctx.currentTime);g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.18);o.connect(g);g.connect(ctx.destination);o.start();o.stop(ctx.currentTime+.18);}catch{}
  }
  const accept=useCallback((next:Room)=>{
    const prev=roomRef.current;if(prev&&prev.code===next.code&&(prev.revision??-1)>(next.revision??0))return;
    roomRef.current=next;setRoom(next);
    seq.current=Math.max(seq.current,next.players.find(p=>p.id===identityRef.current?.id)?.lastSeq||0);
    setScreen(next.status==="racing"?"race":next.status==="finished"?"results":"lobby");
  },[]);
  const api=useCallback(async(action:string,extra:Record<string,unknown>={},quiet=false)=>{
    const started=Date.now();
    try{
      const res=await fetch("/api/game",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action,...identityRef.current,...extra}),signal:AbortSignal.timeout(8000)});
      const data=await res.json() as {error?:string;room?:Room;identity?:Identity};if(!res.ok)throw new Error(data.error||"The alley connection dropped.");
      if(data.identity){identityRef.current=data.identity;setIdentity(data.identity);seq.current=0;sessionStorage.setItem("king-kitty-seat",JSON.stringify(data.identity));}
      if(data.room){offset.current=(data.room.serverNow??Date.now())-(started+Date.now())/2;accept(data.room);}
      lastGood.current=Date.now();setOnline(true);if(!quiet)setError("");return data;
    }catch(e){if(!quiet)setError(e instanceof Error?e.message:"Please try again.");if(Date.now()-lastGood.current>4000)setOnline(false);return null;}
  },[accept]);
  useEffect(()=>{
    const saved=sessionStorage.getItem("king-kitty-seat");
    if(saved){try{identityRef.current=JSON.parse(saved);setIdentity(identityRef.current);void api("state").then(r=>{if(!r){identityRef.current=null;setIdentity(null);sessionStorage.removeItem("king-kitty-seat");}});}catch{sessionStorage.removeItem("king-kitty-seat");}}
  },[api]);
  useEffect(()=>{
    if(!identity||room?.mode!=="online")return;
    const timer=setInterval(()=>{if(inFlight.current||document.hidden)return;inFlight.current=true;void api("state",{},true).finally(()=>{inFlight.current=false;});},room?.status==="lobby"?900:350);
    return()=>clearInterval(timer);
  },[identity,room?.mode,room?.status,api]);
  useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()+offset.current),200);return()=>clearInterval(timer);},[]);
  useEffect(()=>{
    if(screen!=="race"||!art)return;let frame:number;
    const paint=()=>{
      const authoritative=roomRef.current;
      if(authoritative){
        const t=Date.now()+(authoritative.mode==="online"?offset.current:0);
        if(authoritative.mode!=="online"&&localPaused.current===null){advance(authoritative,t);if(authoritative.status==="finished"){setRoom({...authoritative});setScreen("results");}}
        const prediction=authoritative.mode==="online"?structuredClone(authoritative):authoritative;
        if(authoritative.mode==="online")advance(prediction,Math.min(t,authoritative.startAt+authoritative.tick+450));
        const ids=authoritative.mode==="local"?authoritative.players.map(p=>p.id):[identityRef.current?.id||authoritative.players[0].id];
        ids.forEach((id,i)=>{const canvas=canvases.current[i];if(canvas)drawRace(canvas,prediction,id,art,localPaused.current??t,ids.length>1);});
      }
      frame=requestAnimationFrame(paint);
    };frame=requestAnimationFrame(paint);return()=>cancelAnimationFrame(frame);
  },[screen,art]);
  const move=useCallback((action:"jump"|"grab",index=0)=>{
    const r=roomRef.current;if(!r||screenRef.current!=="race"||localPaused.current!==null)return;
    const id=r.mode==="online"?identityRef.current?.id:r.players[index]?.id;if(!id)return;beep(action);
    if(r.mode==="online"){const n=++seq.current;input(r,id,action,Date.now()+offset.current,n);void api("input",{move:action,seq:n},true);}
    else{advance(r,Date.now());input(r,id,action,Date.now());}
  },[api]);
  useEffect(()=>{
    const handler=(e:KeyboardEvent)=>{
      if(e.repeat||e.target instanceof HTMLInputElement||screenRef.current!=="race")return;
      const local=roomRef.current?.mode==="local";
      const map:Record<string,["jump"|"grab",number]>={"Space":["jump",0],"KeyW":["jump",0],"KeyE":["grab",0],"KeyG":["grab",0],"ArrowUp":["jump",local?1:0],"ArrowRight":["grab",local?1:0]};
      if(map[e.code]){e.preventDefault();move(...map[e.code]);}
    };window.addEventListener("keydown",handler);return()=>window.removeEventListener("keydown",handler);
  },[move]);
  function navigate(s:Screen){setError("");beep("click");setScreen(s);window.scrollTo({top:0});}
  function chooseCat(value:CatSkin){
    if(editingCat===0){setSkin(value);localStorage.setItem("king-kitty-cat",value);}else{setSecondSkin(value);localStorage.setItem("king-kitty-second-cat",value);}
  }
  function openCats(from:Screen){setCatReturn(from);setEditingCat(0);navigate("cats");}
  async function requestRoom(action:"create"|"join"){
    if(busy)return;setBusy(true);localStorage.setItem("king-kitty-name",name.trim()||"Kitty");
    await api(action,{name:name.trim()||"Kitty",skin,...(action==="join"?{code:joinCode.trim().toUpperCase()}:{})});setBusy(false);
  }
  function practice(local=false){
    const r=newRoom("LOCAL",player("p1",name.trim()||"King Kitty",0,undefined,skin),local?"local":"practice",Math.floor(Math.random()*2**32));
    if(local)r.players.push(player("p2","Kitty Two",1,undefined,secondSkin));r.players.forEach(p=>p.ready=true);start(r,Date.now());
    identityRef.current=null;setIdentity(null);roomRef.current=r;setRoom(r);setScreen("race");setError("");localPaused.current=null;
  }
  function toggleMenu(){
    const r=roomRef.current;if(r&&r.mode!=="online"){
      if(!menuOpen)localPaused.current=Date.now();else if(localPaused.current){r.startAt+=Date.now()-localPaused.current;localPaused.current=null;}
    }setMenuOpen(!menuOpen);
  }
  function saveGameplay(){
    const canvas=canvases.current[0];if(!canvas)return;
    canvas.toBlob(blob=>{if(!blob)return;const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='king-kitty-gameplay.png';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);},'image/png');
  }
  async function leave(){
    if(roomRef.current?.mode==="online")await api("leave");
    sessionStorage.removeItem("king-kitty-seat");roomRef.current=null;identityRef.current=null;setIdentity(null);setRoom(null);setMenuOpen(false);localPaused.current=null;navigate("menu");
  }
  async function copyInvite(){
    if(!room)return;const url=new URL(window.location.href);url.search="";url.searchParams.set("room",room.code);
    try{await navigator.clipboard.writeText(url.toString());setCopied(true);setTimeout(()=>setCopied(false),2000);}catch{setError(`Room code: ${room.code}. Share this with your friends.`);}
  }
  const me=room?.players.find(p=>p.id===identity?.id),host=room?.host===identity?.id;
  const ranking=room?standings(room):[],winner=ranking.find(p=>p.finish!==null);
  const tied=!!(winner&&ranking[1]?.finish!==null&&ranking[1]?.finish!==undefined&&Math.abs(winner.finish!-ranking[1].finish!)<.001);
  const elapsed=room?Math.max(0,((localPaused.current??now)-room.startAt)/1000):0;
  return <main className={`game-app scene-${screen} ${screen==="race"?"in-race":""}`}>
    <div className="menu-scene" aria-hidden="true"><div className="scene-art" key={screen}/></div><div className="scene-shade" aria-hidden="true"/>{screen!=="race"&&<div className={`scene-companion companion-${screen}`} aria-hidden="true"><div className="scene-kitty" style={{backgroundImage:`url(${catAsset(screen==="results"?winner?.skin:skin)})`}}/></div>}
    <header className="topbar"><button className="wordmark" onClick={()=>screen==="race"?toggleMenu():room?void leave():navigate("menu")} aria-label="King Kitty home">♛ <span>KING KITTY</span></button><div className="top-meta"><span className="live-dot"/> {screen==="race"?`${Math.floor(elapsed/60)}:${Math.floor(elapsed%60).toString().padStart(2,"0")}`:"THE ALLEY IS YOURS"}<button className="sound-button" onClick={()=>changeSound(!sound)} aria-label={sound?"Mute audio":"Enable audio"}>{sound?"♫":"♪"}<span>{sound?"ON":"OFF"}</span></button></div></header>
    {error&&<div className="toast" role="alert">{error}<button onClick={()=>setError("")} aria-label="Dismiss message">×</button></div>}
    {!art&&<div className="loading-note" role="status">Loading the alley artwork…</div>}
    {screen==="menu"&&<section className="main-menu"><p className="eyebrow">A LITTLE CAT. A BIG RACE.</p><h1>King<br/><em>Kitty</em><span className="title-crown" aria-hidden="true">♛</span></h1><p className="tagline">Quick paws. Small crowns.<br/>One king of the alley.</p><div className="menu-buttons"><ImageButton asset="start-game" label="Start game" disabled={!art} onClick={()=>practice()}/><ImageButton asset="host-game" label="Host game" disabled={!art} onClick={()=>navigate("host")}/><ImageButton asset="join-game" label="Join game" disabled={!art} onClick={()=>navigate("join")}/><div className="menu-pair"><ImageButton asset="controls" label="Controls" small onClick={()=>navigate("controls")}/><ImageButton asset="settings" label="Settings" small onClick={()=>navigate("settings")}/></div></div><p className="menu-caption">Start Game = solo practice · Host or Join = online</p><div className="menu-extra"><button className="gold-button" disabled={!art} onClick={()=>navigate("tutorial")}>TUTORIAL</button><button className="quiet-link" onClick={()=>openCats("menu")}>CHOOSE CAT</button></div><button className="quiet-link friends-link" onClick={()=>navigate("multiplayer")}>Play with friends</button></section>}
    {screen==="multiplayer"&&<section className="panel menu-panel"><p className="eyebrow">BRING YOUR ALLEY CREW</p><h2>Play with friends.</h2><p>Host a race or join a friend. Local Co-op lets two players share one keyboard.</p><ImageButton asset="host-game" label="Host online game" onClick={()=>navigate("host")}/><ImageButton asset="join-game" label="Join online game" onClick={()=>navigate("join")}/><ImageButton asset="local-coop" label="Local co-op" onClick={()=>practice(true)}/><ImageButton asset="back" label="Back" small onClick={()=>navigate("menu")}/></section>}
    {(screen==="host"||screen==="join")&&<section className="panel form-panel"><p className="eyebrow">{screen==="host"?"YOUR FRIENDS. YOUR ALLEY.":"THERE’S A RACE WAITING."}</p><h2>{screen==="host"?"Host a race.":"Join a race."}</h2><p>{screen==="host"?"Create a room. Share its code with your friends.":"Enter your name and the six-letter room code."}</p><div className="selected-cat"><span className="cat-mini" style={{backgroundImage:`url(${catAsset(skin)})`}} aria-hidden="true"/><span>{CATS.find(c=>c.id===skin)?.name}</span><button className="quiet-link" onClick={()=>openCats(screen)}>Change cat</button></div><form onSubmit={e=>{e.preventDefault();void requestRoom(screen==="host"?"create":"join");}}><label htmlFor="nickname">YOUR RACER NAME</label><input id="nickname" maxLength={18} value={name} onChange={e=>setName(e.target.value)} placeholder="King Kitty" autoComplete="off"/>{screen==="join"&&<><label htmlFor="room-code">ROOM CODE</label><input id="room-code" className="code-input" maxLength={6} value={joinCode} onChange={e=>setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z2-9]/g,""))} placeholder="ABC234" autoCapitalize="characters" autoComplete="off"/></>}<button className="gold-button" disabled={busy||(screen==="join"&&joinCode.length!==6)} type="submit">{busy?"Please wait…":screen==="host"?"CREATE ROOM":"JOIN ROOM"}<span>→</span></button></form><ImageButton asset="back" label="Back to main menu" small onClick={()=>navigate("menu")}/></section>}
    {screen==="lobby"&&room&&<section className="panel lobby-panel"><p className="eyebrow">THE STARTING LINE</p><h2>Your alley crew.</h2><div className="room-code"><div><span>ROOM CODE</span><strong>{room.code}</strong></div><button onClick={()=>void copyInvite()}>{copied?"COPIED":"COPY LINK"}</button></div><p className="subtle">Tap Ready when you want to play. Changed your mind? Tap Not Ready. The host starts when everyone is ready.</p><ul className="racers">{room.players.map(p=><li key={p.id}><span className="cat-mini" style={{backgroundImage:`url(${catAsset(p.skin)})`}} aria-hidden="true"/><span>{p.name}{p.id===room.host&&<small>HOST</small>}{p.id===identity?.id&&<small>YOU</small>}</span><b className={p.ready?"ready-status":"waiting-status"}>{p.ready?"READY":"NOT READY"}</b></li>)}</ul><p className="subtle">{room.players.length} / 8 racers{room.players.length<2?" · Invite at least one friend to start":""}</p><div className="lobby-actions"><button className={`gold-button ${me?.ready?"is-ready":""}`} onClick={()=>void api("ready",{ready:!me?.ready})}>{me?.ready?"NOT READY":"READY"}</button>{host&&<ImageButton asset="start-game" label="Start the race" disabled={room.players.length<2||room.players.some(p=>!p.ready)} onClick={()=>void api("start")}/>}</div>{!host&&<p className="subtle">Wait for the host to start.</p>}<button className="quiet-link" onClick={()=>void leave()}>Leave room</button>{!online&&<p role="status">Reconnecting to the alley…</p>}</section>}
    {screen==="race"&&room&&<section className={`race-layout ${room.mode==="local"?"split-race":""}`}><div className="race-top"><span>{room.mode==="online"?`ROOM ${room.code}`:room.mode==="local"?"LOCAL TWO-CAT RACE":"SOLO PRACTICE"}</span><span>JUMP · GRAB · CLAIM THE CROWN</span><button onClick={toggleMenu} aria-label="Open race menu">Ⅱ MENU</button></div>{(room.mode==="local"?[0,1]:[0]).map((index)=><div className="race-view" key={index}><canvas ref={el=>{canvases.current[index]=el;}} aria-label={`King Kitty race ${index+1}: moving alley, obstacles, and boosts`}/><div className="touch-controls"><button onPointerDown={e=>{e.preventDefault();move("jump",index);}} onClick={e=>{if(e.detail===0)move("jump",index);}} aria-label={`Jump${index?" player two":""}`}><b>↑</b> JUMP <kbd>{index?"↑":"SPACE"}</kbd></button><button onPointerDown={e=>{e.preventDefault();move("grab",index);}} onClick={e=>{if(e.detail===0)move("grab",index);}} aria-label={`Grab${index?" player two":""}`}><b>✦</b> GRAB <kbd>{index?"→":"E"}</kbd></button></div></div>)}<div className="race-footer"><span>Obstacles slow you. Nothing knocks you out.</span><span className={online?"connection":"connection disconnected"}>{room.mode==="online"?(online?"● CONNECTED":"○ RECONNECTING…"):"● LOCAL RACE"}</span></div>{menuOpen&&<div className="modal-scrim"><section className="panel pause-panel"><div className="pause-art" aria-hidden="true"/><p className="eyebrow">A QUICK CAT BREAK</p><h2>{room.mode==="online"?"The race keeps running.":"Game paused."}</h2><p>{room.mode==="online"?"Online races keep going. Tap Continue to return.":"Tap Continue when you’re ready."}</p><ImageButton asset="continue" label="Continue racing" onClick={toggleMenu}/><ImageButton asset="quit" label="Quit race" onClick={()=>void leave()}/><button className="quiet-link" onClick={saveGameplay}>Save gameplay screenshot</button></section></div>}</section>}
    {screen==="results"&&room&&<section className="panel results-panel"><div className="winner-art" role="img" aria-label={`${winner?.name||"Winner"} as a ${CATS.find(c=>c.id===validCat(winner?.skin))?.name}`} style={{backgroundImage:`url(${catAsset(winner?.skin)})`}}/><p className="eyebrow">{tied?"A PHOTO FINISH":room.mode==="practice"?"PRACTICE COMPLETE":"THE ALLEY HAS A WINNER"}</p><h2>{tied?"It’s a tie!":winner?`${winner.name} takes it!`:"Race complete."}</h2><p>{tied?"It’s a tie! Race again for one winner.":"Fastest time wins. Try again to beat your time."}</p><ol className="results-list">{ranking.map((p,i)=><li key={p.id}><span className="result-racer" style={{color:p.color}}><span className="cat-mini" style={{backgroundImage:`url(${catAsset(p.skin)})`}} aria-hidden="true"/>{i+1}. {p.name}</span><strong>{p.finish===null?(p.left?"LEFT RACE":"DNF"):`${(p.finish/1000).toFixed(2)}s`}</strong><small>{p.collected.length} boosts · {p.hits.length} bumps</small></li>)}</ol>{room.mode==="online"?(host?<button className="gold-button" onClick={()=>void api("rematch")}>RACE AGAIN</button>:<p className="subtle">Wait for the host to start another race.</p>):<button className="gold-button" onClick={()=>practice(room.mode==="local")}>RACE AGAIN</button>}<ImageButton asset="main-menu" label="Return to main menu" small onClick={()=>void leave()}/></section>}
    {screen==="cats"&&<section className="panel cats-panel"><p className="eyebrow">YOUR CAT. YOUR CROWN.</p><h2>Choose your cat.</h2><p>Same speed. Same moves. Pick your favorite.</p><div className="cat-player-tabs"><button className="quiet-link" aria-pressed={editingCat===0} onClick={()=>setEditingCat(0)}>Your cat</button><button className="quiet-link" aria-pressed={editingCat===1} onClick={()=>setEditingCat(1)}>Player 2</button></div><p className="subtle">{editingCat===0?"Used for your solo and online races.":"Used by the second player on this keyboard."}</p><div className="cat-choices">{CATS.map(cat=><div className="cat-option" key={cat.id}><div className="cat-portrait" role="img" aria-label={cat.name} style={{backgroundImage:`url(${cat.asset})`}}/><button className="quiet-link" aria-label={`Choose ${cat.name}`} aria-pressed={(editingCat===0?skin:secondSkin)===cat.id} onClick={()=>chooseCat(cat.id)}>{cat.name}{(editingCat===0?skin:secondSkin)===cat.id?" ✓":""}</button></div>)}</div><p className="subtle" role="status">Selected: {CATS.find(c=>c.id===(editingCat===0?skin:secondSkin))?.name}</p><ImageButton asset="back" label="Done choosing cat" small onClick={()=>navigate(catReturn)}/></section>}
    {screen==="tutorial"&&art&&<Tutorial art={art} name={name} skin={skin} onBack={()=>navigate("menu")} onPlay={()=>practice()}/>}
    {screen==="controls"&&<section className="panel controls-panel"><p className="eyebrow">HOW TO PLAY</p><h2>Three simple rules.</h2><div className="rule"><b>01</b><div><h3>Jump over obstacles.</h3><p>Tap Jump or press Space. A bump slows you down. You stay in the race.</p></div></div><div className="rule"><b>02</b><div><h3>Grab mice and birds.</h3><p>Tap Grab or press E near a mouse. For birds, jump first, then grab in the air. Each catch gives you a short speed boost.</p></div></div><div className="rule"><b>03</b><div><h3>Finish first.</h3><p>Your cat runs automatically. Everyone starts together. First to the finish wins.</p></div></div><p className="subtle">Two players on one keyboard: Player 1 uses W to jump and E to grab. Player 2 uses ↑ to jump and → to grab.</p><button className="gold-button" disabled={!art} onClick={()=>navigate("tutorial")}>TRY THE TUTORIAL</button><ImageButton asset="back" label="Back to main menu" small onClick={()=>navigate("menu")}/></section>}
    {screen==="settings"&&<section className="panel settings-panel"><p className="eyebrow">MAKE YOURSELF AT HOME</p><h2>Settings.</h2><div className="setting-row"><div><h3>Game sounds</h3><p>Sounds when you jump and grab.</p></div><button className="toggle" role="switch" aria-label="Game sounds" aria-checked={sound} onClick={()=>changeSound(!sound)}>{sound?"ON":"OFF"}<span/></button></div><label htmlFor="volume">VOLUME · {Math.round(volume*100)}%</label><input id="volume" type="range" min="0" max="1" step=".05" value={volume} onChange={e=>{setVolume(Number(e.target.value));localStorage.setItem("king-kitty-sound",JSON.stringify({sound,volume:Number(e.target.value)}));}}/><p className="subtle">Buttons gently float. Your device’s Reduce Motion setting turns this off.</p><ImageButton asset="back" label="Back to main menu" small onClick={()=>navigate("menu")}/></section>}
    {screen!=="race"&&<footer className="page-footer"><span>AN ALLEY RACE BY SAMANTHA & HER CREW</span><span>v0.2 · ALLEY EDITION</span></footer>}
  </main>;
}
