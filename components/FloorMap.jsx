"use client";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";

// ─── SHARED DATA STORE ────────────────────────────────────────────────────────
function getUsers() {
  try { return JSON.parse(localStorage.getItem("cp6_users") || "null") || INITIAL_USERS; }
  catch { return INITIAL_USERS; }
}
function saveUsers(u) { localStorage.setItem("cp6_users", JSON.stringify(u)); }
function getFandoms() {
  try { return JSON.parse(localStorage.getItem("cp6_fandoms") || "null") || DEFAULT_FANDOMS; }
  catch { return DEFAULT_FANDOMS; }
}

const DEFAULT_FANDOMS = [
  "Genshin Impact","Honkai Star Rail","Blue Archive","Hololive","Nijisanji",
  "Attack on Titan","Demon Slayer","Jujutsu Kaisen","One Piece","Naruto",
  "BTS","ENHYPEN","SEVENTEEN","Stray Kids","NewJeans",
  "Valorant","League of Legends","Minecraft","Elden Ring","Final Fantasy",
  "My Hero Academia","Spy x Family","Chainsaw Man","Frieren","Bocchi the Rock",
  "Vtuber Original","Original Art","Webtoon","Light Novel","Cosplay",
  "Arknights","Arkham Knight","Arknights Endfield","Honkai Impact",
  "Gachiakuta","Gacha Game","Gakuen Idolmaster",
];

const INITIAL_USERS = [
  { id:1, name:"Kusuma",    email:"kusuma@mail.com",  password:"user123", role:"user",       booths:["A16"], fandoms:["Genshin Impact","Original Art"] },
  { id:2, name:"Bagas",     email:"bagas@mail.com",   password:"user123", role:"user",       booths:["A17"], fandoms:["Attack on Titan"] },
  { id:3, name:"Wijaya",    email:"wijaya@mail.com",  password:"user123", role:"user",       booths:["D16","D01"], fandoms:["Naruto","One Piece"] },
  { id:4, name:"Admin",     email:"admin@comipara.com",password:"admin123",role:"admin",     booths:[],     fandoms:[] },
  { id:5, name:"SuperAdmin",email:"super@comipara.com",password:"super123",role:"super_admin",booths:[],   fandoms:[] },
  // Demo: Neko Neko Wae has G26-G29
  { id:6, name:"Neko Neko Wae", email:"neko@mail.com", password:"user123", role:"user", booths:["G26","G27","G28","G29"], fandoms:["Genshin Impact","Honkai Star Rail"] },
];

// ─── GEOMETRY ─────────────────────────────────────────────────────────────────
const LETTERS = ["A","B","C","D","E","F","G","H","I","J","K","L","M"];
const BW=32, BH=22, BG=2, CG=16;
const pad = n => String(n).padStart(2,"0");

function buildPositions(){
  const pos={};
  const NX=60, NY=18;
  for(let i=1;i<=16;i++) pos["N"+pad(i)]={cx:NX+(i-1)*(BW+BG)+BW/2, cy:NY+BH/2};
  const OX=NX+16*(BW+BG)+52;
  for(let i=1;i<=18;i++) pos["O"+pad(i)]={cx:OX+(i-1)*(BW+BG)+BW/2, cy:NY+BH/2};
  const CLX=60, CLUSTER_W=2*(BW+BG)+CG;
  const UY=58, LY=330;
  LETTERS.forEach((l,li)=>{
    const x0=CLX+li*CLUSTER_W, x1=x0+BW+BG;
    [16,15,14,13,12,11,10,9].forEach((n,ri)=>{ pos[l+pad(n)]={cx:x0+BW/2, cy:UY+ri*(BH+BG)+BH/2}; });
    [17,18,19,20,21,22,23,24].forEach((n,ri)=>{ pos[l+pad(n)]={cx:x1+BW/2, cy:UY+ri*(BH+BG)+BH/2}; });
    [8,7,6,5,4,3,2,1].forEach((n,ri)=>{ pos[l+pad(n)]={cx:x0+BW/2, cy:LY+ri*(BH+BG)+BH/2}; });
    [25,26,27,28,29,30,31,32].forEach((n,ri)=>{ pos[l+pad(n)]={cx:x1+BW/2, cy:LY+ri*(BH+BG)+BH/2}; });
  });
  const PX=CLX+LETTERS.length*CLUSTER_W+26;
  const pg=[[[14,15],[13,16],[12,17],[11,18],[10,19]],[[9,20],[8,21],[7,22],[6,23]],[[5,24],[4,25],[3,26],[2,27],[1,28]]];
  let pr=0;
  pg.forEach((g,gi)=>{ if(gi>0)pr+=1; g.forEach(([l,r])=>{ const cy=UY+pr*(BH+BG)+BH/2; pos["P"+pad(l)]={cx:PX+BW/2,cy}; pos["P"+pad(r)]={cx:PX+BW+BG+BW/2,cy}; pr++; }); });
  return pos;
}
const POS=buildPositions();
const CW=Math.max(...Object.values(POS).map(p=>p.cx))+120;
const CH=Math.max(...Object.values(POS).map(p=>p.cy))+160;

// ─── CORRIDOR / WAYPOINT GRAPH ────────────────────────────────────────────────
// We define explicit corridor waypoints that represent the actual walkable paths
// between booth clusters (gaps between columns of booths).
// This prevents the pathfinder from "cutting through" booths.

