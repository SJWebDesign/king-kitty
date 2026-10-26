"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { drawRace, type GameArt } from "@/lib/renderer";
import { type CatSkin } from "@/lib/cats";
import { tutorialRoom, tutorialAction, advanceTutorial } from "@/lib/tutorial";

const steps = [
  {title:"Jump over a crate.", hint:"Your cat runs for you. Tap Jump or press Space.", success:"Nice jump! Bumps only slow you down."},
  {title:"Grab a running mouse.", hint:"Tap Grab or press E when a mouse is close.", success:"Got it! A catch gives you a short speed boost."},
  {title:"Jump, then grab a bird.", hint:"Birds fly higher. Jump first. Then tap Grab while you’re in the air.", success:"You caught it! Jump and grab to catch birds."},
  {title:"Reach the finish.", hint:"Everyone starts together. The first cat to finish wins.", success:"You’re ready to race!"}
];
export default function Tutorial({art,name,skin,onBack,onPlay}:{art:GameArt;name:string;skin:CatSkin;onBack:()=>void;onPlay:()=>void}) {
  const [step,setStep]=useState(0),[done,setDone]=useState(false),[retry,setRetry]=useState(false),[airWait,setAirWait]=useState(false);
  const canvas=useRef<HTMLCanvasElement|null>(null),room=useRef(tutorialRoom(0,name,skin));
  const playing=useRef(false),elapsed=useRef(0),completed=useRef(false),birdGrabbed=useRef(false);
  const reset=useCallback((next:number)=>{
    room.current=tutorialRoom(next,name,skin);elapsed.current=0;playing.current=next===3;completed.current=false;birdGrabbed.current=false;
    setStep(next);setDone(false);setRetry(false);setAirWait(false);
  },[name,skin]);
  const act=useCallback((action:"jump"|"grab")=>{
    if(completed.current||step===3||(playing.current&&step!==2))return;
    if(step===2&&action==="grab"&&room.current.players[0].y<10)return;
    if(tutorialAction(room.current,step,action)){
      if(step===2&&action==="grab"){birdGrabbed.current=true;setAirWait(false);}
      playing.current=true;setRetry(false);
    }
  },[step]);
  useEffect(()=>{
    let frame:number,last=performance.now();
    const paint=(time:number)=>{
      const delta=Math.min(40,time-last);last=time;
      if(playing.current&&!completed.current){
        elapsed.current+=delta;
        const outcome=advanceTutorial(room.current,step,elapsed.current);
        if(step===2&&!birdGrabbed.current&&room.current.players[0].y>=75){playing.current=false;setAirWait(true);}
        if(outcome==="done"){completed.current=true;playing.current=false;setDone(true);}
        if(outcome==="retry"){room.current=tutorialRoom(step,name,skin);elapsed.current=0;playing.current=false;birdGrabbed.current=false;setRetry(true);setAirWait(false);}
      }
      if(canvas.current)drawRace(canvas.current,room.current,"learner",art,room.current.startAt+room.current.tick,false,true);
      frame=requestAnimationFrame(paint);
    };
    frame=requestAnimationFrame(paint);return()=>cancelAnimationFrame(frame);
  },[art,step,name,skin]);
  useEffect(()=>{
    const key=(event:KeyboardEvent)=>{
      if(event.repeat)return;
      if((step===0||step===2)&&["Space","KeyW","ArrowUp"].includes(event.code)){event.preventDefault();act("jump");}
      if((step===1||step===2)&&["KeyE","KeyG","ArrowRight"].includes(event.code)){event.preventDefault();act("grab");}
    };
    window.addEventListener("keydown",key);return()=>window.removeEventListener("keydown",key);
  },[act,step]);
  return <section className="tutorial-panel panel">
    <p className="eyebrow">TUTORIAL · {step+1} OF 4</p>
    <ol className="lesson-steps" aria-label="Tutorial steps">{["Jump","Mouse","Bird","Finish"].map((label,index)=><li key={label} aria-current={index===step?"step":undefined} className={index<step?"complete":""}><span>{index<step?"✓":index+1}</span>{label}</li>)}</ol>
    <h2>{steps[step].title}</h2><p>{steps[step].hint}</p>
    <div className="tutorial-stage"><canvas ref={canvas} aria-label={`Practice ${["jumping","grabbing a mouse","catching a bird","finishing"][step]} in the alley`}/></div>
    <p className="lesson-feedback" role="status" aria-live="polite">{done?steps[step].success:airWait?"Now tap Grab while you’re in the air.":retry?"Try again. Jump first, then grab close to the bird.":step===3?"Keep going… the finish is just ahead.":"Take your time. Tap when you’re ready."}</p>
    <div className="lesson-actions">{done?<button className="gold-button" onClick={()=>step<3?reset(step+1):onPlay()}>{step<3?"NEXT":"PLAY A RACE"}</button>:<>{(step===0||step===2)&&<button className="gold-button lesson-action" aria-label="Jump" onClick={()=>act("jump")}>JUMP<kbd>SPACE</kbd></button>}{(step===1||step===2)&&<button className={`gold-button lesson-action ${airWait?"lesson-highlight":""}`} aria-label="Grab" onClick={()=>act("grab")}>GRAB<kbd>E</kbd></button>}</>}</div>
    <div className="lesson-links"><button className="quiet-link" onClick={onBack}>Main menu</button>{step>0&&<button className="quiet-link" onClick={()=>reset(0)}>Start over</button>}</div>
  </section>;
}
