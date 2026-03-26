"use client";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";

// ─── SHARED DATA ──────────────────────────────────────────────────────────────
function getUsers(){try{return JSON.parse(localStorage.getItem("cp6_users")||"null")||INITIAL_USERS;}catch{return INITIAL_USERS;}}
function getFandoms(){try{return JSON.parse(localStorage.getItem("cp6_fandoms")||"null")||DEFAULT_FANDOMS;}catch{return DEFAULT_FANDOMS;}}
function getSearchCounts(){try{return JSON.parse(localStorage.getItem("cp6_sc")||"{}");}catch{return{};}}
function incrementSearch(f){const c=getSearchCounts();c[f]=(c[f]||0)+1;localStorage.setItem("cp6_sc",JSON.stringify(c));}
function getTopFandoms(fandoms,n=12){const c=getSearchCounts();return[...fandoms].sort((a,b)=>(c[b]||0)-(c[a]||0)).slice(0,n);}

const DEFAULT_FANDOMS=["Genshin Impact","Honkai Star Rail","Blue Archive","Hololive","Nijisanji","Attack on Titan","Demon Slayer","Jujutsu Kaisen","One Piece","Naruto","BTS","ENHYPEN","SEVENTEEN","Stray Kids","NewJeans","Valorant","League of Legends","Minecraft","Elden Ring","Final Fantasy","My Hero Academia","Spy x Family","Chainsaw Man","Frieren","Bocchi the Rock","Vtuber Original","Original Art","Webtoon","Light Novel","Cosplay","Arknights","Honkai Impact","Gachiakuta","Gakuen Idolmaster","Arknights Endfield"];

const INITIAL_USERS=[
  {id:1,name:"Kusuma",   email:"kusuma@mail.com", password:"user123",role:"user",      booths:["A16"],              fandoms:["Genshin Impact","Original Art"]},
  {id:2,name:"Bagas",    email:"bagas@mail.com",  password:"user123",role:"user",      booths:["A17"],              fandoms:["Attack on Titan"]},
  {id:3,name:"Wijaya",   email:"wijaya@mail.com", password:"user123",role:"user",      booths:["D16","D01"],        fandoms:["Naruto","One Piece"]},
  {id:4,name:"Neko Wae", email:"neko@mail.com",   password:"user123",role:"user",      booths:["G26","G27","G28","G29"],fandoms:["Hololive","Vtuber Original"]},
  {id:5,name:"Admin",    email:"admin@comipara.com",password:"admin123",role:"admin",  booths:[],fandoms:[]},
  {id:6,name:"SuperAdmin",email:"super@comipara.com",password:"super123",role:"super_admin",booths:[],fandoms:[]},
];

// ─── GEOMETRY ─────────────────────────────────────────────────────────────────
const LETTERS=["A","B","C","D","E","F","G","H","I","J","K","L","M"];
const pad=n=>String(n).padStart(2,"0");
const BW=30,BH=22,BG=2;
const INNER=3;   // gap between left/right sub-col within cluster
const AISLE=30;  // walkable corridor between clusters (wider = clearer gap)
const SX=70;     // canvas start X
const ROW_Y=20;  // N/O row Y
const UY=68;     // upper cluster Y
const LY=345;    // lower cluster Y (gap between upper/lower)
const CW_CLUSTER=2*(BW+INNER)+AISLE; // width per cluster slot

function buildPositions(){
  const pos={};
  // Row N: N01-N16 in pairs aligned with clusters A-H
  for(let i=1;i<=16;i++){
    const pi=Math.floor((i-1)/2),si=(i-1)%2;
    const clX=SX+pi*CW_CLUSTER;
    pos["N"+pad(i)]={cx:clX+si*(BW+INNER)+BW/2,cy:ROW_Y+BH/2};
  }
  // Row O: O01-O18 aligned with clusters H-M (right side)
  const OX=SX+7*CW_CLUSTER;
  for(let i=1;i<=18;i++){
    const pi=Math.floor((i-1)/2),si=(i-1)%2;
    pos["O"+pad(i)]={cx:OX+pi*CW_CLUSTER+si*(BW+INNER)+BW/2,cy:ROW_Y+BH/2};
  }
  // Main clusters A-M
  LETTERS.forEach((l,li)=>{
    const clX=SX+li*CW_CLUSTER;
    const lx=clX,rx=clX+BW+INNER;
    // Upper: left col 16->9, right col 17->24
    [16,15,14,13,12,11,10,9].forEach((n,ri)=>{pos[l+pad(n)]={cx:lx+BW/2,cy:UY+ri*(BH+BG)+BH/2};});
    [17,18,19,20,21,22,23,24].forEach((n,ri)=>{pos[l+pad(n)]={cx:rx+BW/2,cy:UY+ri*(BH+BG)+BH/2};});
    // Lower: left col 8->1, right col 25->32
    [8,7,6,5,4,3,2,1].forEach((n,ri)=>{pos[l+pad(n)]={cx:lx+BW/2,cy:LY+ri*(BH+BG)+BH/2};});
    [25,26,27,28,29,30,31,32].forEach((n,ri)=>{pos[l+pad(n)]={cx:rx+BW/2,cy:LY+ri*(BH+BG)+BH/2};});
  });
  // P zone
  const PX=SX+LETTERS.length*CW_CLUSTER+20;
  const pg=[[[14,15],[13,16],[12,17],[11,18],[10,19]],[[9,20],[8,21],[7,22],[6,23]],[[5,24],[4,25],[3,26],[2,27],[1,28]]];
  let pr=0;
  pg.forEach((g,gi)=>{if(gi>0)pr+=1.5;g.forEach(([l,r])=>{const cy=UY+pr*(BH+BG)+BH/2;pos["P"+pad(l)]={cx:PX+BW/2,cy};pos["P"+pad(r)]={cx:PX+BW+INNER+BW/2,cy};pr++;});});
  return pos;
}
const POS=buildPositions();
const CW=Math.max(...Object.values(POS).map(p=>p.cx))+130;
const CH=Math.max(...Object.values(POS).map(p=>p.cy))+185;

