"use client";
import { useState, useEffect, useRef, useCallback, useMemo, memo } from "react";

// ─── SHARED DATA (loaded from API) ───────────────────────────────────────────
const DEFAULT_FANDOMS = ["Genshin Impact", "Honkai Star Rail", "Blue Archive", "Hololive", "Nijisanji", "Attack on Titan", "Demon Slayer", "Jujutsu Kaisen", "One Piece", "Naruto", "BTS", "ENHYPEN", "SEVENTEEN", "Stray Kids", "NewJeans", "Valorant", "League of Legends", "Minecraft", "Elden Ring", "Final Fantasy", "My Hero Academia", "Spy x Family", "Chainsaw Man", "Frieren", "Bocchi the Rock", "Vtuber Original", "Original Art", "Webtoon", "Light Novel", "Cosplay", "Arknights", "Honkai Impact", "Gachiakuta", "Gakuen Idolmaster", "Arknights Endfield"];

function getSearchCounts() { try { return JSON.parse(localStorage.getItem("cp6_sc") || "{}"); } catch { return {}; } }
function incrementSearch(f) { const c = getSearchCounts(); c[f] = (c[f] || 0) + 1; localStorage.setItem("cp6_sc", JSON.stringify(c)); }
function getTopFandoms(fandoms, n = 12) { const c = getSearchCounts(); return [...fandoms].sort((a, b) => (c[b] || 0) - (c[a] || 0)).slice(0, n); }

// ─── GEOMETRY ─────────────────────────────────────────────────────────────────
// Reference layout: N01-N14 top-left, then gap (bathroom label), then O01-O16 top-right
// Main hall: A-M columns (13 cols), each col has 2 sub-cols × 32 rows (split upper/lower)
// P zone: right of M col (P01-P28, grouped)
// X zones: special areas on right side
const LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M"];
const pad = n => String(n).padStart(2, "0");
const BW = 30, BH = 22, BG = 2;
const INNER = 3;
const AISLE = 30;
const SX = 70;
const ROW_Y = 20;
const UY = 68;
const LY = 345;
const CW_CLUSTER = 2 * (BW + INNER) + AISLE;

function buildPositions() {
  const pos = {};

  // N01–N14: 1 cluster rapat berjejer ke kanan dari SX, tanpa aisle gap antar booth
  for (let i = 1; i <= 14; i++) {
    pos["N" + pad(i)] = { cx: SX + (i - 1) * (BW + INNER) + BW / 2, cy: ROW_Y + BH / 2 };
  }
  const N_RIGHT = SX + 14 * (BW + INNER); // ujung kanan N14

  // O01–O16: 1 cluster rapat berjejer, dimulai setelah gap bathroom label dari N14
  const BATHROOM_GAP = 90; // gap untuk label bathroom
  const OX = N_RIGHT + BATHROOM_GAP;
  for (let i = 1; i <= 16; i++) {
    pos["O" + pad(i)] = { cx: OX + (i - 1) * (BW + INNER) + BW / 2, cy: ROW_Y + BH / 2 };
  }

  // Main hall booths A–M: each letter = 1 cluster (left col + right col), 32 booths per letter
  // Upper half: rows 9-16 (left col) and 17-24 (right col), top to bottom
  // Lower half: rows 1-8 (left col, bottom to top) and 25-32 (right col, top to bottom)
  LETTERS.forEach((l, li) => {
    const clX = SX + li * CW_CLUSTER;
    const lx = clX, rx = clX + BW + INNER;
    [16, 15, 14, 13, 12, 11, 10, 9].forEach((n, ri) => { pos[l + pad(n)] = { cx: lx + BW / 2, cy: UY + ri * (BH + BG) + BH / 2 }; });
    [17, 18, 19, 20, 21, 22, 23, 24].forEach((n, ri) => { pos[l + pad(n)] = { cx: rx + BW / 2, cy: UY + ri * (BH + BG) + BH / 2 }; });
    [8, 7, 6, 5, 4, 3, 2, 1].forEach((n, ri) => { pos[l + pad(n)] = { cx: lx + BW / 2, cy: LY + ri * (BH + BG) + BH / 2 }; });
    [25, 26, 27, 28, 29, 30, 31, 32].forEach((n, ri) => { pos[l + pad(n)] = { cx: rx + BW / 2, cy: LY + ri * (BH + BG) + BH / 2 }; });
  });

  // P zone: right of M column, 3 groups matching reference (P14-P15 top, down to P01-P28)
  const PX = SX + LETTERS.length * CW_CLUSTER + 20;
  // Reference: P14,P15 / P13,P16 / P12,P17 / P11,P18 / P10,P19  (group1: upper)
  //            P09,P20 / P08,P21 / P07,P22 / P06,P23             (group2: gap)
  //            P05,P24 / P04,P25 / P03,P26 / P02,P27 / P01,P28  (group3: lower)
  const pg = [[[14, 15], [13, 16], [12, 17], [11, 18], [10, 19]], [[9, 20], [8, 21], [7, 22], [6, 23]], [[5, 24], [4, 25], [3, 26], [2, 27], [1, 28]]];
  let pr = 0;
  pg.forEach((g, gi) => { if (gi > 0) pr += 1.5; g.forEach(([l, r]) => { const cy = UY + pr * (BH + BG) + BH / 2; pos["P" + pad(l)] = { cx: PX + BW / 2, cy }; pos["P" + pad(r)] = { cx: PX + BW + INNER + BW / 2, cy }; pr++; }); });

  return pos;
}
const POS = buildPositions();
const CW = Math.max(...Object.values(POS).map(p => p.cx)) + 260;
const CH = Math.max(...Object.values(POS).map(p => p.cy)) + 185;

// ─── AISLE WAYPOINTS ──────────────────────────────────────────────────────────
const A_TOP_Y = UY - 20;
const A_MID_Y = (UY + 8 * (BH + BG) + LY) / 2;
const A_BOT_Y = LY + 8 * (BH + BG) + 18;
const A_TIERS = [A_TOP_Y, A_MID_Y, A_BOT_Y];

const AISLE_XS = [];
for (let li = 0; li <= LETTERS.length; li++) {
  const clX = SX + li * CW_CLUSTER;
  AISLE_XS.push(clX - AISLE / 2);
}
AISLE_XS.push(SX + LETTERS.length * CW_CLUSTER + 10);

const AISLE_NODES = {};
AISLE_XS.forEach((ax, ai) => {
  A_TIERS.forEach((ay, ti) => {
    AISLE_NODES[`_a${ai}_${ti}`] = { cx: ax, cy: ay };
  });
});

const ALL_NODES = { ...POS, ...AISLE_NODES };