function buildCorridorGraph() {
  const CLUSTER_W = 2*(BW+BG)+CG;
  const CLX = 60;
  const UY = 58, LY = 330;
  const UH = 8*(BH+BG); // height of upper block
  const LH = 8*(BH+BG); // height of lower block

  // Key Y levels for corridors
  const Y_TOP    = NY = 10;           // above N/O row
  const Y_NO_ROW = 18 + BH + 6;       // below N/O row (gap before upper booth block)
  const Y_MID    = (UY + UH + LY) / 2; // corridor between upper and lower booth blocks (~210)
  const Y_MID_TOP = UY + UH + 4;       // just below upper block
  const Y_MID_BOT = LY - 4;            // just above lower block
  const Y_BOT     = LY + LH + 10;      // below lower block (into zone area)
  const Y_BOTTOM  = CH - 120;          // near bottom zones

  const waypoints = {};
  const edges = [];

  const addWP = (id, x, y) => { waypoints[id] = {cx:x, cy:y}; };
  const addEdge = (a, b) => { edges.push([a, b]); };

  // Horizontal corridor at the top (above N/O row) 
  addWP("COR_TOP_L",  CLX - 10,                    Y_NO_ROW);
  addWP("COR_TOP_R",  CW - 130,                    Y_NO_ROW);
  addEdge("COR_TOP_L","COR_TOP_R");

  // Vertical corridor on the LEFT side (outside all booth columns)
  const X_LEFT = CLX - 10;
  const X_RIGHT = CLX + LETTERS.length * CLUSTER_W + 10;

  addWP("COR_LEFT_TOP",   X_LEFT, Y_NO_ROW);
  addWP("COR_LEFT_MID_T", X_LEFT, Y_MID_TOP);
  addWP("COR_LEFT_MID",   X_LEFT, (Y_MID_TOP+Y_MID_BOT)/2);
  addWP("COR_LEFT_MID_B", X_LEFT, Y_MID_BOT);
  addWP("COR_LEFT_BOT",   X_LEFT, Y_BOT);
  addWP("COR_LEFT_BOTTOM",X_LEFT, Y_BOTTOM);

  addEdge("COR_LEFT_TOP",   "COR_LEFT_MID_T");
  addEdge("COR_LEFT_MID_T", "COR_LEFT_MID");
  addEdge("COR_LEFT_MID",   "COR_LEFT_MID_B");
  addEdge("COR_LEFT_MID_B", "COR_LEFT_BOT");
  addEdge("COR_LEFT_BOT",   "COR_LEFT_BOTTOM");

  // Vertical corridor on the RIGHT side (after last column M, before P/zone area)
  addWP("COR_RIGHT_TOP",   X_RIGHT, Y_NO_ROW);
  addWP("COR_RIGHT_MID_T", X_RIGHT, Y_MID_TOP);
  addWP("COR_RIGHT_MID",   X_RIGHT, (Y_MID_TOP+Y_MID_BOT)/2);
  addWP("COR_RIGHT_MID_B", X_RIGHT, Y_MID_BOT);
  addWP("COR_RIGHT_BOT",   X_RIGHT, Y_BOT);
  addWP("COR_RIGHT_BOTTOM",X_RIGHT, Y_BOTTOM);

  addEdge("COR_RIGHT_TOP",   "COR_RIGHT_MID_T");
  addEdge("COR_RIGHT_MID_T", "COR_RIGHT_MID");
  addEdge("COR_RIGHT_MID",   "COR_RIGHT_MID_B");
  addEdge("COR_RIGHT_MID_B", "COR_RIGHT_BOT");
  addEdge("COR_RIGHT_BOT",   "COR_RIGHT_BOTTOM");

  // Connect left and right via horizontal corridors
  addEdge("COR_TOP_L",    "COR_LEFT_TOP");
  addEdge("COR_TOP_R",    "COR_RIGHT_TOP");

  // Middle horizontal corridors (between upper and lower booth blocks)
  addWP("COR_HMID_L", X_LEFT,  (Y_MID_TOP+Y_MID_BOT)/2);
  addWP("COR_HMID_R", X_RIGHT, (Y_MID_TOP+Y_MID_BOT)/2);
  addEdge("COR_HMID_L","COR_HMID_R");
  addEdge("COR_HMID_L","COR_LEFT_MID");
  addEdge("COR_HMID_R","COR_RIGHT_MID");

  // Bottom horizontal corridor
  addWP("COR_HBOT_L", X_LEFT,  Y_BOT);
  addWP("COR_HBOT_R", X_RIGHT, Y_BOT);
  addEdge("COR_HBOT_L","COR_HBOT_R");
  addEdge("COR_HBOT_L","COR_LEFT_BOT");
  addEdge("COR_HBOT_R","COR_RIGHT_BOT");

  // Per-cluster vertical corridors (the gap between each pair of letter columns = the CG gap)
  // There's a gap BETWEEN each cluster pair (inside the cluster, between left col and right col = CG=16)
  // AND there's a gap BETWEEN clusters (= BG=2 on each side, effectively the gap between columns of different letters)
  // The real walkable paths are between clusters, i.e., to the right of column X[l,right] and before X[l+1,left]
  // That gap = CG (between the two columns of same letter) 

  LETTERS.forEach((l, li) => {
    const x0 = CLX + li * CLUSTER_W;
    const xIntra = x0 + BW + BG + CG/2; // center of intra-cluster gap (between left and right col of same letter)

    const wpTopU  = `COR_${l}_INTRA_U`;
    const wpBotU  = `COR_${l}_INTRA_UM`;
    const wpMid   = `COR_${l}_INTRA_M`;
    const wpTopL  = `COR_${l}_INTRA_LM`;
    const wpBotL  = `COR_${l}_INTRA_L`;

    addWP(wpTopU, xIntra, Y_NO_ROW);
    addWP(wpBotU, xIntra, Y_MID_TOP);
    addWP(wpMid,  xIntra, (Y_MID_TOP+Y_MID_BOT)/2);
    addWP(wpTopL, xIntra, Y_MID_BOT);
    addWP(wpBotL, xIntra, Y_BOT);

    addEdge(wpTopU, wpBotU);
    addEdge(wpBotU, wpMid);
    addEdge(wpMid,  wpTopL);
    addEdge(wpTopL, wpBotL);

    // Connect to top horizontal corridor
    addEdge("COR_TOP_L", wpTopU); // will find nearest via distance
    addEdge(wpTopU, "COR_TOP_R");

    // Connect adjacent intra-cluster corridors horizontally at each Y level
    if (li > 0) {
      const prev = LETTERS[li-1];
      addEdge(`COR_${prev}_INTRA_U`,  wpTopU);
      addEdge(`COR_${prev}_INTRA_UM`, wpBotU);
      addEdge(`COR_${prev}_INTRA_M`,  wpMid);
      addEdge(`COR_${prev}_INTRA_LM`, wpTopL);
      addEdge(`COR_${prev}_INTRA_L`,  wpBotL);
    }

    // Connect leftmost to LEFT corridor
    if (li === 0) {
      addEdge("COR_LEFT_TOP",   wpTopU);
      addEdge("COR_LEFT_MID_T", wpBotU);
      addEdge("COR_LEFT_MID",   wpMid);
      addEdge("COR_LEFT_MID_B", wpTopL);
      addEdge("COR_LEFT_BOT",   wpBotL);
    }
    // Connect rightmost to RIGHT corridor
    if (li === LETTERS.length - 1) {
      addEdge("COR_RIGHT_TOP",   wpTopU);
      addEdge("COR_RIGHT_MID_T", wpBotU);
      addEdge("COR_RIGHT_MID",   wpMid);
      addEdge("COR_RIGHT_MID_B", wpTopL);
      addEdge("COR_RIGHT_BOT",   wpBotL);
    }
  });

  return { waypoints, edges };
}

