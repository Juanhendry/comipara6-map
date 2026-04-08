/**
 * Static map geometry — computed once at module load, shared between
 * server (page.jsx) and client (FloorMap.jsx).
 *
 * No React, no side-effects beyond the initial build calls.
 */

// ─── CONFIG ───────────────────────────────────────────────────────────────────
export const R_CONFIG = {
  offsetX:  15,
  offsetY:  55,
  stepX:    35,
  armToBot: 46,
};

export const ZONE_CONFIG = {
  stripHeight:    120,
  guildArea:      { offsetX: -10, w: 310, h: null },
  comicClass:     { offsetX: 305, w: 175, h: null },
  visitorStorage: { offsetX: 485, w: 95,  h: null },
  communityArea:  { offsetX: 585, w: 340, h: null },
};

// ─── GEOMETRY CONSTANTS ───────────────────────────────────────────────────────
export const LETTERS = ["A","B","C","D","E","F","G","H","I","J","K","L","M"];
export const pad = n => String(n).padStart(2, "0");
export const BW = 30, BH = 22, BG = 2;
export const INNER = 3;
export const AISLE = 30;
export const SX = 70;
export const ROW_Y = 20;
export const UY = 68;
export const LY = 345;
export const CW_CLUSTER = 2 * (BW + INNER) + AISLE;

// ─── BUILD POSITIONS ──────────────────────────────────────────────────────────
function buildPositions() {
  const pos = {};

  for (let i = 1; i <= 14; i++) {
    pos["N" + pad(i)] = { cx: SX + (i - 1) * (BW + INNER) + BW / 2, cy: ROW_Y + BH / 2 };
  }
  const N_RIGHT = SX + 14 * (BW + INNER);
  const BATHROOM_GAP = 90;
  const OX = N_RIGHT + BATHROOM_GAP;
  for (let i = 1; i <= 16; i++) {
    pos["O" + pad(i)] = { cx: OX + (i - 1) * (BW + INNER) + BW / 2, cy: ROW_Y + BH / 2 };
  }

  LETTERS.forEach((l, li) => {
    const clX = SX + li * CW_CLUSTER;
    const lx = clX, rx = clX + BW + INNER;
    [16,15,14,13,12,11,10,9].forEach((n,ri) => { pos[l+pad(n)] = { cx: lx+BW/2, cy: UY+ri*(BH+BG)+BH/2 }; });
    [17,18,19,20,21,22,23,24].forEach((n,ri) => { pos[l+pad(n)] = { cx: rx+BW/2, cy: UY+ri*(BH+BG)+BH/2 }; });
    [8,7,6,5,4,3,2,1].forEach((n,ri) => { pos[l+pad(n)] = { cx: lx+BW/2, cy: LY+ri*(BH+BG)+BH/2 }; });
    [25,26,27,28,29,30,31,32].forEach((n,ri) => { pos[l+pad(n)] = { cx: rx+BW/2, cy: LY+ri*(BH+BG)+BH/2 }; });
  });

  const PX = SX + LETTERS.length * CW_CLUSTER + 20;
  const pg = [[[14,15],[13,16],[12,17],[11,18],[10,19]],[[9,20],[8,21],[7,22],[6,23]],[[5,24],[4,25],[3,26],[2,27],[1,28]]];
  let pr = 0;
  pg.forEach((g,gi) => {
    if (gi > 0) pr += 1.5;
    g.forEach(([l,r]) => {
      const cy = UY + pr*(BH+BG)+BH/2;
      pos["P"+pad(l)] = { cx: PX+BW/2, cy };
      pos["P"+pad(r)] = { cx: PX+BW+INNER+BW/2, cy };
      pr++;
    });
  });

  const R_STRIP_Y = LY + 8*(BH+BG) + 38;
  const COMM_X = SX + ZONE_CONFIG.communityArea.offsetX;
  const R_LEFT_X  = COMM_X + R_CONFIG.offsetX;
  const R_RIGHT_X = R_LEFT_X + 9 * R_CONFIG.stepX;
  const R_TOP_Y   = R_STRIP_Y + R_CONFIG.offsetY;
  const R_BOT_Y   = R_TOP_Y + R_CONFIG.armToBot;
  pos["R"+pad(1)] = { cx: R_LEFT_X+BW/2, cy: R_TOP_Y+BH/2 };
  for (let i = 2; i <= 10; i++) {
    pos["R"+pad(i)] = { cx: R_LEFT_X+(i-2)*R_CONFIG.stepX+BW/2, cy: R_BOT_Y+BH/2 };
  }
  pos["R"+pad(11)] = { cx: R_RIGHT_X+BW/2, cy: R_TOP_Y+BH/2 };
  pos["R"+pad(12)] = { cx: R_RIGHT_X+BW/2, cy: R_TOP_Y+BH+BG+2+BH/2 };

  pos["X01"] = { cx: SX+250, cy: LY+8*(BH+BG)+38+106 };
  pos["X02"] = { cx: SX+20,  cy: LY+8*(BH+BG)+38+104 };

  return pos;
}