// ─── GRAPH ────────────────────────────────────────────────────────────────────
function getAllBooths() {
  const ids = [];
  for (let i = 1; i <= 14; i++) ids.push("N" + pad(i));
  for (let i = 1; i <= 16; i++) ids.push("O" + pad(i));
  LETTERS.forEach(l => { for (let n = 1; n <= 32; n++) ids.push(l + pad(n)); });
  for (let i = 1; i <= 28; i++) ids.push("P" + pad(i));
  return ids;
}
const ALL_BOOTHS = getAllBooths();

function buildGraph() {
  const g = {};
  Object.keys(ALL_NODES).forEach(id => { g[id] = []; });

  for (let ai = 0; ai < AISLE_XS.length; ai++) {
    for (let ti = 0; ti < A_TIERS.length; ti++) {
      const cur = `_a${ai}_${ti}`;
      if (ti + 1 < A_TIERS.length) {
        const nb = `_a${ai}_${ti + 1}`;
        const d = Math.abs(A_TIERS[ti] - A_TIERS[ti + 1]);
        g[cur].push({ id: nb, d }); g[nb].push({ id: cur, d });
      }
      if (ai + 1 < AISLE_XS.length) {
        const nb = `_a${ai + 1}_${ti}`;
        const d = Math.abs(AISLE_XS[ai] - AISLE_XS[ai + 1]);
        g[cur].push({ id: nb, d }); g[nb].push({ id: cur, d });
      }
    }
  }

  ALL_BOOTHS.forEach(bid => {
    const bp = POS[bid]; if (!bp) return;
    const sorted = AISLE_XS.map((ax, ai) => ({ ai, dx: Math.abs(bp.cx - ax) })).sort((a, b) => a.dx - b.dx);
    sorted.slice(0, 2).forEach(({ ai, dx }) => {
      if (dx > CW_CLUSTER * 1.5) return;
      A_TIERS.forEach((ay, ti) => {
        const aid = `_a${ai}_${ti}`;
        const d = Math.hypot(bp.cx - AISLE_XS[ai], bp.cy - ay);
        g[bid].push({ id: aid, d }); g[aid].push({ id: bid, d });
      });
    });
  });
  return g;
}
const GRAPH = buildGraph();

function aStar(start, goal) {
  if (start === goal) return [start];
  if (!ALL_NODES[start] || !ALL_NODES[goal]) return [];
  const h = (a, b) => { const pa = ALL_NODES[a], pb = ALL_NODES[b]; return pa && pb ? Math.hypot(pa.cx - pb.cx, pa.cy - pb.cy) : 0; };
  const open = new Set([start]), from = {}, gS = { [start]: 0 }, fS = { [start]: h(start, goal) };
  while (open.size) {
    let cur = null, lf = Infinity;
    open.forEach(id => { const v = fS[id] ?? Infinity; if (v < lf) { lf = v; cur = id; } });
    if (cur === goal) { const p = [goal]; let n = goal; while (from[n]) { n = from[n]; p.unshift(n); } return p; }
    open.delete(cur);
    for (const { id: nb, d } of (GRAPH[cur] || [])) {
      const tg = (gS[cur] ?? Infinity) + d;
      if (tg < (gS[nb] ?? Infinity)) { from[nb] = cur; gS[nb] = tg; fS[nb] = tg + h(nb, goal); open.add(nb); }
    }
  }
  return [start, goal];
}

function svgPath(ids) {
  if (ids.length < 2) return "";
  const pts = ids.map(id => ALL_NODES[id]).filter(Boolean);
  if (pts.length < 2) return "";
  let d = `M${pts[0].cx},${pts[0].cy}`;
  for (let i = 1; i < pts.length - 1; i++) { const mx = (pts[i].cx + pts[i + 1].cx) / 2, my = (pts[i].cy + pts[i + 1].cy) / 2; d += ` Q${pts[i].cx},${pts[i].cy} ${mx},${my}`; }
  return d + ` L${pts[pts.length - 1].cx},${pts[pts.length - 1].cy}`;
}

// ─── TENANTS ─────────────────────────────────────────────────────────────────
function buildTenants(users, catalogMap, pricesMap) {
  const t = {};
  users.forEach(u => {
    if (!u.booths?.length) return;
    const catalog = catalogMap[u.id] || [];
    const prices = pricesMap[u.id] || [];
    u.booths.forEach(b => { t[b] = { userId: u.id, user: u.name, fandoms: u.fandoms, catalog, prices, allBooths: u.booths }; });
  });
  return t;
}

// ─── BOOTH RECT — NeoBrutalism ───────────────────────────────────────────────
const BoothRect = memo(function BoothRect({ id, state, onClick }) {
  const p = POS[id]; if (!p) return null;
  const C = {
    empty:     { fill: "#FFFDF5", stroke: "#000" },
    occupied:  { fill: "#C4B5FD", stroke: "#000" },
    matched:   { fill: "#FACC15", stroke: "#000" },
    selected:  { fill: "#FB923C", stroke: "#000" },
    pathStart: { fill: "#4ADE80", stroke: "#000" },
    pathEnd:   { fill: "#F87171", stroke: "#000" },
    onPath:    { fill: "#FDE047", stroke: "#000" },
  }[state] || { fill: "#FFFDF5", stroke: "#000" };
  return (
    <g onClick={() => onClick(id)} style={{ cursor: "pointer" }}>
      <rect x={p.cx - BW/2 + 2} y={p.cy - BH/2 + 2} width={BW} height={BH} rx={2} fill="#000" />
      <rect x={p.cx - BW/2} y={p.cy - BH/2} width={BW} height={BH} rx={2} fill={C.fill} stroke={C.stroke} strokeWidth={1.5} />
      <text x={p.cx} y={p.cy} textAnchor="middle" dominantBaseline="central" fontSize={6} fontWeight={900} fill="#000" fontFamily="monospace" style={{ userSelect:"none", pointerEvents:"none" }}>{id}</text>
    </g>
  );
});