// ─── BOOTH GROUPS (multi-booth per exhibitor) ─────────────────────────────────
// Map each booth ID to a group ID. Booths with same group are highlighted together.
function buildBoothGroups(users) {
  const boothToGroup = {};
  const groupToBooths = {};
  users.forEach(u => {
    if (u.booths && u.booths.length > 1) {
      const groupId = `group_${u.id}`;
      groupToBooths[groupId] = u.booths;
      u.booths.forEach(b => { boothToGroup[b] = groupId; });
    } else if (u.booths && u.booths.length === 1) {
      // Single booth = own group
      boothToGroup[u.booths[0]] = `solo_${u.booths[0]}`;
    }
  });
  return { boothToGroup, groupToBooths };
}

// ─── A* ON CORRIDOR GRAPH ─────────────────────────────────────────────────────
function getAllBooths(){
  const ids=[];
  for(let i=1;i<=16;i++) ids.push("N"+pad(i));
  for(let i=1;i<=18;i++) ids.push("O"+pad(i));
  LETTERS.forEach(l=>{ for(let n=1;n<=32;n++) ids.push(l+pad(n)); });
  for(let i=1;i<=28;i++) ids.push("P"+pad(i));
  return ids;
}
const ALL=getAllBooths();

// Build the combined graph: corridor waypoints + booth nodes
// Booth nodes connect only to their nearest corridor waypoints (not to other booths directly)
function buildFullGraph() {
  const { waypoints, edges } = buildCorridorGraph();

  // Combined position map: booths + corridor waypoints
  const allPos = { ...POS };
  Object.entries(waypoints).forEach(([id, pos]) => { allPos[id] = pos; });

  // Build adjacency
  const graph = {};
  const allNodes = [...Object.keys(POS), ...Object.keys(waypoints)];
  allNodes.forEach(id => { graph[id] = []; });

  // Add corridor edges (bidirectional)
  edges.forEach(([a, b]) => {
    if (!allPos[a] || !allPos[b]) return;
    const d = Math.hypot(allPos[a].cx - allPos[b].cx, allPos[a].cy - allPos[b].cy);
    graph[a].push({ id: b, d });
    graph[b].push({ id: a, d });
  });

  // Connect each booth to its nearest corridor waypoints (within a radius)
  // This allows booths to "enter" the corridor network without jumping through other booths
  const corridorIds = Object.keys(waypoints);
  const CONNECT_RADIUS = 40; // px – booths within this distance of a corridor node get connected

  ALL.forEach(boothId => {
    if (!allPos[boothId]) return;
    const bp = allPos[boothId];
    // Find closest corridor waypoints
    const nearby = corridorIds
      .map(cid => ({ cid, d: Math.hypot(allPos[cid].cx - bp.cx, allPos[cid].cy - bp.cy) }))
      .filter(e => e.d < CONNECT_RADIUS * 2)
      .sort((a, b) => a.d - b.d)
      .slice(0, 3); // connect to up to 3 nearest

    nearby.forEach(({ cid, d }) => {
      graph[boothId].push({ id: cid, d });
      graph[cid].push({ id: boothId, d });
    });
  });

  return { graph, allPos };
}

const { graph: CORRIDOR_GRAPH, allPos: ALL_POS } = buildFullGraph();

function aStarCorridor(s, e) {
  if (s === e) return [s];
  if (!ALL_POS[s] || !ALL_POS[e]) return [];

  const open = new Set([s]);
  const from = {};
  const g = { [s]: 0 };
  const f = { [s]: Math.hypot(ALL_POS[s].cx - ALL_POS[e].cx, ALL_POS[s].cy - ALL_POS[e].cy) };

  while (open.size) {
    let cur = null, lf = Infinity;
    open.forEach(id => { const v = f[id] ?? Infinity; if (v < lf) { lf = v; cur = id; } });
    if (cur === e) {
      const p = [e]; let n = e;
      while (from[n]) { n = from[n]; p.unshift(n); }
      // Filter out corridor waypoint IDs from the visible path (they're internal)
      return p;
    }
    open.delete(cur);
    for (const { id: nb, d } of (CORRIDOR_GRAPH[cur] || [])) {
      const tg = (g[cur] ?? Infinity) + d;
      if (tg < (g[nb] ?? Infinity)) {
        from[nb] = cur;
        g[nb] = tg;
        f[nb] = tg + Math.hypot(ALL_POS[nb].cx - ALL_POS[e].cx, ALL_POS[nb].cy - ALL_POS[e].cy);
        open.add(nb);
      }
    }
  }
  return [s, e];
}

