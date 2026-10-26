"use client";
import { useEffect, useState } from 'react';
import { catAsset, type CatSkin } from '@/lib/cats';
import LoadingScreen from './loading-screen';
type Entry={profile_id:string;name:string;bestTime:number;wins:number;races:number;skin:CatSkin;mode:string};
const modes=[['all','All modes'],['online','Online'],['practice','Solo'],['local','Local']] as const;
export default function Leaderboard({skin,onBack}:{skin:CatSkin;onBack:()=>void}){
 const [mode,setMode]=useState('all'),[offset,setOffset]=useState(0),[refresh,setRefresh]=useState(0),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const [data,setData]=useState<{entries:Entry[];total:number;nextOffset:number|null}>({entries:[],total:0,nextOffset:null});
 useEffect(()=>{const abort=new AbortController();setLoading(true);setError('');
  void(async()=>{try{const [res]=await Promise.all([fetch(`/api/leaderboard?mode=${mode}&offset=${offset}`,{signal:abort.signal}),new Promise(r=>setTimeout(r,650))]);const next=await res.json() as typeof data&{error?:string};if(!res.ok)throw new Error(next.error||'Please try again.');if(!abort.signal.aborted)setData(next);}catch(e){if(!abort.signal.aborted)setError(e instanceof Error?e.message:'Please try again.');}finally{if(!abort.signal.aborted)setLoading(false);}})();return()=>abort.abort();
 },[mode,offset,refresh]);
 return <section className="leaderboard-stage" aria-labelledby="leaderboard-title">
  <div className="leaderboard-intro">
   <p className="eyebrow">THE ALLEY HALL OF FAME</p><h2 id="leaderboard-title">All-Time <br/>Leaderboard</h2>
   <p>Quick paws earn a place on the board.<br/>Your fastest finish stays here.</p>
   <div className="leaderboard-tabs" aria-label="Filter race records">{modes.map(([value,label])=><button key={value} className="quiet-link" aria-pressed={mode===value} onClick={()=>{setMode(value);setOffset(0);}}>{label}</button>)}</div>
   <p className="subtle">All race modes count. Wins come from races with other players.</p>
   <div className="leaderboard-actions"><button className="quiet-link" onClick={onBack}>Main menu</button><button className="quiet-link" onClick={()=>setRefresh(r=>r+1)} disabled={loading}>Refresh</button></div>
   <div className="leaderboard-pages">{offset>0&&<button className="quiet-link" disabled={loading} onClick={()=>setOffset(Math.max(0,offset-25))}>Previous</button>}{data.nextOffset!==null&&<button className="quiet-link" disabled={loading} onClick={()=>setOffset(data.nextOffset!)}>Next</button>}<span aria-live="polite">{loading?'Finding racers…':`${data.total} racers`}</span></div>
   <p className="subtle leaderboard-privacy">Use a nickname you’re happy to share.<br/>This browser remembers your racer.</p>
  </div>
  <div className="leaderboard-board"><div className="leaderboard-inscription" aria-busy={loading}>
   <p className="board-caption">{modes.find(m=>m[0]===mode)?.[1]} · fastest cats</p>
   {loading?<LoadingScreen label="Finding the fastest cats" skin={skin} inline/>:error?<div className="leaderboard-error" role="alert"><p>{error}</p><button className="quiet-link" onClick={()=>setRefresh(r=>r+1)}>Try again</button></div>:<div className="leaderboard-scroll" tabIndex={0} role="region" aria-label="Scroll race records" key={`${mode}-${offset}-${refresh}`}>
    <div className="leaderboard-table" role="table" aria-label="All-time race records"><div className="leaderboard-row leaderboard-heading" role="row"><span role="columnheader">Racer</span><span role="columnheader">Best time</span></div>
    {data.entries.map((entry,i)=><div className="leaderboard-row" role="row" key={entry.profile_id}><div className="leaderboard-racer" role="cell"><b>{offset+i+1}</b><span className="cat-mini" style={{backgroundImage:`url(${catAsset(entry.skin)})`}} aria-hidden="true"/><span title={entry.name}>{entry.name}<small>{entry.wins} wins · {entry.races} {entry.races===1?'race':'races'}</small></span></div><strong role="cell">{(entry.bestTime/1000).toFixed(2)}s<small>{modes.find(m=>m[0]===entry.mode)?.[1]}</small></strong></div>)}
    </div>{!data.entries.length&&<p className="empty-board">The crown is waiting.<br/>Finish a race to add your time.</p>}
   </div>}
  </div></div>
 </section>;
}