// ─── AISLE WAYPOINTS ──────────────────────────────────────────────────────────
// Aisles = vertical corridors between clusters + horizontal lanes
const A_TOP_Y   = UY-20;
const A_MID_Y   = (UY+8*(BH+BG)+LY)/2;
const A_BOT_Y   = LY+8*(BH+BG)+18;
const A_TIERS   = [A_TOP_Y, A_MID_Y, A_BOT_Y];

// X center of each aisle (AISLE/2 past right edge of each cluster)
const AISLE_XS=[];
for(let li=0;li<=LETTERS.length;li++){
  const clX=SX+li*CW_CLUSTER;
  // Aisle center is between cluster li-1 right edge and cluster li left edge
  AISLE_XS.push(clX-AISLE/2);
}
// P-zone aisle
AISLE_XS.push(SX+LETTERS.length*CW_CLUSTER+10);

const AISLE_NODES={};
AISLE_XS.forEach((ax,ai)=>{
  A_TIERS.forEach((ay,ti)=>{
    AISLE_NODES[`_a${ai}_${ti}`]={cx:ax,cy:ay};
  });
});

const ALL_NODES={...POS,...AISLE_NODES};

// ─── GRAPH ────────────────────────────────────────────────────────────────────
function getAllBooths(){
  const ids=[];
  for(let i=1;i<=16;i++) ids.push("N"+pad(i));
  for(let i=1;i<=18;i++) ids.push("O"+pad(i));
  LETTERS.forEach(l=>{for(let n=1;n<=32;n++) ids.push(l+pad(n));});
  for(let i=1;i<=28;i++) ids.push("P"+pad(i));
  return ids;
}
const ALL_BOOTHS=getAllBooths();

function buildGraph(){
  const g={};
  Object.keys(ALL_NODES).forEach(id=>{g[id]=[];});

  // Connect aisle nodes: horizontal (same tier, adjacent cols) & vertical (same col, adjacent tiers)
  for(let ai=0;ai<AISLE_XS.length;ai++){
    for(let ti=0;ti<A_TIERS.length;ti++){
      const cur=`_a${ai}_${ti}`;
      // vertical neighbor
      if(ti+1<A_TIERS.length){
        const nb=`_a${ai}_${ti+1}`;
        const d=Math.abs(A_TIERS[ti]-A_TIERS[ti+1]);
        g[cur].push({id:nb,d});g[nb].push({id:cur,d});
      }
      // horizontal neighbor
      if(ai+1<AISLE_XS.length){
        const nb=`_a${ai+1}_${ti}`;
        const d=Math.abs(AISLE_XS[ai]-AISLE_XS[ai+1]);
        g[cur].push({id:nb,d});g[nb].push({id:cur,d});
      }
    }
  }

  // Connect each booth to the 1-2 nearest aisle columns
  ALL_BOOTHS.forEach(bid=>{
    const bp=POS[bid];if(!bp)return;
    // Find nearest aisle column(s)
    const sorted=AISLE_XS.map((ax,ai)=>({ai,dx:Math.abs(bp.cx-ax)})).sort((a,b)=>a.dx-b.dx);
    sorted.slice(0,2).forEach(({ai,dx})=>{
      if(dx>CW_CLUSTER*1.5)return; // don't connect to far aisles
      A_TIERS.forEach((ay,ti)=>{
        const aid=`_a${ai}_${ti}`;
        const d=Math.hypot(bp.cx-AISLE_XS[ai],bp.cy-ay);
        g[bid].push({id:aid,d});g[aid].push({id:bid,d});
      });
    });
  });
  return g;
}
const GRAPH=buildGraph();

function aStar(start,goal){
  if(start===goal)return[start];
  if(!ALL_NODES[start]||!ALL_NODES[goal])return[];
  const h=(a,b)=>{const pa=ALL_NODES[a],pb=ALL_NODES[b];return pa&&pb?Math.hypot(pa.cx-pb.cx,pa.cy-pb.cy):0;};
  const open=new Set([start]),from={},gS={[start]:0},fS={[start]:h(start,goal)};
  while(open.size){
    let cur=null,lf=Infinity;
    open.forEach(id=>{const v=fS[id]??Infinity;if(v<lf){lf=v;cur=id;}});
    if(cur===goal){const p=[goal];let n=goal;while(from[n]){n=from[n];p.unshift(n);}return p;}
    open.delete(cur);
    for(const{id:nb,d}of(GRAPH[cur]||[])){
      const tg=(gS[cur]??Infinity)+d;
      if(tg<(gS[nb]??Infinity)){from[nb]=cur;gS[nb]=tg;fS[nb]=tg+h(nb,goal);open.add(nb);}
    }
  }
  return[start,goal];
}