// Build smooth SVG path that uses all waypoints including corridor ones
function svgPathStr(ids) {
  if (ids.length < 2) return "";
  const pts = ids.map(id => ALL_POS[id]).filter(Boolean);
  if (pts.length < 2) return "";
  let d = `M${pts[0].cx},${pts[0].cy}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const m = { cx: (pts[i].cx + pts[i+1].cx)/2, cy: (pts[i].cy + pts[i+1].cy)/2 };
    d += ` Q${pts[i].cx},${pts[i].cy} ${m.cx},${m.cy}`;
  }
  return d + ` L${pts[pts.length-1].cx},${pts[pts.length-1].cy}`;
}

// Filter path for display: only show booth IDs in the info panel (not corridor waypoints)
function visiblePath(path) {
  return path.filter(id => ALL.includes(id));
}

// ─── SEARCH TRACKING ──────────────────────────────────────────────────────────
function getSearchCounts() {
  try { return JSON.parse(localStorage.getItem("cp6_search_counts") || "{}"); }
  catch { return {}; }
}
function incrementSearch(fandom) {
  const counts = getSearchCounts();
  counts[fandom] = (counts[fandom] || 0) + 1;
  localStorage.setItem("cp6_search_counts", JSON.stringify(counts));
}
function getTopFandoms(fandoms, n=10) {
  const counts = getSearchCounts();
  return [...fandoms].sort((a,b) => (counts[b]||0) - (counts[a]||0)).slice(0, n);
}

// ─── BUILD TENANTS ────────────────────────────────────────────────────────────
function buildTenants(users) {
  const tenants = {};
  users.forEach(u => {
    u.booths.forEach(b => {
      const catalog = JSON.parse(localStorage.getItem(`cp6_catalog_${u.id}`) || "[]");
      const prices  = JSON.parse(localStorage.getItem(`cp6_prices_${u.id}`) || "[]");
      tenants[b] = { userId: u.id, user: u.name, fandoms: u.fandoms, catalog, prices };
    });
  });
  return tenants;
}

// ─── BOOTH RECT ───────────────────────────────────────────────────────────────
function BoothRect({ id, state, onClick }) {
  const p = POS[id]; if (!p) return null;
  const C = {
    empty:    { fill:"#F8FAFC", stroke:"#CBD5E1", text:"#94A3B8" },
    occupied: { fill:"#F3E8FF", stroke:"#D8B4FE", text:"#9333EA" },
    matched:  { fill:"#7C3AED", stroke:"#5B21B6", text:"#FFFFFF" },
    selected: { fill:"#A78BFA", stroke:"#7C3AED", text:"#FFFFFF" },
    groupSelected: { fill:"#C4B5FD", stroke:"#7C3AED", text:"#FFFFFF" },
    pathStart:{ fill:"#10B981", stroke:"#047857", text:"#FFFFFF" },
    pathEnd:  { fill:"#EF4444", stroke:"#B91C1C", text:"#FFFFFF" },
    onPath:   { fill:"#F59E0B", stroke:"#D97706", text:"#FFFFFF" },
  }[state] || { fill:"#F8FAFC", stroke:"#CBD5E1", text:"#94A3B8" };

  return (
    <g onClick={() => onClick(id)} style={{ cursor:"pointer" }} className="group">
      <rect x={p.cx - BW/2} y={p.cy - BH/2} width={BW} height={BH} rx={4}
        fill={C.fill} stroke={C.stroke} strokeWidth={state==="groupSelected"?1.5:1}
        className="transition-all duration-200 group-hover:brightness-95"/>
      <text x={p.cx} y={p.cy} textAnchor="middle" dominantBaseline="central"
        fontSize={6.5} fontWeight={700} fill={C.text} fontFamily="system-ui, sans-serif"
        style={{ userSelect:"none", pointerEvents:"none" }}>{id}</text>
    </g>
  );
}

// ─── BOOTH DETAIL MODAL ───────────────────────────────────────────────────────
function BoothModal({ boothId, tenant, onClose, onNavigate }) {
  const [idx, setIdx] = useState(0);
  const cat = tenant?.catalog || [], prices = tenant?.prices || [];
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"/>
      <div className="relative bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden animate-slideUp sm:animate-fadeIn"
        onClick={e => e.stopPropagation()}>
        <div className="shrink-0 flex items-start justify-between px-6 py-5 border-b border-gray-100 bg-white/80 backdrop-blur-md sticky top-0 z-10">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-xl font-extrabold text-gray-900 tracking-tight">Booth {boothId}</span>
              <span className="text-xs px-2.5 py-1 bg-violet-100 text-violet-700 font-semibold border border-violet-200 rounded-full">{tenant?.user}</span>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {tenant?.fandoms.map(f => <span key={f} className="text-[10px] font-medium px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">{f}</span>)}
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700 shrink-0 ml-2 transition-colors">✕</button>
        </div>
        <div className="overflow-y-auto px-6 py-4 space-y-6">
          <button onClick={() => { onNavigate(boothId); onClose(); }}
            className="w-full py-3 bg-violet-600 hover:bg-violet-700 shadow-md shadow-violet-200 text-white text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-2 active:scale-[0.98]">
            🗺️ Tampilkan Rute ke Booth Ini
          </button>
          <div>
            <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2"><span>Katalog</span> <div className="h-px bg-gray-200 flex-1"></div></h3>
            {cat.length === 0
              ? <div className="text-center py-10 bg-gray-50 border border-dashed border-gray-200 rounded-2xl"><div className="text-3xl opacity-50 mb-2">🖼️</div><p className="text-xs text-gray-400 font-medium">Belum ada katalog</p></div>
              : <div className="space-y-3">
                  <div className="rounded-2xl overflow-hidden bg-gray-100 aspect-square shadow-inner border border-gray-100">
                    <img src={cat[idx]?.url || cat[idx]} alt="catalog" className="w-full h-full object-cover"/>
                  </div>
                  {cat.length > 1 && (
                    <div className="flex gap-2.5 overflow-x-auto pb-2 custom-scrollbar">
                      {cat.map((img, i) => (
                        <button key={i} onClick={() => setIdx(i)}
                          className={`shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${i===idx?"border-violet-500 shadow-sm":"border-transparent opacity-60 hover:opacity-100"}`}>
                          <img src={img?.url || img} alt="" className="w-full h-full object-cover"/>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
            }
          </div>
          <div className="pb-4">
            <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2"><span>Daftar Harga</span> <div className="h-px bg-gray-200 flex-1"></div></h3>
            {prices.length === 0
              ? <div className="text-center py-8 bg-gray-50 border border-dashed border-gray-200 rounded-2xl"><p className="text-xs text-gray-400 font-medium">Belum ada harga</p></div>
              : <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left py-2.5 px-4 text-gray-500 font-semibold text-xs uppercase tracking-wider">Item</th>
                        <th className="text-right py-2.5 px-4 text-gray-500 font-semibold text-xs uppercase tracking-wider">Harga</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {prices.map((p, i) => (
                        <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                          <td className="py-3 px-4 text-gray-800 font-medium">{p.item}</td>
                          <td className="py-3 px-4 text-right font-bold text-violet-700">Rp {parseInt(p.price).toLocaleString("id-ID")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
            }
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN FLOORMAP ────────────────────────────────────────────────────────────
export default function FloorMap() {
  const [users, setUsers]           = useState([]);
  const [fandoms, setFandoms]       = useState(DEFAULT_FANDOMS);
  const [tenants, setTenants]       = useState({});
  const [boothGroups, setBoothGroups] = useState({ boothToGroup:{}, groupToBooths:{} });
  const [search, setSearch]         = useState("");
  const [selFandom, setSelFandom]   = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [showSugg, setShowSugg]     = useState(false);

  // Selection: selectedId = the clicked booth; selectedGroup = all booths in same group
  const [selectedId, setSelectedId] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState([]); // all booth IDs in the group

  const [modalId, setModalId]       = useState(null);
  const [tab, setTab]               = useState("search");
  const [pathFrom, setPathFrom]     = useState("");
  const [pathTo, setPathTo]         = useState("");
  const [path, setPath]             = useState([]);
  const [showPath, setShowPath]     = useState(false);

  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const [scale, setScale] = useState(1);

  const containerRef = useRef(null);
  const lastTouch    = useRef(null);
  const lastDist     = useRef(null);
  const pinching     = useRef(false);
  const clickTimer   = useRef(null);
  const searchRef    = useRef(null);

  // ── Initial load ──
  useEffect(() => {
    const u = getUsers();
    setUsers(u);
    setFandoms(getFandoms());
    setTenants(buildTenants(u));
    setBoothGroups(buildBoothGroups(u));
  }, []);

  // ── Initial fit-to-view (more generous scale to fill screen) ──
  useEffect(() => {
    const el = containerRef.current; if (!el) return;
    // Use a slightly more zoomed-in fit (0.95 of available space)
    const PADDING = 0.92;
    const s = Math.min(el.clientWidth / CW, el.clientHeight / CH) * PADDING;
    const clampedS = Math.min(s, 1.4); // allow slight zoom beyond 1 to fill screen
    setScale(clampedS);
    // Center the map
    const mapW = CW * clampedS, mapH = CH * clampedS;
    setTx((el.clientWidth - mapW) / 2);
    setTy((el.clientHeight - mapH) / 2);
  }, []);

  // ── Suggestions ──
  useEffect(() => {
    if (!search.trim()) { setSuggestions([]); return; }
    const q = search.toLowerCase();
    const matched = fandoms.filter(f => f.toLowerCase().includes(q) && f.toLowerCase() !== q);
    const counts  = getSearchCounts();
    const ranked  = matched.sort((a,b) => (counts[b]||0) - (counts[a]||0)).slice(0, 10);
    setSuggestions(ranked);
  }, [search, fandoms]);

  const searchTerm = selFandom || search;
  const isMatch = useCallback((id) => {
    if (!searchTerm) return false;
    const t = tenants[id]; if (!t) return false;
    return t.fandoms.some(f => f.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [searchTerm, tenants]);
  const matchedSet = useMemo(() => new Set(ALL.filter(isMatch)), [isMatch]);
  const pathSet    = useMemo(() => new Set(path.filter(id => ALL.includes(id))), [path]);
  const topFandoms = useMemo(() => getTopFandoms(fandoms, 10), [fandoms]);

  function clamp(x, y, s, W, H) {
    const mw = CW * s, mh = CH * s;
    return {
      x: mw < W ? (W - mw) / 2 : Math.min(0, Math.max(W - mw, x)),
      y: mh < H ? (H - mh) / 2 : Math.min(0, Math.max(H - mh, y)),
    };
  }

  function resetView() {
    const el = containerRef.current; if (!el) return;
    const PADDING = 0.92;
    const s = Math.min(el.clientWidth / CW, el.clientHeight / CH) * PADDING;
    const clampedS = Math.min(s, 1.4);
    setScale(clampedS);
    const mapW = CW * clampedS, mapH = CH * clampedS;
    setTx((el.clientWidth - mapW) / 2);
    setTy((el.clientHeight - mapH) / 2);
  }

  // ── Touch / wheel pan+zoom ──
  useEffect(() => {
    const el = containerRef.current; if (!el) return;
    const gW = () => el.clientWidth, gH = () => el.clientHeight;
    const dist = t => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    const mid  = t => ({ x: (t[0].clientX + t[1].clientX)/2, y: (t[0].clientY + t[1].clientY)/2 });
    const onTS = e => {
      if (e.touches.length === 2) { pinching.current=true; lastDist.current=dist(e.touches); lastTouch.current=mid(e.touches); e.preventDefault(); }
      else { pinching.current=false; lastTouch.current={x:e.touches[0].clientX,y:e.touches[0].clientY}; }
    };
    const onTM = e => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const d=dist(e.touches), m=mid(e.touches), ds=d/(lastDist.current||d);
        setScale(ps => {
          const ns = Math.min(Math.max(ps*ds, 0.3), 5);
          const dx=m.x-(lastTouch.current?.x||m.x), dy=m.y-(lastTouch.current?.y||m.y);
          setTx(px => { const c=clamp(px+dx,0,ns,gW(),gH()); return c.x; });
          setTy(py => { const c=clamp(0,py+dy,ns,gW(),gH()); return c.y; });
          return ns;
        });
        lastDist.current=d; lastTouch.current=m;
      } else if (e.touches.length === 1 && !pinching.current) {
        const dx=e.touches[0].clientX-(lastTouch.current?.x||0);
        const dy=e.touches[0].clientY-(lastTouch.current?.y||0);
        setTx(px => clamp(px+dx, 0, scale, gW(), gH()).x);
        setTy(py => clamp(0, py+dy, scale, gW(), gH()).y);
        lastTouch.current={x:e.touches[0].clientX, y:e.touches[0].clientY};
      }
    };
    const onTE = () => { pinching.current = false; };
    const onW = e => {
      e.preventDefault();
      const rect=el.getBoundingClientRect();
      const mx=e.clientX-rect.left, my=e.clientY-rect.top;
      const ds=e.deltaY < 0 ? 1.12 : 0.9;
      setScale(ps => {
        const ns=Math.min(Math.max(ps*ds, 0.3), 5);
        const newTx=mx-(mx-tx)*(ns/ps);
        const newTy=my-(my-ty)*(ns/ps);
        const c=clamp(newTx, newTy, ns, gW(), gH());
        setTx(c.x); setTy(c.y);
        return ns;
      });
    };
    el.addEventListener("touchstart", onTS, {passive:false});
    el.addEventListener("touchmove",  onTM, {passive:false});
    el.addEventListener("touchend",   onTE);
    el.addEventListener("wheel",      onW,  {passive:false});
    return () => {
      el.removeEventListener("touchstart", onTS);
      el.removeEventListener("touchmove",  onTM);
      el.removeEventListener("touchend",   onTE);
      el.removeEventListener("wheel",      onW);
    };
  }, [scale, tx, ty]);

  // ── Booth click: single vs double tap, with group selection ──
  function handleBoothClick(id) {
    // In path mode: assign path start/end
    if (tab === "path") {
      // Resolve to representative booth of group
      const resolvedId = resolveGroupRepresentative(id);
      if (!pathFrom) { setPathFrom(resolvedId); return; }
      if (!pathTo && resolvedId !== pathFrom) { setPathTo(resolvedId); return; }
      return;
    }

    if (clickTimer.current) {
      clearTimeout(clickTimer.current); clickTimer.current = null;
      // Double tap → modal
      if (tenants[id]) { setModalId(id); setSelectedId(null); setSelectedGroup([]); }
    } else {
      clickTimer.current = setTimeout(() => {
        clickTimer.current = null;
        // Single tap → select booth + its group
        if (selectedId === id) {
          // 3rd tap on same booth: cancel
          setSelectedId(null); setSelectedGroup([]);
        } else {
          setSelectedId(id);
          // Find group
          const group = getBoothGroupFor(id);
          setSelectedGroup(group);
        }
      }, 260);
    }
  }

  function resolveGroupRepresentative(id) {
    // Returns the first booth of the group, so pathfinding treats group as one destination
    const { boothToGroup, groupToBooths } = boothGroups;
    const gid = boothToGroup[id];
    if (gid && groupToBooths[gid]) return groupToBooths[gid][0];
    return id;
  }

  function getBoothGroupFor(id) {
    const { boothToGroup, groupToBooths } = boothGroups;
    const gid = boothToGroup[id];
    if (gid && groupToBooths[gid]) return groupToBooths[gid];
    return [id];
  }

  function handleFindPath() {
    if (!pathFrom || !pathTo) return;
    const r = aStarCorridor(pathFrom, pathTo);
    setPath(r); setShowPath(true);
  }
  function resetPath() { setPathFrom(""); setPathTo(""); setPath([]); setShowPath(false); }

  function getState(id) {
    if (showPath && path.length > 0) {
      if (id === path[0]) return "pathStart";
      if (id === path[path.length - 1]) return "pathEnd";
      if (pathSet.has(id)) return "onPath";
    }
    if (matchedSet.has(id)) return "matched";
    // Group selection
    if (selectedGroup.includes(id)) {
      if (id === selectedId) return "selected";
      return "groupSelected";
    }
    if (tenants[id]) return "occupied";
    return "empty";
  }

  function selectSuggestion(f) {
    incrementSearch(f);
    setSelFandom(f); setSearch(f);
    setSuggestions([]); setShowSugg(false);
  }

  // ── Zone layout (spacing refined, not redesigned) ──
  const ZY = CH - 110;
  const ZoneRects = [
    { label:"Comipara\nGuild Area",   x:40,        y:ZY,      w:220, h:52, f:"#F0F9FF", s:"#BAE6FD", t:"#0284C7" },
    { label:"Comic\nClass Area",      x:278,       y:ZY,      w:120, h:52, f:"#F0FDFA", s:"#99F6E4", t:"#0D9488" },
    { label:"Visitor\nStorage",       x:416,       y:ZY,      w:90,  h:52, f:"#F8FAFC", s:"#E2E8F0", t:"#64748B" },
    { label:"Community\nZone",        x:524,       y:ZY,      w:200, h:52, f:"#FFF7ED", s:"#FED7AA", t:"#EA580C" },
    { label:"Tabletop\nArea",         x:742,       y:ZY+10,   w:100, h:36, f:"#F8FAFC", s:"#E2E8F0", t:"#64748B" },
    { label:"Stage",                  x:CW-92,     y:196,     w:72,  h:100, f:"#FEFCE8", s:"#FEF08A", t:"#CA8A04" },
    { label:"Creative\nZone",         x:CW-182,    y:56,      w:82,  h:200, f:"#F0FDF4", s:"#BBF7D0", t:"#16A34A" },
    { label:"Exhibitor\nZone",        x:CW-182,    y:268,     w:82,  h:80,  f:"#FDF2F8", s:"#FBCFE8", t:"#DB2777" },
    { label:"Stage\nCosplay",         x:CW-92,     y:305,     w:72,  h:46,  f:"#FEFCE8", s:"#FEF08A", t:"#B45309" },
    { label:"Cosplay\nReg. Zone",     x:CW-182,    y:360,     w:82,  h:52,  f:"#FAF5FF", s:"#E9D5FF", t:"#9333EA" },
  ];

  const SpecialZones = [
    { label:"Photobooth",    x:40,  y:ZY-64,    w:52,  h:52,  f:"#FEFCE8", s:"#FDE047", t:"#A16207" },
    { label:"Information",   x:200, y:ZY+16,    w:55,  h:20,  f:"#EFF6FF", s:"#BFDBFE", t:"#1D4ED8" },
    { label:"Item Shop",     x:258, y:ZY+26,    w:46,  h:20,  f:"#EFF6FF", s:"#BFDBFE", t:"#1D4ED8" },
    { label:"Guild Admin",   x:246, y:ZY+4,     w:40,  h:18,  f:"#F5F3FF", s:"#DDD6FE", t:"#6D28D9" },
    { label:"Quest Board",   x:155, y:ZY-14,    w:70,  h:12,  f:"#FEFCE8", s:"#FDE047", t:"#A16207" },
    { label:"Charging\nStation", x:638, y:ZY+20, w:66, h:26,  f:"#F0FDF4", s:"#BBF7D0", t:"#15803D" },
    { label:"Ticket\nBox",   x:416, y:ZY+54,    w:56,  h:26,  f:"#FEF2F2", s:"#FECACA", t:"#B91C1C" },
  ];

  const sp = showPath && path.length >= 2 ? svgPathStr(path) : "";
  const displayPath = visiblePath(path);

  // Selected booth tenant: check the actual clicked booth, then fall back to group
  const selectedTenant = selectedId ? tenants[selectedId] : null;
  const selectedGroupLabel = selectedGroup.length > 1 
    ? `${selectedGroup[0]}–${selectedGroup[selectedGroup.length-1]}` 
    : selectedId;

  return (
    <div className="flex flex-col bg-gray-50 overflow-hidden" style={{ height:"100dvh" }}>

      {/* HEADER */}
      <div className="bg-white px-5 py-3 flex items-center justify-between shrink-0 shadow-sm z-20">
        <div>
          <h1 className="text-base font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
            Comipara 6 <span className="text-[10px] font-semibold tracking-wider uppercase bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full">Map</span>
          </h1>
          <p className="text-[11px] text-gray-500 font-medium mt-0.5">Tap 1× = pilih booth · Tap 2× = detail</p>
        </div>
        <button onClick={resetView} className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900 active:scale-95 transition-all shadow-sm">
          Reset View
        </button>
      </div>

      {/* CONTROLS */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 shrink-0 z-10 space-y-3">
        <div className="flex gap-1 bg-gray-100/80 rounded-lg p-1 w-fit border border-gray-200/60">
          {[["search","🔍 Fandom"],["path","🗺️ Navigasi Jalur"]].map(([t,l]) => (
            <button key={t} onClick={() => { setTab(t); if (t==="search") resetPath(); }}
              className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-all ${tab===t?"bg-white text-gray-900 shadow-sm border border-gray-200/50":"text-gray-500 hover:text-gray-700 hover:bg-gray-200/50"}`}>{l}</button>
          ))}
        </div>

        {tab === "search" && (
          <div className="space-y-2">
            <div className="relative flex gap-2">
              <div className="relative flex-1">
                <input
                  ref={searchRef}
                  value={search}
                  onChange={e => { setSearch(e.target.value); setSelFandom(null); setShowSugg(true); }}
                  onFocus={() => setShowSugg(true)}
                  onBlur={() => setTimeout(() => setShowSugg(false), 150)}
                  placeholder="Ketik fandom... (e.g. ark → Arknights)"
                  className="w-full pl-3 pr-3 py-2 text-sm border border-gray-300 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-violet-400 transition-shadow"
                />
                {showSugg && suggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden">
                    {suggestions.map(f => (
                      <button key={f} onMouseDown={() => selectSuggestion(f)}
                        className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-violet-50 hover:text-violet-700 flex items-center gap-3 border-b border-gray-50 last:border-0 font-medium transition-colors">
                        <span className="text-gray-300">🔍</span>
                        <span>{f}</span>
                        {(getSearchCounts()[f]||0) > 0 && <span className="ml-auto text-[10px] font-bold text-gray-300 bg-gray-100 px-1.5 py-0.5 rounded">{getSearchCounts()[f]}×</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button onClick={() => { setSearch(""); setSelFandom(null); setSelectedId(null); setSelectedGroup([]); setSuggestions([]); }}
                className="px-4 py-2 text-sm font-semibold border border-gray-300 rounded-xl text-gray-600 hover:bg-gray-50 shadow-sm transition-colors">Reset</button>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-[4.5rem] overflow-y-auto custom-scrollbar pt-1 pb-1">
              {topFandoms.map(f => (
                <button key={f} onClick={() => { selectSuggestion(f); setSelFandom(f); }}
                  className={`px-3 py-1 rounded-full text-[11px] font-semibold border transition-all shadow-sm ${(selFandom===f||search===f)?"bg-violet-600 border-violet-600 text-white":"bg-white border-gray-200 text-gray-600 hover:border-violet-300 hover:bg-violet-50"}`}>{f}</button>
              ))}
            </div>
            {searchTerm && <p className="text-xs text-gray-500 font-medium pt-0.5">{matchedSet.size>0?<><span className="text-violet-600 font-bold">{matchedSet.size} booth</span> ditemukan untuk "{searchTerm}"</>:<span className="text-rose-500 font-bold">Tidak ada hasil ditemukan</span>}</p>}
          </div>
        )}

        {tab === "path" && (
          <div className="space-y-2 bg-gray-50 p-3 rounded-xl border border-gray-100">
            <p className="text-[11px] font-medium text-gray-500 mb-1">Pilih 2 titik booth di peta atau masukkan ID-nya manual:</p>
            <div className="flex gap-2 flex-wrap items-center">
              <div className="flex items-center gap-2 flex-1 min-w-[120px] bg-white px-2 py-1.5 border border-gray-200 rounded-lg shadow-sm">
                <span className="w-5 h-5 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">A</span>
                <input value={pathFrom} onChange={e => setPathFrom(e.target.value.toUpperCase())} placeholder="Mulai (e.g. A01)"
                  className="flex-1 text-sm bg-transparent border-none focus:outline-none focus:ring-0 w-full uppercase placeholder:normal-case font-semibold text-gray-700"/>
              </div>
              <div className="flex items-center gap-2 flex-1 min-w-[120px] bg-white px-2 py-1.5 border border-gray-200 rounded-lg shadow-sm">
                <span className="w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">B</span>
                <input value={pathTo} onChange={e => setPathTo(e.target.value.toUpperCase())} placeholder="Tujuan (e.g. M32)"
                  className="flex-1 text-sm bg-transparent border-none focus:outline-none focus:ring-0 w-full uppercase placeholder:normal-case font-semibold text-gray-700"/>
              </div>
              <button onClick={handleFindPath} disabled={!pathFrom||!pathTo}
                className="px-4 py-2.5 text-xs font-bold bg-violet-600 shadow-sm text-white rounded-lg hover:bg-violet-700 disabled:opacity-40 transition-colors">Cari Rute</button>
              <button onClick={resetPath} className="px-3 py-2.5 text-xs font-bold border border-gray-300 bg-white rounded-lg text-gray-600 hover:bg-gray-50 shadow-sm">Reset</button>
            </div>
            {showPath && displayPath.length > 0 && (
              <div className="flex gap-2 flex-wrap items-center pt-1 border-t border-gray-200 mt-2">
                <span className="text-xs font-medium text-gray-500">Estimasi {displayPath.length} titik:</span>
                <div className="flex gap-1 flex-wrap max-h-12 overflow-y-auto custom-scrollbar">
                  {displayPath.map((id, i) => (
                    <span key={id} className={`text-[10px] px-2 py-1 rounded font-bold ${i===0?"bg-emerald-100 text-emerald-700":i===displayPath.length-1?"bg-rose-100 text-rose-700":"bg-amber-100 text-amber-700"}`}>{id}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* LEGEND */}
      <div className="flex gap-4 px-4 py-2 bg-gray-50/80 border-b border-gray-200 shrink-0 overflow-x-auto custom-scrollbar shadow-inner text-gray-600">
        {[
          { c:"bg-[#F3E8FF] border border-[#D8B4FE]", l:"Terisi" },
          { c:"bg-[#7C3AED] shadow-sm", l:"Hasil Cari", t:"text-white" },
          { c:"bg-[#A78BFA] border border-[#7C3AED] shadow-sm", l:"Dipilih", t:"text-white" },
          { c:"bg-[#C4B5FD] border border-[#7C3AED]", l:"Grup", t:"text-white" },
          { c:"bg-[#10B981]", l:"Titik A", t:"text-white" },
          { c:"bg-[#EF4444]", l:"Titik B", t:"text-white" },
          { c:"bg-[#F59E0B]", l:"Jalur Rute", t:"text-white" },
        ].map(({c,l,t}) => (
          <div key={l} className="flex items-center gap-1.5 shrink-0">
            <div className={`w-4 h-3.5 rounded-sm ${c} ${t||""}`}/>
            <span className="text-[10px] font-bold tracking-wide uppercase whitespace-nowrap">{l}</span>
          </div>
        ))}
      </div>

      {/* SVG MAP */}
      <div ref={containerRef} className="flex-1 overflow-hidden relative select-none touch-none bg-[#E2E8F0] shadow-inner" style={{ minHeight:0 }}>
        <svg width="100%" height="100%" style={{ display:"block" }}>
          <defs>
            <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%">
              <feDropShadow dx="0" dy="8" stdDeviation="12" floodColor="#0F172A" floodOpacity="0.08"/>
            </filter>
            <pattern id="dotGrid" x="0" y="0" width="16" height="16" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="1" fill="#CBD5E1" opacity="0.6"/>
            </pattern>
          </defs>
          <g transform={`translate(${tx},${ty}) scale(${scale})`}>

            {/* Map Canvas */}
            <rect x={0} y={0} width={CW} height={CH} fill="#FFFFFF" rx={16} filter="url(#shadow)"/>
            <rect x={0} y={0} width={CW} height={CH} fill="url(#dotGrid)" rx={16}/>

            {/* Section Labels */}
            <text x={62} y={13} fontSize={8} fill="#A78BFA" fontWeight={800} letterSpacing={2} fontFamily="system-ui, sans-serif">BARIS N & O</text>
            <text x={62} y={52} fontSize={8} fill="#A78BFA" fontWeight={800} letterSpacing={2} fontFamily="system-ui, sans-serif">COMIC HALL</text>
            <line x1={50} y1={316} x2={CW-200} y2={316} stroke="#CBD5E1" strokeWidth={2} strokeDasharray="8 6"/>
            <text x={(CW-200)/2} y={326} textAnchor="middle" fontSize={7.5} fill="#94A3B8" fontWeight={800} letterSpacing={4} fontFamily="system-ui, sans-serif">CREATOR MERCHANT AREA</text>

            {/* Entry/Exit */}
            <g transform={`translate(${CW/2 - 80}, ${CH - 15})`}>
              <rect x={-20} y={-8} width={150} height={16} rx={8} fill="#F1F5F9" stroke="#E2E8F0" strokeWidth={1}/>
              <text x={55} y={0} fontSize={7} fill="#475569" fontWeight={800} textAnchor="middle" dominantBaseline="central" letterSpacing={1} fontFamily="system-ui, sans-serif">↑ ENTRY (Hall A / B)</text>
            </g>
            <g transform={`translate(${CW - 70}, ${CH - 15})`}>
              <rect x={-10} y={-8} width={60} height={16} rx={8} fill="#F1F5F9" stroke="#E2E8F0" strokeWidth={1}/>
              <text x={20} y={0} fontSize={7} fill="#475569" fontWeight={800} textAnchor="middle" dominantBaseline="central" letterSpacing={1} fontFamily="system-ui, sans-serif">Hall C →</text>
            </g>

            {/* Zone Boxes */}
            {ZoneRects.map(({label,x,y,w,h,f,s,t}, i) => {
              const lines = label.split("\n");
              return <g key={i}>
                <rect x={x} y={y} width={w} height={h} rx={6} fill={f} stroke={s} strokeWidth={1.5}/>
                {lines.map((line,li) => <text key={li} x={x+w/2} y={y+h/2+(li-(lines.length-1)/2)*10} textAnchor="middle" dominantBaseline="central" fontSize={6.5} fill={t} fontWeight={700} fontFamily="system-ui, sans-serif" letterSpacing={0.5}>{line.toUpperCase()}</text>)}
              </g>;
            })}
            {SpecialZones.map(({label,x,y,w,h,f,s,t}, i) => {
              const lines = label.split("\n");
              return <g key={"sz"+i}>
                <rect x={x} y={y} width={w} height={h} rx={4} fill={f} stroke={s} strokeWidth={1.2}/>
                {lines.map((line,li) => <text key={li} x={x+w/2} y={y+h/2+(li-(lines.length-1)/2)*9} textAnchor="middle" dominantBaseline="central" fontSize={5.5} fill={t} fontWeight={800} fontFamily="system-ui, sans-serif" letterSpacing={0.5}>{line}</text>)}
              </g>;
            })}

            {/* Booths */}
            {ALL.map(id => <BoothRect key={id} id={id} state={getState(id)} onClick={handleBoothClick}/>)}

            {/* Path line */}
            {showPath && sp && (<>
              <path d={sp} fill="none" stroke="#FBBF24" strokeWidth={12} strokeOpacity={0.2} strokeLinecap="round" strokeLinejoin="round"/>
              <path d={sp} fill="none" stroke="#F59E0B" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="10 6"
                style={{ animation:"dashAnim 1s linear infinite" }}/>
              {ALL_POS[path[0]] && <circle cx={ALL_POS[path[0]].cx} cy={ALL_POS[path[0]].cy} r={8} fill="#10B981" stroke="#FFFFFF" strokeWidth={2.5} filter="drop-shadow(0px 2px 2px rgba(0,0,0,0.2))"/>}
              {ALL_POS[path[path.length-1]] && <circle cx={ALL_POS[path[path.length-1]].cx} cy={ALL_POS[path[path.length-1]].cy} r={8} fill="#EF4444" stroke="#FFFFFF" strokeWidth={2.5} filter="drop-shadow(0px 2px 2px rgba(0,0,0,0.2))"/>}
            </>)}
          </g>
        </svg>
        <style>{`
          @keyframes dashAnim{to{stroke-dashoffset:-32}}
          @keyframes slideUp{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}
          @keyframes fadeIn{from{opacity:0;transform:scale(0.95)}to{opacity:1;transform:scale(1)}}
          .animate-slideUp{animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;}
          .animate-fadeIn{animation: fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;}
          .custom-scrollbar::-webkit-scrollbar { height: 4px; width: 4px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
        `}</style>
      </div>

      {/* BOTTOM PANEL: single tap selection */}
      {selectedId && !modalId && (
        <div className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:w-80 bg-white border border-gray-100 rounded-2xl p-4 z-20 shadow-2xl animate-slideUp">
          <div className="flex items-center justify-between mb-2">
            <div>
              <span className="text-lg font-extrabold text-gray-900">Booth {selectedId}</span>
              {selectedGroup.length > 1 && (
                <span className="ml-2 text-[10px] font-bold px-2 py-0.5 bg-violet-100 text-violet-600 rounded-full border border-violet-200">
                  Grup: {selectedGroupLabel}
                </span>
              )}
              {selectedTenant
                ? <span className="ml-2 text-sm font-semibold text-violet-600">{selectedTenant.user}</span>
                : <span className="ml-2 text-sm font-medium text-gray-400">Belum terisi</span>}
            </div>
            <button onClick={() => { setSelectedId(null); setSelectedGroup([]); }} className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-700 transition-colors">✕</button>
          </div>
          {selectedGroup.length > 1 && (
            <div className="flex gap-1 flex-wrap mb-2">
              {selectedGroup.map(b => (
                <span key={b} className={`text-[10px] px-2 py-0.5 rounded font-bold border ${b===selectedId?"bg-violet-600 text-white border-violet-600":"bg-violet-50 text-violet-600 border-violet-200"}`}>{b}</span>
              ))}
            </div>
          )}
          {selectedTenant && (
            <>
              <div className="flex gap-1.5 mt-1 mb-4 flex-wrap">
                {selectedTenant.fandoms.map(f => (
                  <span key={f} className="text-[10px] font-bold px-2 py-0.5 bg-violet-50 border border-violet-100 text-violet-600 rounded-full">{f}</span>
                ))}
              </div>
              <button onClick={() => { setModalId(selectedId); setSelectedId(null); setSelectedGroup([]); }}
                className="w-full py-2.5 bg-violet-600 text-white text-sm font-bold rounded-xl shadow-sm shadow-violet-200 hover:bg-violet-700 active:scale-[0.98] transition-all">
                Lihat Detail & Katalog
              </button>
            </>
          )}
          {!selectedTenant && <p className="text-xs text-gray-400 font-medium mt-1">Booth ini masih kosong.</p>}
        </div>
      )}

      {/* MODAL: double tap */}
      {modalId && tenants[modalId] && (
        <BoothModal boothId={modalId} tenant={tenants[modalId]} onClose={() => setModalId(null)}
          onNavigate={id => { setTab("path"); setPathTo(id); setModalId(null); }}/>
      )}
    </div>
  );
}