export const POS = buildPositions();
export const CW = Math.max(...Object.values(POS).map(p => p.cx)) + 500;
export const CH = Math.max(...Object.values(POS).map(p => p.cy)) + 38 + ZONE_CONFIG.stripHeight - 100;

// ─── AISLE WAYPOINTS ──────────────────────────────────────────────────────────
export const A_TOP_Y = UY - 18;
export const A_MID_Y = (UY + 8*(BH+BG) + LY) / 2;
export const A_BOT_Y = LY + 8*(BH+BG) + 18;
export const A_TIERS = [A_TOP_Y, A_MID_Y, A_BOT_Y];
export const midY = A_MID_Y;

export const AISLE_XS = [];
for (let li = 0; li <= LETTERS.length; li++) {
  AISLE_XS.push(SX + li * CW_CLUSTER - AISLE / 2);
}
AISLE_XS.push(SX + LETTERS.length * CW_CLUSTER + 10);

export const AISLE_NODES = {};
AISLE_XS.forEach((ax, ai) => {
  A_TIERS.forEach((ay, ti) => {
    AISLE_NODES[`_a${ai}_${ti}`] = { cx: ax, cy: ay };
  });
});

// ─── ALL BOOTHS ───────────────────────────────────────────────────────────────
function buildAllBooths() {
  const ids = [];
  for (let i = 1; i <= 14; i++) ids.push("N"+pad(i));
  for (let i = 1; i <= 16; i++) ids.push("O"+pad(i));
  LETTERS.forEach(l => { for (let n = 1; n <= 32; n++) ids.push(l+pad(n)); });
  for (let i = 1; i <= 28; i++) ids.push("P"+pad(i));
  for (let i = 1; i <= 12; i++) ids.push("R"+pad(i));
  ids.push("X01");
  ids.push("X02");
  return ids;
}
export const ALL_BOOTHS = buildAllBooths();
export const ALL_NODES = { ...POS, ...AISLE_NODES };

// ─── GRAPH ────────────────────────────────────────────────────────────────────
function buildGraph() {
  const g = {};
  Object.keys(ALL_NODES).forEach(id => { g[id] = []; });

  for (let ai = 0; ai < AISLE_XS.length; ai++) {
    for (let ti = 0; ti < A_TIERS.length; ti++) {
      const cur = `_a${ai}_${ti}`;
      if (ti + 1 < A_TIERS.length) {
        const nb = `_a${ai}_${ti+1}`;
        const d = Math.abs(A_TIERS[ti] - A_TIERS[ti+1]);
        g[cur].push({ id: nb, d }); g[nb].push({ id: cur, d });
      }
      if (ti === 1 && ai + 1 < AISLE_XS.length) {
        const nb = `_a${ai+1}_${ti}`;
        const d = Math.abs(AISLE_XS[ai] - AISLE_XS[ai+1]);
        g[cur].push({ id: nb, d }); g[nb].push({ id: cur, d });
      }
    }
  }

  ALL_BOOTHS.forEach(bid => {
    const bp = POS[bid]; if (!bp) return;
    const sorted = AISLE_XS.map((ax,ai) => ({ ai, dx: Math.abs(bp.cx - ax) })).sort((a,b) => a.dx - b.dx);
    const nearestTier = bp.cy < A_TIERS[1] ? 0 : 2;
    sorted.slice(0, 2).forEach(({ ai, dx }) => {
      if (dx > CW_CLUSTER * 1.5) return;
      const ay = A_TIERS[nearestTier];
      const aid = `_a${ai}_${nearestTier}`;
      const d = Math.hypot(bp.cx - AISLE_XS[ai], bp.cy - ay);
      g[bid].push({ id: aid, d }); g[aid].push({ id: bid, d });
    });
  });
  return g;
}
export const GRAPH = buildGraph();
export const ALLEY_GRAPH = Object.fromEntries(
  Object.entries(GRAPH)
    .filter(([id]) => id.startsWith("_a"))
    .map(([id, edges]) => [id, edges.filter(({ id: nb }) => nb.startsWith("_a"))])
);