function svgPath(ids){
  if(ids.length<2)return"";
  const pts=ids.map(id=>ALL_NODES[id]).filter(Boolean);
  if(pts.length<2)return"";
  let d=`M${pts[0].cx},${pts[0].cy}`;
  for(let i=1;i<pts.length-1;i++){const mx=(pts[i].cx+pts[i+1].cx)/2,my=(pts[i].cy+pts[i+1].cy)/2;d+=` Q${pts[i].cx},${pts[i].cy} ${mx},${my}`;}
  return d+` L${pts[pts.length-1].cx},${pts[pts.length-1].cy}`;
}

// ─── TENANTS ─────────────────────────────────────────────────────────────────
function buildTenants(users){
  const t={};
  users.forEach(u=>{
    if(!u.booths?.length)return;
    const catalog=JSON.parse(localStorage.getItem(`cp6_catalog_${u.id}`)||"[]");
    const prices=JSON.parse(localStorage.getItem(`cp6_prices_${u.id}`)||"[]");
    u.booths.forEach(b=>{t[b]={userId:u.id,user:u.name,fandoms:u.fandoms,catalog,prices,allBooths:u.booths};});
  });
  return t;
}

// ─── BOOTH RECT ───────────────────────────────────────────────────────────────
function BoothRect({id,state,onClick}){
  const p=POS[id];if(!p)return null;
  const C={
    empty:    {fill:"#F8FAFC",stroke:"#CBD5E1",text:"#94A3B8"},
    occupied: {fill:"#F3E8FF",stroke:"#D8B4FE",text:"#9333EA"},
    matched:  {fill:"#7C3AED",stroke:"#5B21B6",text:"#FFF"},
    selected: {fill:"#A78BFA",stroke:"#7C3AED",text:"#FFF"},
    pathStart:{fill:"#10B981",stroke:"#047857",text:"#FFF"},
    pathEnd:  {fill:"#EF4444",stroke:"#B91C1C",text:"#FFF"},
    onPath:   {fill:"#F59E0B",stroke:"#D97706",text:"#FFF"},
  }[state]||{fill:"#F8FAFC",stroke:"#CBD5E1",text:"#94A3B8"};
  return(
    <g onClick={()=>onClick(id)} style={{cursor:"pointer"}} className="group">
      <rect x={p.cx-BW/2} y={p.cy-BH/2} width={BW} height={BH} rx={4} fill={C.fill} stroke={C.stroke} strokeWidth={1} className="transition-all duration-150 group-hover:brightness-95"/>
      <text x={p.cx} y={p.cy} textAnchor="middle" dominantBaseline="central" fontSize={6.5} fontWeight={700} fill={C.text} fontFamily="system-ui,sans-serif" style={{userSelect:"none",pointerEvents:"none"}}>{id}</text>
    </g>
  );
}

