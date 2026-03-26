"use client";
import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";

// =============================
// CONSTANTS & GEOMETRY
// =============================
const BW = 30, BH = 22, BG = 2;
const INNER = 3, AISLE = 30;
const SX = 70, UY = 68, LY = 345;
const LETTERS = "ABCDEFGHIJKLM".split("");
const pad = (n) => String(n).padStart(2, "0");
const CW_CLUSTER = 2 * (BW + INNER) + AISLE;

// =============================
// BUILD POSITIONS
// =============================
function buildPositions() {
  const pos = {};
  LETTERS.forEach((l, li) => {
    const clX = SX + li * CW_CLUSTER;
    const lx = clX, rx = clX + BW + INNER;

    [16,15,14,13,12,11,10,9].forEach((n,ri)=>{
      pos[l+pad(n)]={cx:lx+BW/2,cy:UY+ri*(BH+BG)+BH/2};
    });
    [17,18,19,20,21,22,23,24].forEach((n,ri)=>{
      pos[l+pad(n)]={cx:rx+BW/2,cy:UY+ri*(BH+BG)+BH/2};
    });
    [8,7,6,5,4,3,2,1].forEach((n,ri)=>{
      pos[l+pad(n)]={cx:lx+BW/2,cy:LY+ri*(BH+BG)+BH/2};
    });
    [25,26,27,28,29,30,31,32].forEach((n,ri)=>{
      pos[l+pad(n)]={cx:rx+BW/2,cy:LY+ri*(BH+BG)+BH/2};
    });
  });
  return pos;
}

const POS = buildPositions();
const ALL_BOOTHS = Object.keys(POS);

// =============================
// BOOTH COMPONENT (MEMO)
// =============================
const Booth = React.memo(
  function Booth({ id, state, onClick }) {
    const p = POS[id];
    if (!p) return null;

    const colors = {
      empty: "#F8FAFC",
      occupied: "#F3E8FF",
      selected: "#A78BFA",
      matched: "#7C3AED",
      path: "#F59E0B",
    };

    return (
      <g onClick={() => onClick(id)} style={{ cursor: "pointer" }}>
        <rect
          x={p.cx - BW / 2}
          y={p.cy - BH / 2}
          width={BW}
          height={BH}
          fill={colors[state] || colors.empty}
        />
        <text x={p.cx} y={p.cy} textAnchor="middle" fontSize={6}>
          {id}
        </text>
      </g>
    );
  },
  (prev, next) => prev.state === next.state
);

// =============================
// MAIN COMPONENT
// =============================
export default function FloorMap() {
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);

  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [pathFrom, setPathFrom] = useState(null);
  const [pathTo, setPathTo] = useState(null);

  const containerRef = useRef(null);

  // =============================
  // SEARCH MATCH
  // =============================
  const matchedSet = useMemo(() => {
    if (!search) return new Set();
    return new Set(
      ALL_BOOTHS.filter((id) => id.toLowerCase().includes(search.toLowerCase()))
    );
  }, [search]);

  // =============================
  // PATH SIMPLE (placeholder fast)
  // =============================
  const pathSet = useMemo(() => {
    if (!pathFrom || !pathTo) return new Set();
    return new Set([pathFrom, pathTo]);
  }, [pathFrom, pathTo]);

  // =============================
  // COMPUTE STATE
  // =============================
  const boothStates = useMemo(() => {
    const map = {};
    ALL_BOOTHS.forEach((id) => {
      if (pathSet.has(id)) return (map[id] = "path");
      if (id === selected) return (map[id] = "selected");
      if (matchedSet.has(id)) return (map[id] = "matched");
      map[id] = "empty";
    });
    return map;
  }, [selected, matchedSet, pathSet]);

  // =============================
  // CLICK HANDLER
  // =============================
  const handleClick = useCallback((id) => {
    if (!pathFrom) return setPathFrom(id);
    if (!pathTo && id !== pathFrom) return setPathTo(id);
    setSelected((prev) => (prev === id ? null : id));
  }, [pathFrom, pathTo]);

  // =============================
  // VIRTUALIZATION
  // =============================
  const visibleBooths = useMemo(() => {
    if (typeof window === "undefined") return ALL_BOOTHS;

    const width = window.innerWidth;
    const height = window.innerHeight;

    const left = -tx / scale;
    const top = -ty / scale;
    const right = left + width / scale;
    const bottom = top + height / scale;

    return ALL_BOOTHS.filter((id) => {
      const p = POS[id];
      return (
        p.cx > left &&
        p.cx < right &&
        p.cy > top &&
        p.cy < bottom
      );
    });
  }, [tx, ty, scale]);

  // =============================
  // AUTO FIT
  // =============================
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const mapWidth = 1000;
    const mapHeight = 800;

    const s = Math.min(
      el.clientWidth / mapWidth,
      el.clientHeight / mapHeight
    );

    setScale(s);
  }, []);

  return (
    <div className="flex flex-col h-screen">
      {/* HEADER */}
      <div className="p-3 bg-white shadow">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search booth..."
          className="w-full p-2 border rounded"
        />
      </div>

      {/* MAP */}
      <div ref={containerRef} className="flex-1 overflow-hidden">
        <svg width="100%" height="100%">
          <g transform={`translate(${tx},${ty}) scale(${scale})`}>
            {visibleBooths.map((id) => (
              <Booth
                key={id}
                id={id}
                state={boothStates[id]}
                onClick={handleClick}
              />
            ))}
          </g>
        </svg>
      </div>
    </div>
  );
}