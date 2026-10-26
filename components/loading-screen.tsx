import { catAsset, type CatSkin } from '@/lib/cats';
export default function LoadingScreen({label,skin='tuxedo',inline=false}:{label:string;skin?:CatSkin;inline?:boolean}){
 return <div className={`loading-screen ${inline?'loading-inline':''}`} role="status" aria-live="polite"><div className="loading-art" aria-hidden="true"/><div className="loading-content"><p className="eyebrow">KING KITTY</p><div className="loading-cat" style={{backgroundImage:`url(${catAsset(skin)})`}} aria-hidden="true"/><div className="paw-trail" aria-hidden="true"><span>🐾</span><span>🐾</span><span>🐾</span></div><h2>{label}</h2><p>Getting your paws ready<span className="loading-dots">…</span></p></div></div>;
}