// ─── MODAL — NeoBrutalism ────────────────────────────────────────────────────
function BoothModal({ boothId, tenant, onClose, onNavigate }) {
  const [idx, setIdx] = useState(0);
  const cat = tenant?.catalog || [], prices = tenant?.prices || [];
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div className="relative w-full sm:max-w-md max-h-[90vh] flex flex-col overflow-hidden"
        style={{ background:"#FFFDF5", border:"3px solid #000", boxShadow:"6px 6px 0 #000", animation:"slideUp .25s ease forwards" }}
        onClick={e => e.stopPropagation()}>
        {/* Handle bar mobile */}
        <div className="flex justify-center pt-3 sm:hidden"><div className="w-10 h-1 bg-black rounded-full" /></div>
        {/* Header */}
        <div className="shrink-0 px-5 py-4" style={{ borderBottom:"2px solid #000", background:"#FACC15" }}>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xl font-black tracking-tight">BOOTH {boothId}</span>
                {tenant?.user && <span className="text-xs font-black px-2 py-0.5 bg-black text-yellow-300" style={{letterSpacing:"0.05em"}}>{tenant.user}</span>}
              </div>
              {tenant?.allBooths?.length > 1 && (
                <div className="flex gap-1 mt-1.5 flex-wrap">
                  {tenant.allBooths.map(b => <span key={b} style={b===boothId?{background:"#000",color:"#FACC15",border:"2px solid #000",fontWeight:900,fontSize:"10px",padding:"1px 6px"}:{background:"#FFFDF5",color:"#000",border:"2px solid #000",fontWeight:900,fontSize:"10px",padding:"1px 6px"}}>{b}</span>)}
                </div>
              )}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {tenant?.fandoms.map(f => <span key={f} style={{fontSize:"10px",fontWeight:700,padding:"1px 8px",background:"#fff",border:"1.5px solid #000"}}>{f}</span>)}
              </div>
            </div>
            <button onClick={onClose} style={{width:32,height:32,background:"#000",color:"#FACC15",fontWeight:900,fontSize:16,border:"2px solid #000",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
          </div>
        </div>
        {/* Body */}
        <div className="overflow-y-auto px-5 py-4 space-y-4 flex-1">
          <button onClick={() => { onNavigate(boothId); onClose(); }}
            style={{width:"100%",padding:"10px",background:"#000",color:"#FACC15",fontWeight:900,fontSize:13,border:"2px solid #000",cursor:"pointer",boxShadow:"3px 3px 0 #FACC15",letterSpacing:"0.05em",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
            🗺️ TAMPILKAN RUTE KE BOOTH INI
          </button>
          <div>
            <h3 style={{fontWeight:900,fontSize:12,letterSpacing:"0.1em",borderBottom:"2px solid #000",paddingBottom:4,marginBottom:10}}>KATALOG</h3>
            {cat.length === 0
              ? <div style={{textAlign:"center",padding:"24px",border:"2px dashed #000",background:"#f5f5f5"}}><div style={{fontSize:28,opacity:0.3,marginBottom:6}}>🖼️</div><p style={{fontSize:11,fontWeight:700,color:"#666"}}>Belum ada katalog</p></div>
              : <div>
                <div style={{border:"2px solid #000",overflow:"hidden",aspectRatio:"1",background:"#eee"}}>
                  <img src={cat[idx]?.url || cat[idx]} alt="catalog" style={{width:"100%",height:"100%",objectFit:"cover"}} loading="lazy" />
                </div>
                {cat.length > 1 && <div style={{display:"flex",gap:6,overflowX:"auto",paddingTop:8}}>
                  {cat.map((img, i) => <button key={i} onClick={() => setIdx(i)} style={{flexShrink:0,width:56,height:56,overflow:"hidden",border:i===idx?"3px solid #000":"2px solid #ccc",opacity:i===idx?1:0.6,cursor:"pointer",padding:0,background:"none"}}>
                    <img src={img?.url || img} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}} loading="lazy" />
                  </button>)}
                </div>}
              </div>
            }
          </div>
          <div className="pb-4">
            <h3 style={{fontWeight:900,fontSize:12,letterSpacing:"0.1em",borderBottom:"2px solid #000",paddingBottom:4,marginBottom:10}}>DAFTAR HARGA</h3>
            {prices.length === 0
              ? <div style={{textAlign:"center",padding:"16px",border:"2px dashed #000",background:"#f5f5f5"}}><p style={{fontSize:11,fontWeight:700,color:"#666"}}>Belum ada daftar harga</p></div>
              : <div style={{border:"2px solid #000",overflow:"hidden"}}>
                <table style={{width:"100%",fontSize:13,borderCollapse:"collapse"}}>
                  <thead><tr style={{background:"#FACC15",borderBottom:"2px solid #000"}}>
                    <th style={{textAlign:"left",padding:"8px 12px",fontWeight:900,fontSize:11,letterSpacing:"0.08em"}}>ITEM</th>
                    <th style={{textAlign:"right",padding:"8px 12px",fontWeight:900,fontSize:11,letterSpacing:"0.08em"}}>HARGA</th>
                  </tr></thead>
                  <tbody>{prices.map((p, i) => <tr key={i} style={{borderTop:"1.5px solid #000",background:i%2===0?"#FFFDF5":"#fff"}}>
                    <td style={{padding:"8px 12px",fontWeight:600}}>{p.item}</td>
                    <td style={{padding:"8px 12px",textAlign:"right",fontWeight:900}}>Rp {parseInt(p.price).toLocaleString("id-ID")}</td>
                  </tr>)}</tbody>
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
export default function FloorMap() {
  const [users, setUsers] = useState([]);
  const [fandoms, setFandoms] = useState(DEFAULT_FANDOMS);
  const [tenants, setTenants] = useState({});
  const [search, setSearch] = useState("");
  const [selFandom, setSelFandom] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [showSugg, setShowSugg] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [modalId, setModalId] = useState(null);
  const [tab, setTab] = useState("search");
  const [pathFrom, setPathFrom] = useState("");
  const [pathTo, setPathTo] = useState("");
  const [fullPath, setFullPath] = useState([]);
  const [dispPath, setDispPath] = useState([]);
  const [showPath, setShowPath] = useState(false);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const [scale, setScale] = useState(1);
  const containerRef = useRef(null);
  const [showMapTip, setShowMapTip] = useState(false);
  const lastTouch = useRef(null);
  const lastDist = useRef(null);
  const pinching = useRef(false);
  const clickTimer = useRef(null);
  const searchRef = useRef(null);

  //
  useEffect(() => {
    // Tampilkan notifikasi penggunaan map (maks 3x per device)
    try {
      setShowMapTip(true);
    } catch { }
  }, []);

  // Load data from API on mount
  useEffect(() => {
    async function loadData() {
      try {
        const [usersRes, fandomsRes] = await Promise.all([
          fetch("/api/users"),
          fetch("/api/fandoms"),
        ]);
        const usersData = await usersRes.json();
        const fandomsData = await fandomsRes.json();

        // Load catalogs and prices for users with booths
        const usersWithBooths = usersData.filter(u => u.booths?.length > 0);
        const catalogMap = {};
        const pricesMap = {};

        if (usersWithBooths.length > 0) {
          const [catalogResults, priceResults] = await Promise.all([
            Promise.all(usersWithBooths.map(u => fetch(`/api/catalog?userId=${u.id}`).then(r => r.json()).catch(() => []))),
            Promise.all(usersWithBooths.map(u => fetch(`/api/prices?userId=${u.id}`).then(r => r.json()).catch(() => []))),
          ]);
          usersWithBooths.forEach((u, i) => {
            catalogMap[u.id] = catalogResults[i];
            pricesMap[u.id] = priceResults[i];
          });
        }

        setUsers(usersData);
        setFandoms(fandomsData);
        setTenants(buildTenants(usersData, catalogMap, pricesMap));
      } catch (err) {
        console.error("Failed to load data:", err);
      }
    }
    loadData();
  }, []);

  useEffect(() => {
    if (!search.trim()) { setSuggestions([]); return; }
    const q = search.toLowerCase(), counts = getSearchCounts();
    setSuggestions(fandoms.filter(f => f.toLowerCase().includes(q) && f.toLowerCase() !== q).sort((a, b) => (counts[b] || 0) - (counts[a] || 0)).slice(0, 8));
  }, [search, fandoms]);

  const searchTerm = selFandom || search;
  const isMatch = useCallback(id => {
    if (!searchTerm) return false;
    const t = tenants[id]; if (!t) return false;
    return t.fandoms.some(f => f.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [searchTerm, tenants]);
  const matchedSet = useMemo(() => new Set(ALL_BOOTHS.filter(isMatch)), [isMatch]);
  const pathBoothSet = useMemo(() => new Set(dispPath), [dispPath]);
  const topFandoms = useMemo(() => getTopFandoms(fandoms, 12), [fandoms]);

  function clamp(x, y, s, W, H) {
    const mw = CW * s, mh = CH * s;
    return { x: mw < W ? (W - mw) / 2 : Math.min(0, Math.max(W - mw, x)), y: mh < H ? (H - mh) / 2 : Math.min(0, Math.max(H - mh, y)) };
  }

  // Fit to screen on mount
  useEffect(() => {
    const el = containerRef.current; if (!el) return;
    const s = Math.min((el.clientWidth - 8) / CW, (el.clientHeight - 8) / CH, 1);
    setScale(s); const c = clamp(0, 0, s, el.clientWidth, el.clientHeight); setTx(c.x); setTy(c.y);
  }, []);

  function resetView() {
    const el = containerRef.current; if (!el) return;
    const s = Math.min((el.clientWidth - 8) / CW, (el.clientHeight - 8) / CH, 1);
    setScale(s); const c = clamp(0, 0, s, el.clientWidth, el.clientHeight); setTx(c.x); setTy(c.y);
  }

  // Touch & wheel
  useEffect(() => {
    const el = containerRef.current; if (!el) return;
    const gW = () => el.clientWidth, gH = () => el.clientHeight;
    const gd = t => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    const gm = t => ({ x: (t[0].clientX + t[1].clientX) / 2, y: (t[0].clientY + t[1].clientY) / 2 });
    const onTS = e => { if (e.touches.length === 2) { pinching.current = true; lastDist.current = gd(e.touches); lastTouch.current = gm(e.touches); e.preventDefault(); } else { pinching.current = false; lastTouch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; } };
    const onTM = e => {
      if (e.touches.length === 2) {
        e.preventDefault(); const d = gd(e.touches), m = gm(e.touches), ds = d / (lastDist.current || d);
        setScale(ps => { const ns = Math.min(Math.max(ps * ds, 0.25), 5); const dx = m.x - (lastTouch.current?.x || m.x), dy = m.y - (lastTouch.current?.y || m.y); setTx(px => clamp(px + dx, 0, ns, gW(), gH()).x); setTy(py => clamp(0, py + dy, ns, gW(), gH()).y); return ns; });
        lastDist.current = d; lastTouch.current = m;
      } else if (e.touches.length === 1 && !pinching.current) {
        const dx = e.touches[0].clientX - (lastTouch.current?.x || 0), dy = e.touches[0].clientY - (lastTouch.current?.y || 0);
        setTx(px => clamp(px + dx, 0, scale, gW(), gH()).x); setTy(py => clamp(0, py + dy, scale, gW(), gH()).y);
        lastTouch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    };
    const onTE = () => { pinching.current = false; };
    const onW = e => {
      e.preventDefault(); const rect = el.getBoundingClientRect(); const mx = e.clientX - rect.left, my = e.clientY - rect.top; const ds = e.deltaY < 0 ? 1.12 : 0.9;
      setScale(ps => { const ns = Math.min(Math.max(ps * ds, 0.25), 5); const c = clamp(mx - (mx - tx) * (ns / ps), my - (my - ty) * (ns / ps), ns, gW(), gH()); setTx(c.x); setTy(c.y); return ns; });
    };
    el.addEventListener("touchstart", onTS, { passive: false }); el.addEventListener("touchmove", onTM, { passive: false }); el.addEventListener("touchend", onTE); el.addEventListener("wheel", onW, { passive: false });
    return () => { el.removeEventListener("touchstart", onTS); el.removeEventListener("touchmove", onTM); el.removeEventListener("touchend", onTE); el.removeEventListener("wheel", onW); };
  }, [scale, tx, ty]);

  // Booth click: single=select group, double=modal
  function handleBoothClick(id) {
    if (tab === "path") {
      if (!pathFrom) { setPathFrom(id); return; }
      if (!pathTo && id !== pathFrom) { setPathTo(id); return; }
    }
    if (clickTimer.current) { clearTimeout(clickTimer.current); clickTimer.current = null; if (tenants[id]) { setModalId(id); setSelectedId(null); } }
    else { clickTimer.current = setTimeout(() => { clickTimer.current = null; setSelectedId(prev => prev === id ? null : id); }, 270); }
  }

  function handleFindPath() {
    if (!pathFrom || !pathTo) return;
    const fp = aStar(pathFrom, pathTo);
    setFullPath(fp);
    setDispPath(fp.filter(id => !id.startsWith("_a")));
    setShowPath(true);
  }
  function resetPath() { setPathFrom(""); setPathTo(""); setFullPath([]); setDispPath([]); setShowPath(false); }
  function selectSuggestion(f) { incrementSearch(f); setSelFandom(f); setSearch(f); setSuggestions([]); setShowSugg(false); }

  // Selected group: all booths of same user
  const selectedGroup = useMemo(() => {
    if (!selectedId) return new Set();
    const t = tenants[selectedId]; if (!t) return new Set([selectedId]);
    return new Set(t.allBooths || [selectedId]);
  }, [selectedId, tenants]);

  function getState(id) {
    if (showPath) {
      if (id === pathFrom) return "pathStart";
      if (id === pathTo) return "pathEnd";
      if (pathBoothSet.has(id)) return "onPath";
    }
    if (matchedSet.has(id)) return "matched";
    if (selectedGroup.has(id)) return "selected";
    if (tenants[id]) return "occupied";
    return "empty";
  }

  // Zone layout sesuai denah referensi
  const LOWER_BOT = LY + 8 * (BH + BG);
  const STRIP_Y = LOWER_BOT + 38;
  const STRIP_H = CH - STRIP_Y - 28;
  const RZ_X = SX + LETTERS.length * CW_CLUSTER + 20; // same as PX

  // Right-side X zones: positioned to the right of P column
  // From reference: Creative Zone label mid-right, then Visitor Idle Area (green), Community Stage (yellow top-right)
  // X7 (large box center-right), X8/X9 (stacked), X13/X14 pairs (far right)
  const PX = SX + LETTERS.length * CW_CLUSTER + 20;
  const P_RIGHT = PX + 2 * BW + INNER + 8; // right edge of P col + gap

  // X zone column positions (right side of map)
  const XZ1 = P_RIGHT + 8;           // Creative Zone / X7 area
  const XZ2 = XZ1 + 68 + 8;          // X8/X9 col
  const XZ3 = XZ2 + 50 + 8;          // Community Stage / Visitor Idle
  const XZ4 = XZ3 + 90 + 8;          // X13/X14 col 1
  const XZ5 = XZ4 + 55 + 8;          // X13/X14 col 2

  const UPPER_BOT = UY + 8 * (BH + BG);
  const FULL_H = LOWER_BOT - UY + 8; // full hall height

  const zones = useMemo(() => [
    // ── Bottom strip zones ──
    { label: "Guild Area", x: SX - 10, y: STRIP_Y, w: 310, h: STRIP_H, f: "#EFF6FF", s: "#BAE6FD", t: "#0369A1" },
    { label: "Comic Class\nArea", x: SX + 305, y: STRIP_Y, w: 175, h: STRIP_H, f: "#FDF2F8", s: "#F9A8D4", t: "#BE185D" },
    { label: "Visitor\nStorage", x: SX + 485, y: STRIP_Y, w: 95, h: STRIP_H, f: "#F8FAFC", s: "#E2E8F0", t: "#64748B" },
    { label: "Community Area", x: SX + 585, y: STRIP_Y, w: 370, h: STRIP_H, f: "#FEFCE8", s: "#FDE68A", t: "#B45309" },

    // ── Right-side zones (vertical, matching reference) ──
    // Creative Zone: right of P booths, upper half
    { label: "Creative\nZone", x: XZ1, y: UY - 2, w: 65, h: UPPER_BOT - UY + 8, f: "#FAF5FF", s: "#E9D5FF", t: "#9333EA" },
    // X7: large box spanning both halves (center-right)
    { label: "X7", x: XZ1, y: LY - 16, w: 65, h: LOWER_BOT - LY + 24, f: "#FAF5FF", s: "#E9D5FF", t: "#9333EA" },

    // X08: stacked upper
    { label: "X08", x: XZ2, y: UY - 2, w: 48, h: (UPPER_BOT - UY) / 2 - 2, f: "#FAF5FF", s: "#E9D5FF", t: "#9333EA" },
    // X09 & X12 stacked
    { label: "X09\nX12", x: XZ2, y: UY + (UPPER_BOT - UY) / 2 + 2, w: 48, h: (UPPER_BOT - UY) / 2 - 2, f: "#FAF5FF", s: "#E9D5FF", t: "#9333EA" },
    // X10 lower
    { label: "X10", x: XZ2, y: LY - 16, w: 48, h: (LOWER_BOT - LY) / 2 + 8, f: "#FAF5FF", s: "#E9D5FF", t: "#9333EA" },
    // X11
    { label: "X11", x: XZ2, y: LY + (LOWER_BOT - LY) / 2 - 4, w: 48, h: (LOWER_BOT - LY) / 2 + 28, f: "#FAF5FF", s: "#E9D5FF", t: "#9333EA" },

    // Community Stage: top-right corner (yellow)
    { label: "Community\nStage", x: XZ3, y: UY - 2, w: 130, h: (FULL_H) * 0.38, f: "#FEFCE8", s: "#FDE68A", t: "#92400E" },
    // Visitor Idle Area: below Community Stage (green)
    { label: "Visitor Idle\nArea", x: XZ3, y: UY + (FULL_H) * 0.38 + 4, w: 130, h: (FULL_H) * 0.42 - 4, f: "#F0FDF4", s: "#86EFAC", t: "#16A34A" },
    // X13 upper (paired: left)
    { label: "X13", x: XZ4, y: UY + (FULL_H) * 0.38 + 4, w: 52, h: (FULL_H) * 0.20, f: "#FAF5FF", s: "#E9D5FF", t: "#9333EA" },
    // X14 upper (paired: right)
    { label: "X13", x: XZ5, y: UY + (FULL_H) * 0.38 + 4, w: 52, h: (FULL_H) * 0.20, f: "#FAF5FF", s: "#E9D5FF", t: "#9333EA" },
    // X13 lower (paired: left)
    { label: "X14", x: XZ4, y: UY + (FULL_H) * 0.60 + 4, w: 52, h: (FULL_H) * 0.22, f: "#FAF5FF", s: "#E9D5FF", t: "#9333EA" },
    // X14 lower (paired: right)
    { label: "X14", x: XZ5, y: UY + (FULL_H) * 0.60 + 4, w: 52, h: (FULL_H) * 0.22, f: "#FAF5FF", s: "#E9D5FF", t: "#9333EA" },

    // Right-edge vertical X zones (X15-X19 stacked far right)
    { label: "X15", x: XZ5 + 56, y: UY - 2, w: 28, h: (FULL_H) * 0.18, f: "#FAF5FF", s: "#E9D5FF", t: "#9333EA" },
    { label: "X16", x: XZ5 + 56, y: UY + (FULL_H) * 0.19, w: 28, h: (FULL_H) * 0.18, f: "#FAF5FF", s: "#E9D5FF", t: "#9333EA" },
    { label: "X17", x: XZ5 + 56, y: UY + (FULL_H) * 0.38, w: 28, h: (FULL_H) * 0.18, f: "#FAF5FF", s: "#E9D5FF", t: "#9333EA" },
    { label: "X18", x: XZ5 + 56, y: UY + (FULL_H) * 0.57, w: 28, h: (FULL_H) * 0.18, f: "#FAF5FF", s: "#E9D5FF", t: "#9333EA" },
    { label: "X19", x: XZ5 + 56, y: UY + (FULL_H) * 0.76, w: 28, h: (FULL_H) * 0.24, f: "#FAF5FF", s: "#E9D5FF", t: "#9333EA" },

    // Bottom-right strip for community area sub-zones (X01-X10 row at bottom)
    { label: "X01", x: SX + 480, y: STRIP_Y + 4, w: 32, h: STRIP_H - 8, f: "#FAF5FF", s: "#E9D5FF", t: "#9333EA" },
  ], [STRIP_Y, STRIP_H, XZ1, XZ2, XZ3, XZ4, XZ5, PX, UPPER_BOT, FULL_H]);

  const sp = showPath && fullPath.length >= 2 ? svgPath(fullPath) : "";
  const midY = (UY + 8 * (BH + BG) + LY) / 2;

  // NeoBrutalism color tokens
  const NB = {
    bg: "#FFFDF5",
    yellow: "#FACC15",
    black: "#000000",
    white: "#FFFFFF",
    purple: "#C4B5FD",
    green: "#4ADE80",
    red: "#F87171",
    orange: "#FB923C",
  };
  const nbBtn = {
    background: NB.yellow, color: NB.black, border: "2.5px solid #000",
    fontWeight: 900, cursor: "pointer", boxShadow: "3px 3px 0 #000",
    letterSpacing: "0.05em", fontSize: 12, padding: "8px 14px",
    transition: "box-shadow .1s,transform .1s",
  };
  const nbBtnActive = { ...nbBtn, background: NB.black, color: NB.yellow };
  const nbInput = {
    border: "2.5px solid #000", background: NB.white, fontWeight: 700,
    fontSize: 13, padding: "8px 10px", outline: "none", width: "100%",
    boxSizing: "border-box", fontFamily: "monospace",
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", background:NB.bg, overflow:"hidden", height:"100dvh", fontFamily:"'Space Grotesk',system-ui,sans-serif" }}>
      <style>{`
        @keyframes dashAnim{to{stroke-dashoffset:-32}}
        @keyframes slideUp{from{opacity:0;transform:translateY(32px)}to{opacity:1;transform:translateY(0)}}
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;700;900&display=swap');
        .nb-btn:active{box-shadow:1px 1px 0 #000!important;transform:translate(2px,2px)!important}
        .nb-tag{display:inline-block;padding:2px 8px;border:2px solid #000;font-weight:800;font-size:10px;background:#FFFDF5;cursor:pointer}
        .nb-tag-active{background:#000;color:#FACC15}
        .nb-sugg-item:hover{background:#FACC15}
      `}</style>

      {/* ── HEADER ── */}
      <div style={{ background:NB.yellow, borderBottom:"3px solid #000", padding:"10px 16px", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0, zIndex:20 }}>
        <div>
          <h1 style={{ margin:0, fontWeight:900, fontSize:18, letterSpacing:"-0.02em", lineHeight:1.1 }}>
            COMIPARA 6 <span style={{ background:NB.black, color:NB.yellow, fontSize:10, fontWeight:900, padding:"2px 8px", letterSpacing:"0.1em", verticalAlign:"middle" }}>MAP</span>
          </h1>
          <p style={{ margin:0, fontSize:10, fontWeight:700, color:"#555", letterSpacing:"0.04em" }}>TAP 1× PILIH · TAP 2× DETAIL · 2 JARI ZOOM</p>
        </div>
        <button className="nb-btn" style={nbBtn} onClick={resetView}>RESET VIEW</button>
      </div>

      {/* ── CONTROLS ── */}
      <div style={{ background:NB.white, borderBottom:"3px solid #000", padding:"10px 14px", flexShrink:0, zIndex:10 }}>
        {/* Tab switcher */}
        <div style={{ display:"flex", gap:0, marginBottom:10, border:"2.5px solid #000", width:"fit-content" }}>
          {[["search","🔍 FANDOM"],["path","🗺️ NAVIGASI"]].map(([t,l]) => (
            <button key={t} className="nb-btn" onClick={() => { setTab(t); if(t==="search") resetPath(); }}
              style={tab===t ? {...nbBtnActive, padding:"7px 14px"} : {...nbBtn, background:NB.white, color:NB.black, boxShadow:"none", padding:"7px 14px", borderRight: t==="search"?"2.5px solid #000":"none", borderLeft:"none", borderTop:"none", borderBottom:"none" }}>
              {l}
            </button>
          ))}
        </div>

        {tab === "search" && (
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            <div style={{ display:"flex", gap:8, position:"relative" }}>
              <div style={{ flex:1, position:"relative" }}>
                <input ref={searchRef} value={search}
                  onChange={e => { setSearch(e.target.value); setSelFandom(null); setShowSugg(true); }}
                  onFocus={() => setShowSugg(true)} onBlur={() => setTimeout(() => setShowSugg(false), 150)}
                  placeholder="Ketik fandom… (e.g. Genshin, Holo)"
                  style={nbInput} />
                {showSugg && suggestions.length > 0 && (
                  <div style={{ position:"absolute", top:"100%", left:0, right:0, background:NB.white, border:"2.5px solid #000", zIndex:50, marginTop:2, boxShadow:"4px 4px 0 #000" }}>
                    {suggestions.map(f => (
                      <button key={f} className="nb-sugg-item" onMouseDown={() => selectSuggestion(f)}
                        style={{ width:"100%", textAlign:"left", padding:"8px 12px", fontWeight:700, fontSize:12, background:"none", border:"none", borderBottom:"1.5px solid #000", cursor:"pointer", display:"flex", alignItems:"center", gap:8 }}>
                        🔍 {f}
                        {(getSearchCounts()[f]||0)>0 && <span style={{ marginLeft:"auto", fontSize:9, fontWeight:900, background:NB.black, color:NB.yellow, padding:"1px 5px" }}>{getSearchCounts()[f]}×</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button className="nb-btn" style={nbBtn} onClick={() => { setSearch(""); setSelFandom(null); setSelectedId(null); setSuggestions([]); }}>RESET</button>
            </div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:5, maxHeight:"3.6rem", overflowY:"auto" }}>
              {topFandoms.map(f => (
                <button key={f} className={`nb-tag ${(selFandom===f||search===f)?"nb-tag-active":""}`}
                  onClick={() => selectSuggestion(f)}>{f}</button>
              ))}
            </div>
            {searchTerm && <p style={{ margin:0, fontSize:11, fontWeight:800 }}>
              {matchedSet.size>0
                ? <><span style={{ color:"#7C3AED" }}>{matchedSet.size} BOOTH</span> ditemukan untuk "{searchTerm}"</>
                : <span style={{ color:"#DC2626" }}>TIDAK ADA HASIL</span>}
            </p>}
          </div>
        )}

        {tab === "path" && (
          <div style={{ background:"#F5F5F0", border:"2.5px solid #000", padding:"10px", display:"flex", flexDirection:"column", gap:8 }}>
            <p style={{ margin:0, fontSize:10, fontWeight:800, letterSpacing:"0.06em" }}>TAP 2 BOOTH DI PETA ATAU MASUKKAN ID MANUAL:</p>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
              <div style={{ display:"flex", alignItems:"center", gap:6, flex:1, minWidth:110, background:NB.white, border:"2.5px solid #000", padding:"4px 8px" }}>
                <span style={{ width:22,height:22,background:NB.green,border:"2px solid #000",fontWeight:900,fontSize:10,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>A</span>
                <input value={pathFrom} onChange={e => setPathFrom(e.target.value.toUpperCase())} placeholder="Mulai (e.g. A01)"
                  style={{ flex:1, border:"none", outline:"none", fontWeight:800, fontSize:13, fontFamily:"monospace", textTransform:"uppercase", background:"transparent" }} />
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:6, flex:1, minWidth:110, background:NB.white, border:"2.5px solid #000", padding:"4px 8px" }}>
                <span style={{ width:22,height:22,background:NB.red,border:"2px solid #000",fontWeight:900,fontSize:10,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>B</span>
                <input value={pathTo} onChange={e => setPathTo(e.target.value.toUpperCase())} placeholder="Tujuan (e.g. M32)"
                  style={{ flex:1, border:"none", outline:"none", fontWeight:800, fontSize:13, fontFamily:"monospace", textTransform:"uppercase", background:"transparent" }} />
              </div>
              <button className="nb-btn" style={{ ...nbBtn, opacity:(!pathFrom||!pathTo)?0.4:1 }} disabled={!pathFrom||!pathTo} onClick={handleFindPath}>CARI</button>
              <button className="nb-btn" style={{ ...nbBtn, background:NB.white, color:NB.black }} onClick={resetPath}>RESET</button>
            </div>
            {showPath && dispPath.length > 0 && (
              <div style={{ display:"flex", gap:4, flexWrap:"wrap", alignItems:"center", paddingTop:6, borderTop:"2px solid #000" }}>
                <span style={{ fontSize:10, fontWeight:800 }}>{dispPath.length} TITIK:</span>
                {dispPath.map((id,i) => <span key={id} style={{ fontSize:9, fontWeight:900, padding:"1px 5px", background: i===0?NB.green : i===dispPath.length-1?NB.red : NB.yellow, border:"1.5px solid #000" }}>{id}</span>)}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── LEGEND ── */}
      <div style={{ display:"flex", gap:10, padding:"6px 14px", background:"#F0EFE8", borderBottom:"2.5px solid #000", flexShrink:0, overflowX:"auto" }}>
        {[
          { bg:"#C4B5FD", label:"TERISI" },
          { bg:"#FACC15", label:"HASIL CARI" },
          { bg:"#FB923C", label:"DIPILIH" },
          { bg:"#4ADE80", label:"TITIK A" },
          { bg:"#F87171", label:"TITIK B" },
          { bg:"#FDE047", label:"JALUR" },
        ].map(({ bg, label }) => (
          <div key={label} style={{ display:"flex", alignItems:"center", gap:5, flexShrink:0 }}>
            <div style={{ width:16, height:12, background:bg, border:"2px solid #000" }} />
            <span style={{ fontSize:9, fontWeight:900, letterSpacing:"0.08em", whiteSpace:"nowrap" }}>{label}</span>
          </div>
        ))}
      </div>

      {/* ── MAP ── */}
      <div ref={containerRef} style={{ flex:1, overflow:"hidden", position:"relative", userSelect:"none", touchAction:"none", background:"#D4D0C4", minHeight:0 }}>
        <svg width="100%" height="100%" style={{ display:"block" }}>
          <defs>
            <pattern id="dotGrid" x="0" y="0" width="12" height="12" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="1" fill="#000" opacity="0.12" />
            </pattern>
          </defs>
          <g transform={`translate(${tx},${ty}) scale(${scale})`}>
            {/* Map background: hard shadow then main card */}
            <rect x={6} y={6} width={CW} height={CH} fill="#000" />
            <rect x={0} y={0} width={CW} height={CH} fill={NB.bg} stroke="#000" strokeWidth={3} />
            <rect x={0} y={0} width={CW} height={CH} fill="url(#dotGrid)" />

            {/* Section labels */}
            <text x={SX} y={13} fontSize={8} fill="#000" fontWeight={900} letterSpacing={2} fontFamily="monospace">N01 – N14</text>
            {(() => {
              const N_RIGHT = SX + 14 * (BW + INNER);
              const BATHROOM_GAP = 90;
              const midBath = N_RIGHT + BATHROOM_GAP / 2;
              return <text x={midBath} y={13} textAnchor="middle" fontSize={7} fill="#059669" fontWeight={900} letterSpacing={1} fontFamily="monospace">GO TO LIMITED ACCESS BATHROOM</text>;
            })()}
            {(() => {
              const N_RIGHT = SX + 14 * (BW + INNER);
              const BATHROOM_GAP = 90;
              const OX = N_RIGHT + BATHROOM_GAP;
              return <text x={OX} y={13} fontSize={8} fill="#000" fontWeight={900} letterSpacing={2} fontFamily="monospace">O01 – O16</text>;
            })()}
            <text x={SX} y={UY - 2} fontSize={8} fill="#000" fontWeight={900} letterSpacing={3} fontFamily="monospace">COMIC HALL</text>
            <line x1={SX-10} y1={midY} x2={SX + LETTERS.length * CW_CLUSTER + 75} y2={midY} stroke="#000" strokeWidth={1.5} strokeDasharray="8 5" />
            <text x={(SX + SX + LETTERS.length * CW_CLUSTER + 75) / 2} y={midY + 11} textAnchor="middle" fontSize={7.5} fill="#555" fontWeight={900} letterSpacing={4} fontFamily="monospace">CREATOR MERCHANT AREA</text>

            {/* Zones — neobrutalism: hard shadow + thick border */}
            {zones.map(({ label, x, y, w, h, f, s, t }, i) => {
              const lines = label.split("\n");
              return <g key={i}>
                <rect x={x+3} y={y+3} width={w} height={h} fill="#000" />
                <rect x={x} y={y} width={w} height={h} fill={f} stroke="#000" strokeWidth={2} />
                {lines.map((line, li) => (
                  <text key={li} x={x+w/2} y={y+h/2+(li-(lines.length-1)/2)*10}
                    textAnchor="middle" dominantBaseline="central"
                    fontSize={6.5} fill="#000" fontWeight={900}
                    fontFamily="monospace" letterSpacing={0.8}>{line.toUpperCase()}</text>
                ))}
              </g>;
            })}

            {/* Entry */}
            <g transform={`translate(${CW/2-80},${CH-14})`}>
              <rect x={-3} y={-3} width={166} height={18} fill="#000" />
              <rect x={-20} y={-8} width={160} height={16} fill={NB.yellow} stroke="#000" strokeWidth={2} />
              <text x={60} y={0} fontSize={7} fill="#000" fontWeight={900} textAnchor="middle" dominantBaseline="central" letterSpacing={1} fontFamily="monospace">↑ ENTRY (Hall A / B)</text>
            </g>
            <text x={SX} y={CH-14} fontSize={7} fill="#000" fontWeight={900} fontFamily="monospace">X02</text>
            <text x={SX+290} y={CH-14} fontSize={7} fill="#000" fontWeight={900} fontFamily="monospace">X01</text>

            {/* Booths */}
            {ALL_BOOTHS.map(id => <BoothRect key={id} id={id} state={getState(id)} onClick={handleBoothClick} />)}

            {/* Path */}
            {showPath && sp && (<>
              <path d={sp} fill="none" stroke="#FACC15" strokeWidth={14} strokeOpacity={0.25} strokeLinecap="round" strokeLinejoin="round" />
              <path d={sp} fill="none" stroke="#000" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="10 6" style={{ animation:"dashAnim 1s linear infinite" }} />
              <path d={sp} fill="none" stroke="#FACC15" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="10 6" style={{ animation:"dashAnim 1s linear infinite" }} />
              {ALL_NODES[pathFrom] && <><circle cx={ALL_NODES[pathFrom].cx} cy={ALL_NODES[pathFrom].cy} r={11} fill="#000" /><circle cx={ALL_NODES[pathFrom].cx} cy={ALL_NODES[pathFrom].cy} r={9} fill={NB.green} stroke="#000" strokeWidth={2} /></>}
              {ALL_NODES[pathTo] && <><circle cx={ALL_NODES[pathTo].cx} cy={ALL_NODES[pathTo].cy} r={11} fill="#000" /><circle cx={ALL_NODES[pathTo].cx} cy={ALL_NODES[pathTo].cy} r={9} fill={NB.red} stroke="#000" strokeWidth={2} /></>}
            </>)}
          </g>
        </svg>
      </div>

      {/* ── BOTTOM PANEL ── */}
      {selectedId && !modalId && (
        <div style={{ position:"absolute", bottom:16, left:16, right:16, maxWidth:320, marginLeft:"auto", background:NB.white, border:"3px solid #000", boxShadow:"5px 5px 0 #000", padding:16, zIndex:20, animation:"slideUp .25s ease forwards" }}>
          <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:8 }}>
            <div>
              <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                <span style={{ fontSize:18, fontWeight:900 }}>BOOTH {selectedId}</span>
                {tenants[selectedId] && <span style={{ fontSize:11, fontWeight:900, background:NB.black, color:NB.yellow, padding:"1px 7px" }}>{tenants[selectedId].user}</span>}
              </div>
              {tenants[selectedId]?.allBooths?.length > 1 && (
                <div style={{ display:"flex", gap:4, marginTop:4, flexWrap:"wrap" }}>
                  {tenants[selectedId].allBooths.map(b => (
                    <span key={b} style={b===selectedId ? {fontSize:9,fontWeight:900,padding:"1px 6px",background:"#000",color:NB.yellow,border:"2px solid #000"} : {fontSize:9,fontWeight:900,padding:"1px 6px",background:NB.white,border:"2px solid #000"}}>{b}</span>
                  ))}
                </div>
              )}
            </div>
            <button style={{ width:28,height:28,background:NB.black,color:NB.yellow,border:"2px solid #000",fontWeight:900,fontSize:14,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }} onClick={() => setSelectedId(null)}>✕</button>
          </div>
          {tenants[selectedId] && <>
            <div style={{ display:"flex", gap:4, marginBottom:10, flexWrap:"wrap" }}>
              {tenants[selectedId].fandoms.map(f => <span key={f} style={{ fontSize:9, fontWeight:900, padding:"1px 7px", background:NB.purple, border:"1.5px solid #000" }}>{f}</span>)}
            </div>
            <button className="nb-btn" style={{ ...nbBtn, width:"100%", display:"block" }}
              onClick={() => { setModalId(selectedId); setSelectedId(null); }}>
              LIHAT DETAIL & KATALOG
            </button>
          </>}
          {!tenants[selectedId] && <p style={{ margin:0, fontSize:11, fontWeight:700, color:"#888" }}>Booth ini masih kosong.</p>}
        </div>
      )}

      {modalId && tenants[modalId] && <BoothModal boothId={modalId} tenant={tenants[modalId]} onClose={() => setModalId(null)} onNavigate={id => { setTab("path"); setPathTo(id); setModalId(null); }} />}

      {/* ── MAP TIP NOTIFICATION ── */}
      {showMapTip && (
        <div style={{ position:"fixed", inset:0, zIndex:50, display:"flex", alignItems:"flex-end", justifyContent:"center", padding:"0 16px 32px", pointerEvents:"none" }}>
          <div style={{ pointerEvents:"auto", width:"100%", maxWidth:360, background:NB.white, border:"3px solid #000", boxShadow:"6px 6px 0 #000", overflow:"hidden", animation:"slideUp .3s cubic-bezier(.34,1.56,.64,1) both" }}>
            {/* Header */}
            <div style={{ background:NB.yellow, padding:"14px 18px", display:"flex", alignItems:"center", gap:12, borderBottom:"3px solid #000" }}>
              <span style={{ fontSize:24 }}>🗺️</span>
              <div>
                <p style={{ margin:0, fontWeight:900, fontSize:14, letterSpacing:"-0.01em" }}>CARA MENGGUNAKAN MAP</p>
                <p style={{ margin:0, fontSize:10, fontWeight:700, color:"#555" }}>Panduan navigasi cepat</p>
              </div>
            </div>
            {/* Tips */}
            <div style={{ padding:"14px 18px", display:"flex", flexDirection:"column", gap:10 }}>
              <div style={{ display:"flex", alignItems:"flex-start", gap:10, background:"#F5F5F0", border:"2px solid #000", padding:"10px 12px" }}>
                <span style={{ fontSize:22, flexShrink:0 }}>🤌</span>
                <div>
                  <p style={{ margin:0, fontSize:12, fontWeight:900 }}>PERBESAR & PERKECIL</p>
                  <p style={{ margin:0, fontSize:10, fontWeight:600, color:"#555", marginTop:3 }}>Jepitkan dua jari untuk memperbesar, jepitkan lagi untuk memperkecil</p>
                </div>
              </div>
              <div style={{ display:"flex", alignItems:"flex-start", gap:10, background:"#F0F8FF", border:"2px solid #000", padding:"10px 12px" }}>
                <span style={{ fontSize:22, flexShrink:0 }}>☝️</span>
                <div>
                  <p style={{ margin:0, fontSize:12, fontWeight:900 }}>GESER PETA</p>
                  <p style={{ margin:0, fontSize:10, fontWeight:600, color:"#555", marginTop:3 }}>Gunakan 1 jari untuk menggeser peta ke segala arah</p>
                </div>
              </div>
            </div>
            {/* Button */}
            <div style={{ padding:"0 18px 18px" }}>
              <button className="nb-btn" style={{ ...nbBtn, width:"100%", display:"block", fontSize:13, padding:"12px" }}
                onClick={() => setShowMapTip(false)}>
                MENGERTI, MULAI JELAJAH! →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