// ─── MODAL ────────────────────────────────────────────────────────────────────
function BoothModal({boothId,tenant,onClose,onNavigate}){
  const[idx,setIdx]=useState(0);
  const cat=tenant?.catalog||[],prices=tenant?.prices||[];
  return(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"/>
      <div className="relative bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden" style={{animation:"slideUp .3s cubic-bezier(.16,1,.3,1) forwards"}} onClick={e=>e.stopPropagation()}>
        <div className="flex justify-center pt-3 sm:hidden"><div className="w-10 h-1 bg-gray-200 rounded-full"/></div>
        <div className="shrink-0 px-6 py-4 border-b border-gray-100">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xl font-extrabold text-gray-900">Booth {boothId}</span>
                <span className="text-xs px-2.5 py-1 bg-violet-100 text-violet-700 font-semibold border border-violet-200 rounded-full">{tenant?.user}</span>
              </div>
              {tenant?.allBooths?.length>1&&(
                <div className="flex gap-1 mt-1.5 flex-wrap">
                  {tenant.allBooths.map(b=><span key={b} className={`text-[10px] px-2 py-0.5 rounded font-bold border ${b===boothId?"bg-violet-600 border-violet-600 text-white":"bg-violet-50 border-violet-200 text-violet-700"}`}>{b}</span>)}
                </div>
              )}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {tenant?.fandoms.map(f=><span key={f} className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full font-medium">{f}</span>)}
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 shrink-0 ml-2 transition-colors">✕</button>
          </div>
        </div>
        <div className="overflow-y-auto px-6 py-4 space-y-5 flex-1">
          <button onClick={()=>{onNavigate(boothId);onClose();}} className="w-full py-3 bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm shadow-violet-200">🗺️ Tampilkan Rute ke Booth Ini</button>
          <div>
            <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">Katalog<div className="h-px bg-gray-100 flex-1"/></h3>
            {cat.length===0
              ?<div className="text-center py-8 bg-gray-50 border border-dashed border-gray-200 rounded-2xl"><div className="text-3xl opacity-30 mb-2">🖼️</div><p className="text-xs text-gray-400">Belum ada katalog</p></div>
              :<div className="space-y-3">
                <div className="rounded-2xl overflow-hidden bg-gray-100 aspect-square"><img src={cat[idx]?.url||cat[idx]} alt="catalog" className="w-full h-full object-cover"/></div>
                {cat.length>1&&<div className="flex gap-2 overflow-x-auto pb-1">{cat.map((img,i)=><button key={i} onClick={()=>setIdx(i)} className={`shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${i===idx?"border-violet-500":"border-transparent opacity-60 hover:opacity-100"}`}><img src={img?.url||img} alt="" className="w-full h-full object-cover"/></button>)}</div>}
              </div>
            }
          </div>
          <div className="pb-4">
            <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">Daftar Harga<div className="h-px bg-gray-100 flex-1"/></h3>
            {prices.length===0
              ?<div className="text-center py-6 bg-gray-50 border border-dashed border-gray-200 rounded-2xl"><p className="text-xs text-gray-400">Belum ada daftar harga</p></div>
              :<div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50"><tr><th className="text-left py-2.5 px-4 text-xs text-gray-500 font-semibold uppercase tracking-wider">Item</th><th className="text-right py-2.5 px-4 text-xs text-gray-500 font-semibold uppercase tracking-wider">Harga</th></tr></thead>
                  <tbody className="divide-y divide-gray-100">{prices.map((p,i)=><tr key={i} className="hover:bg-gray-50/50"><td className="py-3 px-4 text-gray-800 font-medium">{p.item}</td><td className="py-3 px-4 text-right font-bold text-violet-700">Rp {parseInt(p.price).toLocaleString("id-ID")}</td></tr>)}</tbody>
                </table>
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function FloorMap(){
  const[users,setUsers]=useState([]);
  const[fandoms,setFandoms]=useState(DEFAULT_FANDOMS);
  const[tenants,setTenants]=useState({});
  const[search,setSearch]=useState("");
  const[selFandom,setSelFandom]=useState(null);
  const[suggestions,setSuggestions]=useState([]);
  const[showSugg,setShowSugg]=useState(false);
  const[selectedId,setSelectedId]=useState(null);
  const[modalId,setModalId]=useState(null);
  const[tab,setTab]=useState("search");
  const[pathFrom,setPathFrom]=useState("");
  const[pathTo,setPathTo]=useState("");
  const[fullPath,setFullPath]=useState([]);
  const[dispPath,setDispPath]=useState([]);
  const[showPath,setShowPath]=useState(false);
  const[tx,setTx]=useState(0);
  const[ty,setTy]=useState(0);
  const[scale,setScale]=useState(1);
  const containerRef=useRef(null);
  const lastTouch=useRef(null);
  const lastDist=useRef(null);
  const pinching=useRef(false);
  const clickTimer=useRef(null);
  const searchRef=useRef(null);

  useEffect(()=>{
    const u=getUsers();setUsers(u);setFandoms(getFandoms());setTenants(buildTenants(u));
  },[]);

  useEffect(()=>{
    if(!search.trim()){setSuggestions([]);return;}
    const q=search.toLowerCase(),counts=getSearchCounts();
    setSuggestions(fandoms.filter(f=>f.toLowerCase().includes(q)&&f.toLowerCase()!==q).sort((a,b)=>(counts[b]||0)-(counts[a]||0)).slice(0,8));
  },[search,fandoms]);

  const searchTerm=selFandom||search;
  const isMatch=useCallback(id=>{
    if(!searchTerm)return false;
    const t=tenants[id];if(!t)return false;
    return t.fandoms.some(f=>f.toLowerCase().includes(searchTerm.toLowerCase()));
  },[searchTerm,tenants]);
  const matchedSet=useMemo(()=>new Set(ALL_BOOTHS.filter(isMatch)),[isMatch]);
  const pathBoothSet=useMemo(()=>new Set(dispPath),[dispPath]);
  const topFandoms=useMemo(()=>getTopFandoms(fandoms,12),[fandoms]);

  function clamp(x,y,s,W,H){
    const mw=CW*s,mh=CH*s;
    return{x:mw<W?(W-mw)/2:Math.min(0,Math.max(W-mw,x)),y:mh<H?(H-mh)/2:Math.min(0,Math.max(H-mh,y))};
  }

  // Fit to screen on mount
  useEffect(()=>{
    const el=containerRef.current;if(!el)return;
    const s=Math.min((el.clientWidth-8)/CW,(el.clientHeight-8)/CH,1);
    setScale(s);const c=clamp(0,0,s,el.clientWidth,el.clientHeight);setTx(c.x);setTy(c.y);
  },[]);

  function resetView(){
    const el=containerRef.current;if(!el)return;
    const s=Math.min((el.clientWidth-8)/CW,(el.clientHeight-8)/CH,1);
    setScale(s);const c=clamp(0,0,s,el.clientWidth,el.clientHeight);setTx(c.x);setTy(c.y);
  }

  // Touch & wheel
  useEffect(()=>{
    const el=containerRef.current;if(!el)return;
    const gW=()=>el.clientWidth,gH=()=>el.clientHeight;
    const gd=t=>Math.hypot(t[0].clientX-t[1].clientX,t[0].clientY-t[1].clientY);
    const gm=t=>({x:(t[0].clientX+t[1].clientX)/2,y:(t[0].clientY+t[1].clientY)/2});
    const onTS=e=>{if(e.touches.length===2){pinching.current=true;lastDist.current=gd(e.touches);lastTouch.current=gm(e.touches);e.preventDefault();}else{pinching.current=false;lastTouch.current={x:e.touches[0].clientX,y:e.touches[0].clientY};}};
    const onTM=e=>{
      if(e.touches.length===2){e.preventDefault();const d=gd(e.touches),m=gm(e.touches),ds=d/(lastDist.current||d);
        setScale(ps=>{const ns=Math.min(Math.max(ps*ds,0.25),5);const dx=m.x-(lastTouch.current?.x||m.x),dy=m.y-(lastTouch.current?.y||m.y);setTx(px=>clamp(px+dx,0,ns,gW(),gH()).x);setTy(py=>clamp(0,py+dy,ns,gW(),gH()).y);return ns;});
        lastDist.current=d;lastTouch.current=m;
      }else if(e.touches.length===1&&!pinching.current){
        const dx=e.touches[0].clientX-(lastTouch.current?.x||0),dy=e.touches[0].clientY-(lastTouch.current?.y||0);
        setTx(px=>clamp(px+dx,0,scale,gW(),gH()).x);setTy(py=>clamp(0,py+dy,scale,gW(),gH()).y);
        lastTouch.current={x:e.touches[0].clientX,y:e.touches[0].clientY};
      }
    };
    const onTE=()=>{pinching.current=false;};
    const onW=e=>{
      e.preventDefault();const rect=el.getBoundingClientRect();const mx=e.clientX-rect.left,my=e.clientY-rect.top;const ds=e.deltaY<0?1.12:0.9;
      setScale(ps=>{const ns=Math.min(Math.max(ps*ds,0.25),5);const c=clamp(mx-(mx-tx)*(ns/ps),my-(my-ty)*(ns/ps),ns,gW(),gH());setTx(c.x);setTy(c.y);return ns;});
    };
    el.addEventListener("touchstart",onTS,{passive:false});el.addEventListener("touchmove",onTM,{passive:false});el.addEventListener("touchend",onTE);el.addEventListener("wheel",onW,{passive:false});
    return()=>{el.removeEventListener("touchstart",onTS);el.removeEventListener("touchmove",onTM);el.removeEventListener("touchend",onTE);el.removeEventListener("wheel",onW);};
  },[scale,tx,ty]);

  // Booth click: single=select group, double=modal
  function handleBoothClick(id){
    if(tab==="path"){
      if(!pathFrom){setPathFrom(id);return;}
      if(!pathTo&&id!==pathFrom){setPathTo(id);return;}
    }
    if(clickTimer.current){clearTimeout(clickTimer.current);clickTimer.current=null;if(tenants[id]){setModalId(id);setSelectedId(null);}}
    else{clickTimer.current=setTimeout(()=>{clickTimer.current=null;setSelectedId(prev=>prev===id?null:id);},270);}
  }

  function handleFindPath(){
    if(!pathFrom||!pathTo)return;
    const fp=aStar(pathFrom,pathTo);
    setFullPath(fp);
    setDispPath(fp.filter(id=>!id.startsWith("_a")));
    setShowPath(true);
  }
  function resetPath(){setPathFrom("");setPathTo("");setFullPath([]);setDispPath([]);setShowPath(false);}
  function selectSuggestion(f){incrementSearch(f);setSelFandom(f);setSearch(f);setSuggestions([]);setShowSugg(false);}

  // Selected group: all booths of same user
  const selectedGroup=useMemo(()=>{
    if(!selectedId)return new Set();
    const t=tenants[selectedId];if(!t)return new Set([selectedId]);
    return new Set(t.allBooths||[selectedId]);
  },[selectedId,tenants]);

  function getState(id){
    if(showPath){
      if(id===pathFrom)return"pathStart";
      if(id===pathTo)return"pathEnd";
      if(pathBoothSet.has(id))return"onPath";
    }
    if(matchedSet.has(id))return"matched";
    if(selectedGroup.has(id))return"selected";
    if(tenants[id])return"occupied";
    return"empty";
  }

  // Zone layout sesuai denah
  const LOWER_BOT=LY+8*(BH+BG);
  const STRIP_Y=LOWER_BOT+38;
  const STRIP_H=CH-STRIP_Y-28;
  const RZ_X=CW-112;

  const zones=[
    {label:"Photobooth",x:SX-20,y:STRIP_Y,w:46,h:STRIP_H,f:"#FFFBEB",s:"#FDE68A",t:"#92400E"},
    {label:"Comipara\nGuild Area",x:SX+28,y:STRIP_Y,w:220,h:STRIP_H,f:"#F0F9FF",s:"#BAE6FD",t:"#0284C7"},
    {label:"Comic Class\nArea",x:SX+255,y:STRIP_Y,w:135,h:STRIP_H,f:"#F0FDFA",s:"#99F6E4",t:"#0D9488"},
    {label:"Visitor\nStorage",x:SX+396,y:STRIP_Y,w:88,h:STRIP_H,f:"#F8FAFC",s:"#E2E8F0",t:"#64748B"},
    {label:"Community Zone",x:SX+490,y:STRIP_Y,w:220,h:STRIP_H,f:"#FFF7ED",s:"#FED7AA",t:"#EA580C"},
    {label:"Tabletop\nArea",x:SX+718,y:STRIP_Y+6,w:100,h:STRIP_H-12,f:"#F8FAFC",s:"#E2E8F0",t:"#64748B"},
    {label:"Information",x:SX+105,y:STRIP_Y+STRIP_H-36,w:70,h:18,f:"#EFF6FF",s:"#BFDBFE",t:"#1D4ED8"},
    {label:"Item Shop",x:SX+182,y:STRIP_Y+STRIP_H-36,w:60,h:18,f:"#EFF6FF",s:"#BFDBFE",t:"#1D4ED8"},
    {label:"Ticket Box",x:SX+396,y:STRIP_Y+STRIP_H-22,w:88,h:22,f:"#FEF2F2",s:"#FECACA",t:"#B91C1C"},
    {label:"Charging\nStation",x:SX+555,y:STRIP_Y+STRIP_H-28,w:90,h:22,f:"#F0FDF4",s:"#BBF7D0",t:"#15803D"},
    // Right-side vertical zones — with gap from booths
    {label:"Creative\nZone",x:RZ_X,y:UY-2,w:72,h:8*(BH+BG)+8,f:"#F0FDF4",s:"#BBF7D0",t:"#16A34A"},
    {label:"Exhibitor\nZone",x:RZ_X,y:UY+8*(BH+BG)+16,w:72,h:88,f:"#FDF2F8",s:"#FBCFE8",t:"#DB2777"},
    {label:"Stage",x:RZ_X+78,y:UY+50,w:58,h:110,f:"#FEFCE8",s:"#FDE68A",t:"#92400E"},
    {label:"Cosplay\nReg Zone",x:RZ_X+78,y:LY-16,w:58,h:8*(BH+BG)+30,f:"#FAF5FF",s:"#E9D5FF",t:"#9333EA"},
  ];

  const sp=showPath&&fullPath.length>=2?svgPath(fullPath):"";
  const midY=(UY+8*(BH+BG)+LY)/2;

  return(
    <div className="flex flex-col bg-gray-50 overflow-hidden" style={{height:"100dvh"}}>
      {/* HEADER */}
      <div className="bg-white px-5 py-3 flex items-center justify-between shrink-0 shadow-sm z-20">
        <div>
          <h1 className="text-base font-extrabold text-gray-900 tracking-tight flex items-center gap-2">Comipara 6 <span className="text-[10px] font-semibold tracking-wider uppercase bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full">Map</span></h1>
          <p className="text-[11px] text-gray-500 font-medium mt-0.5">Tap 1× pilih · Tap 2× detail · 2 jari zoom</p>
        </div>
        <button onClick={resetView} className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 active:scale-95 transition-all shadow-sm">Reset View</button>
      </div>

      {/* CONTROLS */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 shrink-0 z-10 space-y-3">
        <div className="flex gap-1 bg-gray-100/80 rounded-lg p-1 w-fit border border-gray-200/60">
          {[["search","🔍 Fandom"],["path","🗺️ Navigasi Jalur"]].map(([t,l])=>(
            <button key={t} onClick={()=>{setTab(t);if(t==="search")resetPath();}}
              className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-all ${tab===t?"bg-white text-gray-900 shadow-sm border border-gray-200/50":"text-gray-500 hover:text-gray-700"}`}>{l}</button>
          ))}
        </div>

        {tab==="search"&&(
          <div className="space-y-2">
            <div className="relative flex gap-2">
              <div className="relative flex-1">
                <input ref={searchRef} value={search} onChange={e=>{setSearch(e.target.value);setSelFandom(null);setShowSugg(true);}} onFocus={()=>setShowSugg(true)} onBlur={()=>setTimeout(()=>setShowSugg(false),150)} placeholder="Ketik fandom... (e.g. Genshin, Holo)" className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-violet-400 transition-shadow"/>
                {showSugg&&suggestions.length>0&&(
                  <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden">
                    {suggestions.map(f=><button key={f} onMouseDown={()=>selectSuggestion(f)} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-violet-50 hover:text-violet-700 flex items-center gap-2 border-b border-gray-50 last:border-0 font-medium"><span className="text-gray-300 text-xs">🔍</span>{f}{(getSearchCounts()[f]||0)>0&&<span className="ml-auto text-[10px] font-bold text-gray-300 bg-gray-100 px-1.5 py-0.5 rounded">{getSearchCounts()[f]}×</span>}</button>)}
                  </div>
                )}
              </div>
              <button onClick={()=>{setSearch("");setSelFandom(null);setSelectedId(null);setSuggestions([]);}} className="px-4 py-2 text-sm font-semibold border border-gray-300 rounded-xl text-gray-600 hover:bg-gray-50 shadow-sm">Reset</button>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-[4rem] overflow-y-auto pb-1">
              {topFandoms.map(f=><button key={f} onClick={()=>selectSuggestion(f)} className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all shadow-sm ${(selFandom===f||search===f)?"bg-violet-600 border-violet-600 text-white":"bg-white border-gray-200 text-gray-600 hover:border-violet-300 hover:bg-violet-50"}`}>{f}</button>)}
            </div>
            {searchTerm&&<p className="text-xs text-gray-500 font-medium">{matchedSet.size>0?<><span className="text-violet-600 font-bold">{matchedSet.size} booth</span> ditemukan untuk "{searchTerm}"</>:<span className="text-rose-500 font-bold">Tidak ada hasil</span>}</p>}
          </div>
        )}

        {tab==="path"&&(
          <div className="space-y-2 bg-gray-50 p-3 rounded-xl border border-gray-100">
            <p className="text-[11px] font-medium text-gray-500">Tap 2 booth di peta atau masukkan ID manual:</p>
            <div className="flex gap-2 flex-wrap items-center">
              <div className="flex items-center gap-2 flex-1 min-w-[110px] bg-white px-2 py-1.5 border border-gray-200 rounded-lg shadow-sm">
                <span className="w-5 h-5 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">A</span>
                <input value={pathFrom} onChange={e=>setPathFrom(e.target.value.toUpperCase())} placeholder="Mulai (e.g. A01)" className="flex-1 text-sm bg-transparent border-none focus:outline-none uppercase font-semibold text-gray-700 placeholder:normal-case placeholder:font-normal"/>
              </div>
              <div className="flex items-center gap-2 flex-1 min-w-[110px] bg-white px-2 py-1.5 border border-gray-200 rounded-lg shadow-sm">
                <span className="w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">B</span>
                <input value={pathTo} onChange={e=>setPathTo(e.target.value.toUpperCase())} placeholder="Tujuan (e.g. M32)" className="flex-1 text-sm bg-transparent border-none focus:outline-none uppercase font-semibold text-gray-700 placeholder:normal-case placeholder:font-normal"/>
              </div>
              <button onClick={handleFindPath} disabled={!pathFrom||!pathTo} className="px-4 py-2.5 text-xs font-bold bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-40 shadow-sm transition-colors">Cari Rute</button>
              <button onClick={resetPath} className="px-3 py-2.5 text-xs font-bold border border-gray-300 bg-white rounded-lg text-gray-600 hover:bg-gray-50 shadow-sm">Reset</button>
            </div>
            {showPath&&dispPath.length>0&&(
              <div className="flex gap-1 flex-wrap items-center pt-1 border-t border-gray-200">
                <span className="text-xs font-medium text-gray-500">{dispPath.length} titik:</span>
                <div className="flex gap-1 flex-wrap max-h-10 overflow-hidden">
                  {dispPath.map((id,i)=><span key={id} className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${i===0?"bg-emerald-100 text-emerald-700":i===dispPath.length-1?"bg-rose-100 text-rose-700":"bg-amber-100 text-amber-700"}`}>{id}</span>)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* LEGEND */}
      <div className="flex gap-4 px-4 py-2 bg-gray-50/80 border-b border-gray-200 shrink-0 overflow-x-auto shadow-inner">
        {[{c:"bg-[#F3E8FF] border border-[#D8B4FE]",l:"Terisi"},{c:"bg-[#7C3AED]",l:"Hasil Cari",t:"text-white"},{c:"bg-[#A78BFA]",l:"Dipilih",t:"text-white"},{c:"bg-[#10B981]",l:"Titik A",t:"text-white"},{c:"bg-[#EF4444]",l:"Titik B",t:"text-white"},{c:"bg-[#F59E0B]",l:"Jalur",t:"text-white"}].map(({c,l,t})=>(
          <div key={l} className="flex items-center gap-1.5 shrink-0">
            <div className={`w-4 h-3.5 rounded-sm ${c} ${t||""}`}/>
            <span className="text-[10px] font-bold tracking-wide uppercase whitespace-nowrap text-gray-600">{l}</span>
          </div>
        ))}
      </div>

      {/* MAP */}
      <div ref={containerRef} className="flex-1 overflow-hidden relative select-none touch-none bg-[#E2E8F0] shadow-inner" style={{minHeight:0}}>
        <svg width="100%" height="100%" style={{display:"block"}}>
          <defs>
            <filter id="shadow"><feDropShadow dx="0" dy="8" stdDeviation="12" floodColor="#0F172A" floodOpacity="0.08"/></filter>
            <pattern id="dotGrid" x="0" y="0" width="16" height="16" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="#CBD5E1" opacity="0.6"/></pattern>
          </defs>
          <g transform={`translate(${tx},${ty}) scale(${scale})`}>
            <rect x={0} y={0} width={CW} height={CH} fill="#FFFFFF" rx={16} filter="url(#shadow)"/>
            <rect x={0} y={0} width={CW} height={CH} fill="url(#dotGrid)" rx={16}/>

            {/* Section labels */}
            <text x={SX} y={13} fontSize={8} fill="#A78BFA" fontWeight={800} letterSpacing={2} fontFamily="system-ui,sans-serif">BARIS N & O</text>
            <text x={SX} y={UY-2} fontSize={8} fill="#A78BFA" fontWeight={800} letterSpacing={2} fontFamily="system-ui,sans-serif">COMIC HALL</text>
            <line x1={SX-10} y1={midY} x2={CW-100} y2={midY} stroke="#CBD5E1" strokeWidth={2} strokeDasharray="8 6"/>
            <text x={(CW-100)/2} y={midY+11} textAnchor="middle" fontSize={7.5} fill="#94A3B8" fontWeight={800} letterSpacing={4} fontFamily="system-ui,sans-serif">CREATOR MERCHANT AREA</text>

            {/* Zones */}
            {zones.map(({label,x,y,w,h,f,s,t},i)=>{
              const lines=label.split("\n");
              return<g key={i}>
                <rect x={x} y={y} width={w} height={h} rx={6} fill={f} stroke={s} strokeWidth={1.5}/>
                {lines.map((line,li)=><text key={li} x={x+w/2} y={y+h/2+(li-(lines.length-1)/2)*10} textAnchor="middle" dominantBaseline="central" fontSize={6} fill={t} fontWeight={700} fontFamily="system-ui,sans-serif" letterSpacing={0.5}>{line.toUpperCase()}</text>)}
              </g>;
            })}

            {/* Entry/Exit */}
            <g transform={`translate(${CW/2-80},${CH-15})`}><rect x={-20} y={-8} width={160} height={16} rx={8} fill="#F1F5F9" stroke="#E2E8F0" strokeWidth={1}/><text x={60} y={0} fontSize={7} fill="#475569" fontWeight={800} textAnchor="middle" dominantBaseline="central" letterSpacing={1} fontFamily="system-ui,sans-serif">↑ ENTRY (Hall A / B)</text></g>
            <g transform={`translate(${CW-72},${CH-15})`}><rect x={-10} y={-8} width={62} height={16} rx={8} fill="#F1F5F9" stroke="#E2E8F0" strokeWidth={1}/><text x={21} y={0} fontSize={7} fill="#475569" fontWeight={800} textAnchor="middle" dominantBaseline="central" letterSpacing={1} fontFamily="system-ui,sans-serif">Hall C →</text></g>

            {/* Booths */}
            {ALL_BOOTHS.map(id=><BoothRect key={id} id={id} state={getState(id)} onClick={handleBoothClick}/>)}

            {/* Path */}
            {showPath&&sp&&(<>
              <path d={sp} fill="none" stroke="#FBBF24" strokeWidth={12} strokeOpacity={0.2} strokeLinecap="round" strokeLinejoin="round"/>
              <path d={sp} fill="none" stroke="#F59E0B" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="10 6" style={{animation:"dashAnim 1s linear infinite"}}/>
              {ALL_NODES[pathFrom]&&<circle cx={ALL_NODES[pathFrom].cx} cy={ALL_NODES[pathFrom].cy} r={9} fill="#10B981" stroke="#FFF" strokeWidth={2.5}/>}
              {ALL_NODES[pathTo]&&<circle cx={ALL_NODES[pathTo].cx} cy={ALL_NODES[pathTo].cy} r={9} fill="#EF4444" stroke="#FFF" strokeWidth={2.5}/>}
            </>)}
          </g>
        </svg>
        <style>{`@keyframes dashAnim{to{stroke-dashoffset:-32}}@keyframes slideUp{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
      </div>

      {/* BOTTOM PANEL */}
      {selectedId&&!modalId&&(
        <div className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:w-80 bg-white border border-gray-100 rounded-2xl p-4 z-20 shadow-2xl" style={{animation:"slideUp .3s cubic-bezier(.16,1,.3,1) forwards"}}>
          <div className="flex items-start justify-between mb-2">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-lg font-extrabold text-gray-900">Booth {selectedId}</span>
                {tenants[selectedId]&&<span className="text-sm font-bold text-violet-600">{tenants[selectedId].user}</span>}
              </div>
              {tenants[selectedId]?.allBooths?.length>1&&(
                <div className="flex gap-1 mt-1 flex-wrap">
                  {tenants[selectedId].allBooths.map(b=><span key={b} className={`text-[10px] px-2 py-0.5 rounded font-bold border ${b===selectedId?"bg-violet-600 border-violet-600 text-white":"bg-violet-50 border-violet-200 text-violet-700"}`}>{b}</span>)}
                </div>
              )}
            </div>
            <button onClick={()=>setSelectedId(null)} className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 text-gray-400 hover:bg-gray-200 shrink-0 transition-colors">✕</button>
          </div>
          {tenants[selectedId]&&<>
            <div className="flex gap-1.5 mb-3 flex-wrap">{tenants[selectedId].fandoms.map(f=><span key={f} className="text-[10px] font-bold px-2 py-0.5 bg-violet-50 border border-violet-100 text-violet-600 rounded-full">{f}</span>)}</div>
            <button onClick={()=>{setModalId(selectedId);setSelectedId(null);}} className="w-full py-2.5 bg-violet-600 text-white text-sm font-bold rounded-xl shadow-sm shadow-violet-200 hover:bg-violet-700 active:scale-[0.98] transition-all">Lihat Detail & Katalog</button>
          </>}
          {!tenants[selectedId]&&<p className="text-xs text-gray-400 font-medium mt-1">Booth ini masih kosong.</p>}
        </div>
      )}

      {modalId&&tenants[modalId]&&<BoothModal boothId={modalId} tenant={tenants[modalId]} onClose={()=>setModalId(null)} onNavigate={id=>{setTab("path");setPathTo(id);setModalId(null);}}/>}
    </div>
  );
}