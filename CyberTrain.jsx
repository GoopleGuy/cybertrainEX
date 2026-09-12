import { LIB, LIB_MAP, EQUIPMENT, guideFor, filterExercises } from "./library.mjs";
import { suggestNext, epley } from "./progression.mjs";
import { EX_THEME, FONT_FACES } from "./theme.mjs";
import NavIcon from "./NavIcon.jsx";
import { useState, useEffect, useLayoutEffect, useMemo, useCallback, useRef } from "react";

/* ============================================================
   CYBERTRAIN // NIGHT CITY STRENGTH OS
   Equipment: REP Arcadia · Squat Rack · Open Hex Bar ·
              Freak Athlete Hyper Pro + Leg Developer · Adj. DBs
   ============================================================ */

/* ---------- EXERCISE LIBRARY ---------- */
// inc = weight increment (lb) when progression triggers
// range = [minReps, maxReps] for double progression


/* ---------- PROGRAM TEMPLATE (from your 3-day plan) ---------- */
// Colors are fixed per slot; name + exercise list are user-editable and persisted.
const DAY_COLORS = { A: "#fcee0a", B: "#00f0ff", C: "#ff2a6d" };
const DEFAULT_PROGRAM = {
  A: { name: "SQUAT · H-PUSH/PULL", exs: ["back-squat", "bench", "cable-row", "leg-ext", "leg-curl", "face-pull", "pallof", "cable-curl"] },
  B: { name: "HINGE · V-PUSH/PULL", exs: ["trap-dl", "ohp", "lat-pulldown", "bss", "incline-db", "back-ext", "oh-tricep", "ghd-situp"] },
  C: { name: "VOLUME · ACCUMULATION", exs: ["paused-squat", "bench-vol", "ohp-vol", "seated-cable-row", "leg-ext", "leg-curl", "hammer-curl", "rope-pushdown", "woodchop"] },
};
const clone = o => JSON.parse(JSON.stringify(o));

/* ---------- PROGRESSION ENGINE ----------
   Double progression + Epley e1RM, the standard evidence-based
   approach for autoregulated strength training:
   1. Work within the rep range at a fixed weight.
   2. All sets at top of range → add `inc` lb, reset to bottom of range.
   3. Otherwise → same weight, add 1 rep to your weakest set.
   4. Missed the bottom of the range on 2+ sets → deload 7.5%.
   e1RM (Epley): w * (1 + reps/30), capped at 12 reps for accuracy. */
/* ---------- STORAGE ----------
   Dual-mode: uses Claude artifact storage when available,
   otherwise browser localStorage (standalone PWA on your phone). */
const KEY = "cybertrain-ex-v1";
const store = {
  async get(k) {
    if (typeof window !== "undefined" && window.storage && window.storage.get) return window.storage.get(k);
    const v = localStorage.getItem(k);
    if (v == null) throw new Error("missing key");
    return { key: k, value: v };
  },
  async set(k, v) {
    if (typeof window !== "undefined" && window.storage && window.storage.set) return window.storage.set(k, v);
    localStorage.setItem(k, v);
  },
};
// Ask the browser to protect this origin's data from eviction (PWA mode)
try { if (typeof navigator !== "undefined" && navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch { /* no-op */ }
async function loadData() {
  try {
    const res = await store.get(KEY);
    const d = res ? JSON.parse(res.value) : {};
    return { logs: d.logs || [], program: d.program || clone(DEFAULT_PROGRAM), restOv: d.restOv || {}, exOv: d.exOv || {} };
  } catch { return { logs: [], program: clone(DEFAULT_PROGRAM), restOv: {}, exOv: {} }; }
}
async function saveData(data) {
  try { await store.set(KEY, JSON.stringify(data)); } catch (e) { console.error("save failed", e); }
}

/* ---------- HELPERS ---------- */
const fmtDate = ts => new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
const vol = sets => sets.reduce((a, s) => a + (s.w || 0) * (s.r || 0), 0);
const fmtK = n => n >= 1000000 ? (n / 1000000).toFixed(2) + "M" : n >= 1000 ? (n / 1000).toFixed(1) + "K" : String(Math.round(n));
const fmtClock = s => { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); };

/* ---------- HAPTICS ----------
   navigator.vibrate where supported (Android/Chrome). Silently
   no-ops on iOS Safari and desktop. Patterns kept short + tasteful. */
const HAP = { tap: 8, pick: 12, drop: 18, log: 16, warn: 22, pr: [0, 28, 36, 28], done: [0, 42, 60, 42], rest: [0, 70, 55, 70, 55, 120] };
function buzz(p) { try { if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(p); } catch { /* no-op */ } }

/* ---------- REST PRESCRIPTION ----------
   Recommended rest by exercise role, matching the plan's guidance:
   heavy compounds get full recovery, accessories moderate, core/carry short. */
const REST = { COMPOUND: 180, ACCESSORY: 90, CORE: 45, CARRY: 90 };
const restOf = (ex, ov) => (ov && ov[ex.id] != null ? ov[ex.id] : ex.rest ?? REST[ex.kind] ?? 90);
/* Per-exercise sets/rep-range overrides: { [exId]: { sets?, lo?, hi? } } */
const effEx = (base, ov) => {
  const o = ov && ov[base.id];
  if (!o) return base;
  return { ...base, sets: o.sets ?? base.sets, range: [o.lo ?? base.range[0], o.hi ?? base.range[1]] };
};

/* ---------- SPARKLINE ---------- */
function Spark({ values, color = "#00f0ff", w = 120, h = 32 }) {
  if (values.length < 2) return <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 9, color: "#3a4150" }}>NEED 2+ SESSIONS</div>;
  const min = Math.min(...values), max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * w},${h - 3 - ((v - min) / span) * (h - 6)}`).join(" ");
  return (
    <svg width={w} height={h} style={{ display: "block" }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" style={{ filter: `drop-shadow(0 0 3px ${color})` }} />
      <circle cx={w} cy={h - 3 - ((values[values.length - 1] - min) / span) * (h - 6)} r="2.5" fill={color} style={{ filter: `drop-shadow(0 0 4px ${color})` }} />
    </svg>
  );
}

/* ---------- MAIN APP ---------- */
export default function CyberTrain() {
  const [tab, setTab] = useState("TRAIN");
  const [data, setData] = useState(null);
  const [day, setDay] = useState("A");
  const [active, setActive] = useState(null); // active session: {day, started, entries:{exId:[{w,r,rir}]}}
  const [openEx, setOpenEx] = useState(null);
  const [libFilter, setLibFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [muscle, setMuscle] = useState("ALL");

  const [statEx, setStatEx] = useState(null);
  const [flash, setFlash] = useState(null);
  const [editDay, setEditDay] = useState("A");
  const [buildFilter, setBuildFilter] = useState("ALL");
  const [rest, setRest] = useState(null); // {exId, total, endsAt, done}
  const [, setTick] = useState(0);
  const doneRef = useRef(false);
  const mainRef = useRef(null);
  const scrollPositions = useRef({});
  const navigate = next => {
    if (next === tab) return;
    scrollPositions.current[tab] = mainRef.current?.scrollTop || 0;
    buzz(HAP.tap);
    setTab(next);
  };
  useLayoutEffect(() => {
    if (mainRef.current) mainRef.current.scrollTop = scrollPositions.current[tab] || 0;
  }, [tab]);

  useEffect(() => { loadData().then(setData); }, []);
  const persist = useCallback(d => { setData(d); saveData(d); }, []);

  /* ---- data vault: export / import / wipe ---- */
  const [vaultMode, setVaultMode] = useState(null); // null | "IMPORT" | "WIPE"
  const [vaultText, setVaultText] = useState("");
  const [vaultMsg, setVaultMsg] = useState(null);
  const exportData = async () => {
    const payload = JSON.stringify({ app: "cybertrain", v: 1, exported: Date.now(), ...data });
    try {
      await navigator.clipboard.writeText(payload);
      buzz(HAP.log); setVaultMsg("COPIED TO CLIPBOARD — paste it somewhere safe (notes, email to yourself)");
    } catch {
      setVaultText(payload); setVaultMode("IMPORT");
      setVaultMsg("Clipboard blocked — select the text below and copy it manually");
    }
    setTimeout(() => setVaultMsg(null), 6000);
  };
  const importData = () => {
    try {
      const d = JSON.parse(vaultText);
      if (!Array.isArray(d.logs)) throw new Error("no logs array");
      const next = {
        logs: d.logs.filter(l => l && l.exId && Array.isArray(l.sets)),
        program: d.program && d.program.A && d.program.B && d.program.C ? d.program : clone(DEFAULT_PROGRAM),
        restOv: d.restOv && typeof d.restOv === "object" ? d.restOv : {},
        exOv: d.exOv && typeof d.exOv === "object" ? d.exOv : {},
      };
      persist(next); buzz(HAP.done);
      setVaultMode(null); setVaultText("");
      setVaultMsg(`RESTORED — ${next.logs.length} exercise logs loaded`);
    } catch { buzz(HAP.warn); setVaultMsg("INVALID DATA — paste the exact JSON from a previous export"); }
    setTimeout(() => setVaultMsg(null), 6000);
  };
  const wipeData = () => {
    buzz(HAP.warn);
    persist({ logs: [], program: clone(DEFAULT_PROGRAM), restOv: {}, exOv: {} });
    setVaultMode(null); setVaultMsg("SYSTEM WIPED — factory state restored");
    setTimeout(() => setVaultMsg(null), 6000);
  };

  /* ---- rest timer ---- */
  useEffect(() => {
    if (!rest) return;
    doneRef.current = rest.done;
    const id = setInterval(() => {
      if (Date.now() >= rest.endsAt) {
        if (!doneRef.current) { doneRef.current = true; buzz(HAP.rest); setRest(r => (r ? { ...r, done: true } : r)); }
      } else { setTick(t => t + 1); }
    }, 250);
    return () => clearInterval(id);
  }, [rest]);
  // auto-clear the "READY" bar a few seconds after completion
  useEffect(() => {
    if (rest && rest.done) { const t = setTimeout(() => setRest(null), 6000); return () => clearTimeout(t); }
  }, [rest]);

  const startRest = ex => { const s = restOf(ex, restOv); doneRef.current = false; setRest({ exId: ex.id, total: s, endsAt: Date.now() + s * 1000, done: false }); };
  const bumpRest = sec => setRest(r => { if (!r) return r; const base = Math.max(Date.now(), r.endsAt); return { ...r, endsAt: Math.max(Date.now() + 1000, base + sec * 1000), done: false }; });
  const skipRest = () => { buzz(HAP.tap); setRest(null); };

  const logs = data?.logs ?? [];
  const program = data?.program ?? DEFAULT_PROGRAM;
  const restOv = data?.restOv ?? {};
  const exOv = data?.exOv ?? {};
  const EX = id => effEx(LIB_MAP[id], exOv);

  /* ---- derived metrics ---- */
  const metrics = useMemo(() => {
    let totalVol = 0, totalSets = 0, totalReps = 0, prs = 0;
    const bestE1RM = {}, firstE1RM = {}, sessionsByDate = {};
    for (const l of logs) {
      totalSets += l.sets.length;
      sessionsByDate[l.sessionId] = true;
      if (LIB_MAP[l.exId]?.unit === "sec") continue;
      totalVol += vol(l.sets);
      totalReps += l.sets.reduce((a, s) => a + s.r, 0);
      if (LIB_MAP[l.exId]?.bw) continue;
      const best = Math.max(...l.sets.map(s => epley(s.w, s.r)), 0);
      if (!(l.exId in firstE1RM)) firstE1RM[l.exId] = best;
      if (best > (bestE1RM[l.exId] || 0)) { if (l.exId in bestE1RM) prs++; bestE1RM[l.exId] = best; }
      sessionsByDate[l.sessionId] = true;
    }
    return { totalVol, totalSets, totalReps, prs, bestE1RM, firstE1RM, sessionCount: Object.keys(sessionsByDate).length };
  }, [logs]);

  const exHistory = useCallback(exId => logs.filter(l => l.exId === exId), [logs]);

  /* ---- session flow ---- */
  const startSession = () => { buzz(HAP.log); setActive({ day, started: Date.now(), id: "s" + Date.now(), entries: {} }); setOpenEx(program[day].exs[0]); };

  const addSet = (exId, w, r, rir) => {
    if (!active || !Number.isFinite(w) || w < 0 || !Number.isInteger(r) || r <= 0 || (rir != null && (!Number.isFinite(rir) || rir < 0 || rir > 10))) return;
    const entries = { ...active.entries, [exId]: [...(active.entries[exId] || []), { w: w || 0, r, rir }] };
    setActive({ ...active, entries });
    const ex = EX(exId);
    const newE = epley(w || 0, r);
    const isPR = ex.unit !== "sec" && !ex.bw && newE > (metrics.bestE1RM[exId] || 0) && exHistory(exId).length > 0;
    if (isPR) {
      setFlash(`◤ NEW PR // ${ex.name.toUpperCase()} — e1RM ${Math.round(newE)} LB ◢`);
      setTimeout(() => setFlash(null), 3000);
      buzz(HAP.pr);
    } else { buzz(HAP.log); }
    startRest(ex); // auto-start recommended rest countdown
  };

  const removeSet = (exId, idx) => {
    buzz(HAP.tap);
    const arr = [...(active.entries[exId] || [])]; arr.splice(idx, 1);
    setActive({ ...active, entries: { ...active.entries, [exId]: arr } });
  };

  const finishSession = () => {
    buzz(HAP.done);
    setRest(null);
    const newLogs = Object.entries(active.entries)
      .filter(([, sets]) => sets.length)
      .map(([exId, sets]) => ({ exId, sets, ts: Date.now(), sessionId: active.id, day: active.day }));
    if (newLogs.length) persist({ ...data, logs: [...logs, ...newLogs] });
    setActive(null); setOpenEx(null);
    setFlash("◤ SESSION ARCHIVED // " + newLogs.length + " EXERCISES SAVED ◢");
    setTimeout(() => setFlash(null), 3000);
  };

  const sessionVol = active ? Object.entries(active.entries).reduce((a, [id, sets]) => a + (LIB_MAP[id]?.unit === "sec" ? 0 : vol(sets)), 0) : 0;

  /* ---- program builder mutations ---- */
  const updateProgram = next => persist({ ...data, program: next });
  const setDayName = (k, name) => { const p = clone(program); p[k].name = name; updateProgram(p); };
  const addToDay = (k, exId) => { buzz(HAP.log); const p = clone(program); if (!p[k].exs.includes(exId)) p[k].exs.push(exId); updateProgram(p); };
  const removeFromDay = (k, exId) => { buzz(HAP.tap); const p = clone(program); p[k].exs = p[k].exs.filter(id => id !== exId); updateProgram(p); };
  const reorderDay = (k, newExs) => { const p = clone(program); p[k].exs = newExs; updateProgram(p); };
  const resetDay = k => { buzz(HAP.warn); const p = clone(program); p[k] = clone(DEFAULT_PROGRAM[k]); updateProgram(p); };
  const setExRest = (exId, sec) => {
    buzz(HAP.tap);
    const ov = { ...restOv };
    const def = restOf(LIB_MAP[exId], null);
    const v = Math.max(15, Math.min(600, sec));
    if (v === def) delete ov[exId]; else ov[exId] = v;
    persist({ ...data, restOv: ov });
  };
  const setExTune = (exId, patch) => {
    buzz(HAP.tap);
    const base = LIB_MAP[exId];
    const next = { ...(exOv[exId] || {}), ...patch };
    if (next.sets != null) next.sets = Math.max(1, Math.min(8, next.sets));
    if (next.lo != null) next.lo = Math.max(1, Math.min(60, next.lo));
    if (next.hi != null) next.hi = Math.max(1, Math.min(60, next.hi));
    const lo = next.lo ?? base.range[0], hi = next.hi ?? base.range[1];
    if (lo > hi) { if (patch.lo != null) next.hi = lo; else next.lo = hi; } // dragging one bound pushes the other
    if (next.sets === base.sets) delete next.sets;
    if (next.lo === base.range[0]) delete next.lo;
    if (next.hi === base.range[1]) delete next.hi;
    const ov = { ...exOv };
    if (Object.keys(next).length) ov[exId] = next; else delete ov[exId];
    persist({ ...data, exOv: ov });
  };
  const resetExTune = exId => { buzz(HAP.tap); const ov = { ...exOv }; delete ov[exId]; persist({ ...data, exOv: ov }); };

  if (!data) return (
    <div style={{ minHeight: "100vh", background: "#07080f", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Share Tech Mono',monospace", color: "#fcee0a" }}>
      <style>{FONT_IMPORT}</style>BOOTING NEURAL LINK…
    </div>
  );

  return (
    <div className={"ct-root" + (active && rest ? " resting" : "")}>
      <style>{CSS + EX_THEME}</style>
      <div className="scanlines" />
      <svg className="ambient-art" viewBox="0 0 620 1000" preserveAspectRatio="none" aria-hidden="true">
        <path className="ambient-rail" d="M604 130v125l-6 8v150m0 30v100M16 590v58l8 10v96"/>
        <path className="ambient-seam" d="M620 708h-36l-72 72H340l-52 52H0M620 721h-31l-72 72H345"/>
        <path className="ambient-corner" d="M522 30h54l28 28v28M534 35h40l24 24M16 874v20h44"/>
        <path className="ambient-ticks" d="M604 282h-5m5 8h-5m5 8h-5m5 8h-5M18 785h4m-4 8h4m-4 8h4"/>
      </svg>
      {flash && <div className="flash">{flash}</div>}

      {/* HEADER */}
      <header className="hdr">
        <div className="hdr-block" />
        <div>
          <h1>CYBER<span>TRAIN</span><em>EX</em></h1>
          <div className="hdr-sub">NIGHT CITY STRENGTH OS // EX</div>
        </div>
        <div className="hdr-stat">
          <div className="hdr-stat-n">{fmtK(metrics.totalVol)}</div>
          <div className="hdr-stat-l">LB LIFETIME</div>
        </div>
      </header>

      <div className="system-strip"><span><i/> {active ? "SESSION LIVE" : "NEURAL LINK ONLINE"}</span><span>{LIB.length} MOVEMENTS <b>//</b> 05 RIGS</span></div>
      <main className="main" ref={mainRef} id="main-content">
      <div className="tab-content" key={tab}>
        {/* ============ TRAIN ============ */}
        {tab === "TRAIN" && !active && (
          <div className="pad">
            <div className="section-heading"><div className="sec-label">// SELECT PROTOCOL</div><span>{String(metrics.sessionCount).padStart(2,"0")} RUNS ARCHIVED</span></div>
            {Object.entries(program).map(([k, p]) => (
              <div key={k} className={"day-slot" + (day === k ? " selected" : "")} style={{"--dc":DAY_COLORS[k]}}><button aria-pressed={day === k} className={"day-card" + (day === k ? " sel" : "")} style={{ "--dc": DAY_COLORS[k] }} onClick={() => { buzz(HAP.tap); setDay(k); }}>
                <div className="day-letter">{k}</div>
                <div>
                  <div className="day-name">{p.name}</div>
                  <div className="day-meta">{p.exs.length} EXERCISES · {p.exs.map(id => LIB_MAP[id].mus).filter((v, i, a) => a.indexOf(v) === i).slice(0, 4).join(" / ")}</div>
                </div>
                <div className="day-chev">{day === k ? "◉" : "○"}</div>
              </button></div>
            ))}
            <button className="cta start-cta" style={{"--dc":DAY_COLORS[day]}} onClick={startSession} disabled={!program[day].exs.length}>▶ JACK IN — START DAY {day}</button>
            <div className="hint">Targets load from your last session. Add a movement anytime from ARSENAL.</div>
          </div>
        )}

        {tab === "TRAIN" && active && (
          <div className="pad">
            <div className="live-bar">
              <span className="live-dot" />LIVE SESSION — DAY {active.day}
              <span className="live-vol">{fmtK(sessionVol)} LB</span>
            </div>
            {program[active.day].exs.concat(Object.keys(active.entries).filter(id => !program[active.day].exs.includes(id))).map(exId => {
              const ex = EX(exId);
              const sug = suggestNext(ex, logs);
              const done = active.entries[exId] || [];
              const open = openEx === exId;
              return (
                <div key={exId} className={"ex-card" + (open ? " open" : "") + (done.length >= ex.sets ? " done" : "")}>
                  <button className="ex-head" aria-expanded={open} onClick={() => { buzz(HAP.tap); setOpenEx(open ? null : exId); }}>
                    <div>
                      <div className="ex-name">{ex.name}{ex.perSide ? " /side" : ""}</div>
                      <div className="ex-sub">{ex.eq} · {ex.sets}×{ex.range[0]}–{ex.range[1]}{ex.unit === "sec" ? "s" : ""} · REST {fmtClock(restOf(ex, restOv))}</div>
                    </div>
                    <div className="ex-prog">{done.length}/{ex.sets}<span className="ex-prog-l">SETS</span></div>
                  </button>
                  <div className={"ex-reveal" + (open ? " expanded" : "")} inert={!open}><div className="ex-reveal-inner">
                    <div className="ex-body">
                      <div className={"sug sug-" + sug.status}>
                        <span className="sug-tag">{sug.status === "UP" ? "▲ PROGRESS" : sug.status === "DOWN" ? "▼ DELOAD" : sug.status === "INIT" ? "◆ NEW" : "▶ TARGET"}</span>
                        {sug.note}
                      </div>
                      <ExerciseGuide ex={ex}/><SetLogger ex={ex} sug={sug} done={done} onAdd={addSet} onRemove={removeSet} />
                      <button className="rest-start" onClick={() => { buzz(HAP.tap); startRest(ex); }}>⏱ START REST — {fmtClock(restOf(ex, restOv))}</button>
                    </div>
                  </div></div>
                </div>
              );
            })}
            <button className="cta cta-finish" onClick={finishSession}>■ END SESSION & ARCHIVE</button>
            <button className="cta cta-abort" onClick={() => { buzz(HAP.warn); setRest(null); setActive(null); setOpenEx(null); }}>✕ ABORT (DISCARD)</button>
          </div>
        )}

        {/* ============ LIBRARY ============ */}
        {tab === "ARSENAL" && (
          <div className="pad">
            <div className="sec-label">// EQUIPMENT ARSENAL</div>
            <div className="filter-row">
              {["ALL", ...EQUIPMENT].map(f => (
                <button key={f} className={"chip" + (libFilter === f ? " on" : "")} onClick={() => { buzz(HAP.tap); setLibFilter(f); }}>{f}</button>
              ))}
            </div>
            {/* Search applies to both library and builder. */}<SearchControls search={search} setSearch={setSearch} muscle={muscle} setMuscle={setMuscle}/><div className="result-count">{filterExercises(LIB,libFilter,muscle,search).length} / {LIB.length} MOVEMENTS</div>{!filterExercises(LIB,libFilter,muscle,search).length && <div className="hint">No matching exercises. Clear your search or change filters.</div>}{filterExercises(LIB,libFilter,muscle,search).map(b => {
              const ex = effEx(b, exOv);
              const h = exHistory(ex.id);
              const sug = suggestNext(ex, logs);
              return (
                <div key={ex.id} className="lib-row">
                  <div className="lib-main">
                    <div className="ex-name">{ex.name}</div>
                    <div className="ex-sub">{ex.eq} · {ex.mus} · {ex.sets}×{ex.range[0]}–{ex.range[1]} · REST {fmtClock(restOf(ex, restOv))}</div>
                    <ExerciseGuide ex={ex}/><div className="lib-next">{h.length ? `NEXT → ${sug.weight ?? "BW"}${sug.weight ? " lb" : ""} × ${sug.reps}` : "NO DATA YET"}</div>
                  </div>
                  {active && (
                    <button className="lib-add" onClick={() => { navigate("TRAIN"); setOpenEx(ex.id); if (!active.entries[ex.id]) setActive({ ...active, entries: { ...active.entries, [ex.id]: [] } }); }}>+ ADD</button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ============ STATS ============ */}
        {tab === "DATA" && (
          <div className="pad">
            <div className="sec-label">// CUMULATIVE METRICS</div>
            <div className="stat-grid">
              <div className="stat-card big"><div className="stat-n yellow">{fmtK(metrics.totalVol)}</div><div className="stat-l">TOTAL LB MOVED</div></div>
              <div className="stat-card"><div className="stat-n cyan">{metrics.sessionCount}</div><div className="stat-l">SESSIONS</div></div>
              <div className="stat-card"><div className="stat-n cyan">{metrics.totalSets}</div><div className="stat-l">SETS</div></div>
              <div className="stat-card"><div className="stat-n magenta">{metrics.prs}</div><div className="stat-l">PRs BROKEN</div></div>
              <div className="stat-card"><div className="stat-n cyan">{metrics.totalReps}</div><div className="stat-l">TOTAL REPS</div></div>
            </div>

            <div className="sec-label" style={{ marginTop: 24 }}>// e1RM PROGRESSION</div>
            <div className="hint">Volume uses logged load × repetitions, without doubling per-hand or per-side entries. Timed work is excluded from rep totals and volume. Bodyweight and timed exercises are excluded from e1RM estimates.</div>
            {Object.keys(metrics.bestE1RM).length === 0 && <div className="hint">Log sessions to unlock progression analytics. Estimated 1RM (Epley formula) is tracked per exercise from your best set each session.</div>}
            {Object.keys(metrics.bestE1RM).map(exId => {
              const ex = LIB_MAP[exId]; if (!ex) return null;
              const h = exHistory(exId);
              const series = h.map(l => Math.max(...l.sets.map(s => epley(s.w, s.r)), 0));
              const first = metrics.firstE1RM[exId], best = metrics.bestE1RM[exId];
              const pct = first > 0 ? ((best / first - 1) * 100) : 0;
              const open = statEx === exId;
              return (
                <div key={exId} className="stat-ex" onClick={() => setStatEx(open ? null : exId)}>
                  <div className="stat-ex-top">
                    <div>
                      <div className="ex-name">{ex.name}</div>
                      <div className="ex-sub">e1RM {Math.round(best)} LB · <span className={pct >= 0 ? "pos" : "neg"}>{pct >= 0 ? "+" : ""}{pct.toFixed(1)}%</span> since first log</div>
                    </div>
                    <Spark values={series} color={pct >= 0 ? "#00f0ff" : "#ff003c"} />
                  </div>
                  {open && (
                    <div className="stat-ex-hist">
                      {h.slice(-8).reverse().map((l, i) => (
                        <div key={i} className="hist-row">
                          <span className="hist-date">{fmtDate(l.ts)}</span>
                          <span className="hist-sets">{l.sets.map(s => `${s.w}×${s.r}`).join("  ")}</span>
                          <span className="hist-vol">{fmtK(vol(l.sets))} lb</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            <div className="sec-label" style={{ marginTop: 28 }}>// DATA VAULT</div>
            <div className="hint" style={{ marginBottom: 10 }}>Completed sessions are saved on this device when you end and archive them. Keep this page open during an active session. Use the vault to back up your full history as text, or restore it after moving devices/accounts.</div>
            <div className="vault-btns">
              <button className="vault-btn cyan" onClick={exportData}>⇪ EXPORT BACKUP</button>
              <button className="vault-btn yellow" onClick={() => { buzz(HAP.tap); setVaultMode(vaultMode === "IMPORT" ? null : "IMPORT"); setVaultText(""); }}>⇩ IMPORT</button>
              <button className="vault-btn red" onClick={() => { buzz(HAP.warn); setVaultMode(vaultMode === "WIPE" ? null : "WIPE"); }}>✕ WIPE</button>
            </div>
            {vaultMsg && <div className="vault-msg">{vaultMsg}</div>}
            {vaultMode === "IMPORT" && (
              <div className="vault-panel">
                <textarea className="vault-ta" value={vaultText} onChange={e => setVaultText(e.target.value)} placeholder='Paste a previous export here — starts with {"app":"cybertrain"...' rows={5} />
                <button className="vault-btn cyan" style={{ width: "100%" }} onClick={importData} disabled={!vaultText.trim()}>RESTORE FROM BACKUP</button>
              </div>
            )}
            {vaultMode === "WIPE" && (
              <div className="vault-panel">
                <div className="hint" style={{ color: "#ff003c" }}>This erases all {logs.length} logs, your custom program, and rest overrides. Export a backup first. This cannot be undone.</div>
                <button className="vault-btn red" style={{ width: "100%", marginTop: 8 }} onClick={wipeData}>CONFIRM FULL WIPE</button>
              </div>
            )}
          </div>
        )}

        {/* ============ PLAN ============ */}
        {tab === "PROTOCOL" && (
          <div className="pad">
            <div className="sec-label">// WARM-UP PROTOCOL — EVERY SESSION</div>
            <div className="warm-grid">
              {[["Ankle dorsiflexion rocks", "8/side"], ["90/90 hip switches", "6/side"], ["BW squat + full exhale", "8"], ["Shoulder wall slides", "8"], ["Pec / lat stretch", "20–30s ea"], ["Hip-hinge drill (dowel)", "8"]].map(([n, d]) => (
                <div key={n} className="warm-item"><span className="warm-dot" /><div><div className="warm-n">{n}</div><div className="warm-d">{d}</div></div></div>
              ))}
            </div>
            <div className="sec-label" style={{ marginTop: 20 }}>// BARBELL RAMP — FIRST LIFT</div>
            <div className="ramp">{[["EMPTY", "8–10"], ["~40%", "5"], ["~60%", "3"], ["~75%", "2"], ["~85%", "1 (heavy days)"]].map(([l, r]) => (
              <div key={l} className="ramp-row"><span className="ramp-l">{l}</span><span className="ramp-r">{r} reps</span></div>
            ))}</div>
            {Object.entries(program).map(([k, p]) => (
              <div key={k} style={{ marginTop: 24 }}>
                <div className="sec-label" style={{ color: DAY_COLORS[k] }}>// DAY {k} — {p.name}</div>
                {p.exs.map(id => {
                  const ex = EX(id);
                  return <div key={id} className="plan-row"><span className="plan-n">{ex.name}</span><span className="plan-d">{ex.sets} × {ex.range[0]}–{ex.range[1]}{ex.unit === "sec" ? "s" : ""}</span></div>;
                })}
              </div>
            ))}
            <div className="hint" style={{ marginTop: 20 }}>Effort guide: compounds at 2 RIR, accessories 1–2 RIR, final isolation sets 0–1 RIR. Never grind compounds to failure. The progression engine assumes honest RIR.</div>
          </div>
        )}

        {/* ============ BUILD ============ */}
        {tab === "BUILD" && (
          <div className="pad">
            <div className="sec-label">// CONFIGURE PROTOCOL</div>
            <div className="filter-row">
              {Object.keys(program).map(k => (
                <button key={k} className={"chip" + (editDay === k ? " on" : "")} style={editDay === k ? { borderColor: DAY_COLORS[k], color: DAY_COLORS[k] } : {}} onClick={() => { buzz(HAP.tap); setEditDay(k); }}>DAY {k}</button>
              ))}
            </div>

            <label className="build-label">DAY {editDay} NAME</label>
            <input className="build-name" value={program[editDay].name} onChange={e => setDayName(editDay, e.target.value)} maxLength={40} />

            <div className="sec-label" style={{ marginTop: 18, color: DAY_COLORS[editDay] }}>// CURRENT — {program[editDay].exs.length} EXERCISES</div>
            {program[editDay].exs.length === 0 && <div className="hint">Empty. Add exercises from the arsenal below.</div>}
            <DragList
              ids={program[editDay].exs}
              restOv={restOv}
              onRest={setExRest}
              exOv={exOv}
              onTune={setExTune}
              onResetTune={resetExTune}
              onReorder={next => reorderDay(editDay, next)}
              onRemove={id => removeFromDay(editDay, id)}
            />
            <button className="reset-btn" onClick={() => resetDay(editDay)}>↺ RESET DAY {editDay} TO DEFAULT</button>

            <div className="sec-label" style={{ marginTop: 22 }}>// ADD FROM ARSENAL</div>
            <div className="filter-row">
              {["ALL", ...EQUIPMENT].map(f => (
                <button key={f} className={"chip" + (buildFilter === f ? " on" : "")} onClick={() => { buzz(HAP.tap); setBuildFilter(f); }}>{f}</button>
              ))}
            </div>
            <SearchControls search={search} setSearch={setSearch} muscle={muscle} setMuscle={setMuscle}/><div className="result-count">{filterExercises(LIB,buildFilter,muscle,search).length} MATCHES</div>{!filterExercises(LIB,buildFilter,muscle,search).length && <div className="hint">No matching exercises. Adjust the filters above.</div>}{filterExercises(LIB,buildFilter,muscle,search).map(ex => {
              const inDay = program[editDay].exs.includes(ex.id);
              return (
                <div key={ex.id} className="lib-row">
                  <div className="lib-main">
                    <div className="ex-name">{ex.name}</div>
                    <div className="ex-sub">{ex.eq} · {ex.mus} · {ex.sets}×{ex.range[0]}–{ex.range[1]}</div>
                  </div>
                  <button className={"lib-add" + (inDay ? " in" : "")} disabled={inDay} onClick={() => addToDay(editDay, ex.id)}>{inDay ? "✓ IN" : "+ ADD"}</button>
                </div>
              );
            })}
            <div className="hint" style={{ marginTop: 16 }}>Edits save instantly and carry into your next session. History stays tied to each exercise, so progression targets survive any reordering.</div>
          </div>
        )}
      </div>
      </main>

      {/* REST TIMER BAR */}
      {active && rest && (() => {
        const remaining = Math.max(0, rest.endsAt - Date.now());
        const pct = rest.total > 0 ? Math.max(0, Math.min(100, (remaining / 1000 / rest.total) * 100)) : 0;
        const ex = LIB_MAP[rest.exId];
        return (
          <div className={"rest-bar" + (rest.done ? " done" : "")}>
            <div className="rest-fill" style={{ width: rest.done ? "100%" : pct + "%" }} />
            <div className="rest-inner">
              <div className="rest-info">
                <div className="rest-label">{rest.done ? "REST COMPLETE" : "RESTING"}</div>
                <div className="rest-ex">{ex ? ex.name : ""}</div>
              </div>
              <div className="rest-clock">{rest.done ? "READY" : fmtClock(remaining / 1000)}</div>
              <div className="rest-ctrls">
                <button onClick={() => { buzz(HAP.tap); bumpRest(-15); }}>−15</button>
                <button onClick={() => { buzz(HAP.tap); bumpRest(15); }}>+15</button>
                <button className="rest-skip" onClick={skipRest}>{rest.done ? "✕" : "SKIP"}</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* BOTTOM NAV */}
      <nav className="bnav" aria-label="Main navigation" style={{"--nav-index":["TRAIN","ARSENAL","BUILD","DATA","PROTOCOL"].indexOf(tab)}}><div className="nav-indicator" aria-hidden="true"/>
        {["TRAIN", "ARSENAL", "BUILD", "DATA", "PROTOCOL"].map(t => (
          <button key={t} aria-current={tab === t ? "page" : undefined} className={"bnav-btn" + (tab === t ? " on" : "")} onClick={() => navigate(t)}>
            <span className="bnav-ic"><NavIcon name={t}/></span><span>{t}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

/* ---------- SET LOGGER ---------- */
function SetLogger({ ex, sug, done, onAdd, onRemove }) {
  const [w, setW] = useState(sug.weight ?? "");
  const [r, setR] = useState(sug.reps ?? "");
  const [rir, setRir] = useState("");
  useEffect(() => { if (sug.weight != null && w === "") setW(sug.weight); }, [sug.weight]); // eslint-disable-line
  return (
    <div>
      {done.map((s, i) => (
        <div key={i} className="set-row">
          <span className="set-i">S{i + 1}</span>
          <span className="set-v">{s.w || "BW"} {s.w ? "lb" : ""} × {s.r}{s.rir !== "" && s.rir != null ? ` @${s.rir}RIR` : ""}</span>
          <button className="set-x" onClick={() => onRemove(ex.id, i)}>✕</button>
        </div>
      ))}
      <div className="set-input">
        <div className="si-field"><label>{ex.bw ? "+LB" : "LB"}</label><input type="number" inputMode="decimal" value={w} onChange={e => setW(e.target.value)} placeholder={ex.bw ? "0" : "—"} /></div>
        <div className="si-field"><label>{ex.unit === "sec" ? "SEC" : "REPS"}</label><input type="number" inputMode="numeric" value={r} onChange={e => setR(e.target.value)} placeholder={String(sug.reps)} /></div>
        <div className="si-field"><label>RIR</label><input type="number" inputMode="numeric" value={rir} onChange={e => setRir(e.target.value)} placeholder="2" /></div>
        <button className="si-add" onClick={() => { onAdd(ex.id, parseFloat(w) || 0, parseInt(r) || 0, rir === "" ? null : parseInt(rir)); }}>LOG ▸</button>
      </div>
    </div>
  );
}

/* ---------- DRAG-TO-REORDER LIST ----------
   Pointer-based (works on touch + mouse). Grab the grip, drag;
   neighbours slide to open a gap; drop commits the new order. */
function DragList({ ids, onReorder, onRemove, restOv, onRest, exOv, onTune, onResetTune }) {
  const [list, setList] = useState(ids);
  const [drag, setDrag] = useState(null); // {from, delta, height, target, centers}
  const dragRef = useRef(null);
  const rowRefs = useRef({});
  const listRef = useRef(list);
  listRef.current = list;

  // resync when exercises added/removed or day switched (not mid-drag)
  useEffect(() => { if (!dragRef.current) setList(ids); }, [ids.join("|")]); // eslint-disable-line

  const yOf = e => (e.touches ? e.touches[0].clientY : e.clientY);

  const start = (e, from) => {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const rects = listRef.current.map(id => rowRefs.current[id].getBoundingClientRect());
    const centers = rects.map(r => r.top + r.height / 2);
    const height = rects[from].height + 7; // dragged row + margin, including expanded tuning
    const d = { from, delta: 0, height, target: from, centers, startY: yOf(e) };
    dragRef.current = d; setDrag(d); buzz(HAP.pick);
  };

  const move = e => {
    const d = dragRef.current; if (!d) return;
    e.preventDefault();
    const delta = yOf(e) - d.startY;
    const center = d.centers[d.from] + delta;
    let target = 0;
    for (let i = 0; i < d.centers.length; i++) { if (i !== d.from && d.centers[i] < center) target++; }
    const nd = { ...d, delta, target };
    dragRef.current = nd; setDrag(nd);
  };

  const end = () => {
    const d = dragRef.current; if (!d) return;
    const arr = [...listRef.current];
    const [moved] = arr.splice(d.from, 1);
    arr.splice(d.target, 0, moved);
    dragRef.current = null; setDrag(null); setList(arr);
    if (arr.join("|") !== ids.join("|")) { onReorder(arr); buzz(HAP.drop); }
  };

  const shiftFor = i => {
    if (!drag) return 0;
    const { from, target, height } = drag;
    if (i === from) return drag.delta;
    const p = i > from ? i - 1 : i;
    const p2 = p >= target ? p + 1 : p;
    return (p2 - i) * height;
  };

  return (
    <div className="drag-wrap">
      {list.map((id, i) => {
        const ex = effEx(LIB_MAP[id], exOv);
        const ov = (exOv && exOv[id]) || {};
        const tuned = ov.sets != null || ov.lo != null || ov.hi != null;
        const lifted = drag && drag.from === i;
        return (
          <div
            key={id}
            ref={el => { if (el) rowRefs.current[id] = el; }}
            className={"build-row" + (lifted ? " lifted" : "")}
            style={{ transform: `translateY(${shiftFor(i)}px)`, transition: lifted ? "none" : "transform .18s cubic-bezier(.2,.8,.2,1)", zIndex: lifted ? 5 : 1 }}
          >
            <div
              className="grip"
              onPointerDown={e => start(e, i)}
              onPointerMove={move}
              onPointerUp={end}
              onPointerCancel={end}
            >⠿</div>
            <div className="build-main">
              <div className="ex-name">{ex.name}</div>
              <div className="ex-sub">{ex.eq} · {ex.mus} · {ex.sets}×{ex.range[0]}–{ex.range[1]}</div>
              <details className="build-tuning">
                <summary><span>REST {fmtClock(restOf(ex, restOv))}{tuned ? " · CUSTOM" : ""}</span><span className="tuning-action">TUNE +</span></summary>
                <div className="tuning-grid">
                  <TuneControl label="REST" value={fmtClock(restOf(ex,restOv))} onLess={()=>onRest(id,restOf(ex,restOv)-15)} onMore={()=>onRest(id,restOf(ex,restOv)+15)}/>
                  <TuneControl label="SETS" value={ex.sets} onLess={()=>onTune(id,{sets:ex.sets-1})} onMore={()=>onTune(id,{sets:ex.sets+1})}/>
                  <TuneControl label={ex.unit === "sec" ? "MIN SEC" : "MIN REPS"} value={ex.range[0]} onLess={()=>onTune(id,{lo:ex.range[0]-1})} onMore={()=>onTune(id,{lo:ex.range[0]+1})}/>
                  <TuneControl label={ex.unit === "sec" ? "MAX SEC" : "MAX REPS"} value={ex.range[1]} onLess={()=>onTune(id,{hi:ex.range[1]-1})} onMore={()=>onTune(id,{hi:ex.range[1]+1})}/>
                </div>
                {tuned && <button className="reset-tuning" onClick={()=>onResetTune(id)}>↺ RESET SETS / REPS</button>}
                {restOv[id] != null && <button className="reset-tuning" style={{marginLeft:12}} onClick={()=>onRest(id,restOf(ex,null))}>↺ RESET REST</button>}
              </details>
            </div>
            <button className="build-rm" aria-label={"Remove " + ex.name} onClick={() => onRemove(id)}>✕</button>
          </div>
        );
      })}
    </div>
  );
}

function TuneControl({label,value,onLess,onMore}) {
  return <div className="tune-control"><span>{label}</span><div><button onClick={onLess} aria-label={"Decrease " + label}>−</button><output>{value}</output><button onClick={onMore} aria-label={"Increase " + label}>+</button></div></div>;
}

const FONT_IMPORT = FONT_FACES;

const CSS = `
${FONT_IMPORT}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
.ct-root{min-height:100vh;background:#07080f;background-image:radial-gradient(ellipse at 50% -10%,rgba(0,240,255,.06),transparent 60%),radial-gradient(ellipse at 90% 110%,rgba(255,42,109,.05),transparent 50%);color:#cfd6e4;font-family:'Rajdhani',sans-serif;padding-bottom:84px;position:relative}
.ct-root.resting{padding-bottom:148px}
.scanlines{pointer-events:none;position:fixed;inset:0;z-index:50;background:repeating-linear-gradient(0deg,rgba(0,0,0,.13) 0 1px,transparent 1px 3px);mix-blend-mode:overlay}
@media (prefers-reduced-motion:no-preference){
  .flash{animation:flashin .25s steps(3) both}
  .live-dot{animation:pulse 1.2s infinite}
}
@keyframes flashin{from{transform:translateY(-8px) skewX(-8deg);opacity:0}to{transform:none;opacity:1}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.25}}
.flash{position:fixed;top:12px;left:50%;transform:translateX(-50%);z-index:100;background:#fcee0a;color:#07080f;font-family:'Share Tech Mono',monospace;font-size:11px;padding:8px 14px;clip-path:polygon(10px 0,100% 0,100% calc(100% - 10px),calc(100% - 10px) 100%,0 100%,0 10px);box-shadow:0 0 24px rgba(252,238,10,.6);max-width:92vw;text-align:center}

/* header */
.hdr{display:flex;align-items:center;gap:12px;padding:18px 16px 14px;border-bottom:1px solid rgba(0,240,255,.18);position:relative}
.hdr::after{content:"";position:absolute;bottom:-1px;left:16px;width:90px;height:2px;background:#fcee0a;box-shadow:0 0 8px #fcee0a}
.hdr-block{width:10px;height:38px;background:#fcee0a;clip-path:polygon(0 0,100% 0,100% calc(100% - 8px),0 100%);box-shadow:0 0 12px rgba(252,238,10,.7)}
.hdr h1{font-size:26px;font-weight:700;letter-spacing:1px;color:#eef2f9;line-height:1;text-transform:uppercase}
.hdr h1 span{color:#fcee0a;text-shadow:0 0 14px rgba(252,238,10,.55)}
.hdr-sub{font-family:'Share Tech Mono',monospace;font-size:9px;color:#5a647a;letter-spacing:.18em;margin-top:3px}
.hdr-stat{margin-left:auto;text-align:right}
.hdr-stat-n{font-family:'Share Tech Mono',monospace;font-size:18px;color:#00f0ff;text-shadow:0 0 10px rgba(0,240,255,.55)}
.hdr-stat-l{font-family:'Share Tech Mono',monospace;font-size:8px;color:#5a647a;letter-spacing:.14em}

.main{max-width:560px;margin:0 auto}
.pad{padding:18px 14px}
.sec-label{font-family:'Share Tech Mono',monospace;font-size:10px;letter-spacing:.16em;color:#fcee0a;margin-bottom:12px;text-shadow:0 0 8px rgba(252,238,10,.3)}
.hint{font-family:'Share Tech Mono',monospace;font-size:10px;color:#5a647a;line-height:1.7;margin-top:14px;border-left:2px solid rgba(0,240,255,.3);padding-left:10px}

/* day cards */
.day-card{display:flex;align-items:center;gap:14px;width:100%;text-align:left;background:rgba(13,16,28,.85);border:1px solid rgba(255,255,255,.07);color:inherit;padding:14px;margin-bottom:10px;cursor:pointer;clip-path:polygon(0 0,calc(100% - 16px) 0,100% 16px,100% 100%,0 100%);transition:border-color .15s, box-shadow .15s}
.day-card.sel{border-color:var(--dc);box-shadow:0 0 16px color-mix(in srgb,var(--dc) 30%,transparent),inset 0 0 24px rgba(0,0,0,.4)}
.day-letter{font-size:30px;font-weight:700;color:var(--dc);width:36px;text-align:center;text-shadow:0 0 14px var(--dc)}
.day-name{font-weight:700;font-size:15px;letter-spacing:.06em;color:#eef2f9}
.day-meta{font-family:'Share Tech Mono',monospace;font-size:9px;color:#5a647a;letter-spacing:.06em;margin-top:2px}
.day-chev{margin-left:auto;color:var(--dc);font-size:14px}

.cta{display:block;width:100%;margin-top:14px;background:#fcee0a;color:#07080f;border:none;font-family:'Rajdhani',sans-serif;font-weight:700;font-size:16px;letter-spacing:.1em;padding:15px;cursor:pointer;clip-path:polygon(12px 0,100% 0,100% calc(100% - 12px),calc(100% - 12px) 100%,0 100%,0 12px);box-shadow:0 0 22px rgba(252,238,10,.35)}
.cta:active{transform:translateY(1px)}
.cta-finish{background:#00f0ff;box-shadow:0 0 22px rgba(0,240,255,.35)}
.cta-abort{background:transparent;color:#ff003c;border:1px solid rgba(255,0,60,.4);box-shadow:none;font-size:12px;padding:10px}

/* live session */
.live-bar{display:flex;align-items:center;gap:8px;font-family:'Share Tech Mono',monospace;font-size:11px;color:#ff2a6d;letter-spacing:.12em;margin-bottom:14px;border:1px solid rgba(255,42,109,.35);padding:9px 12px;clip-path:polygon(0 0,calc(100% - 12px) 0,100% 12px,100% 100%,0 100%);background:rgba(255,42,109,.05)}
.live-dot{width:7px;height:7px;background:#ff2a6d;border-radius:50%;box-shadow:0 0 8px #ff2a6d}
.live-vol{margin-left:auto;color:#00f0ff}

/* exercise cards */
.ex-card{background:rgba(13,16,28,.85);border:1px solid rgba(255,255,255,.07);margin-bottom:9px;clip-path:polygon(0 0,calc(100% - 14px) 0,100% 14px,100% 100%,0 100%)}
.ex-card.open{border-color:rgba(0,240,255,.45);box-shadow:0 0 14px rgba(0,240,255,.12)}
.ex-card.done{border-color:rgba(252,238,10,.5)}
.ex-card.done .ex-prog{color:#fcee0a;text-shadow:0 0 8px rgba(252,238,10,.5)}
.ex-head{display:flex;align-items:center;justify-content:space-between;width:100%;background:none;border:none;color:inherit;padding:13px 14px;text-align:left;cursor:pointer;font-family:inherit}
.ex-name{font-weight:600;font-size:15px;color:#eef2f9;letter-spacing:.03em}
.ex-sub{font-family:'Share Tech Mono',monospace;font-size:9px;color:#5a647a;letter-spacing:.08em;margin-top:2px}
.ex-prog{font-family:'Share Tech Mono',monospace;font-size:15px;color:#00f0ff;text-align:right}
.ex-prog-l{display:block;font-size:8px;color:#5a647a;letter-spacing:.14em}
.ex-body{padding:0 14px 14px;border-top:1px dashed rgba(255,255,255,.08)}

.sug{font-family:'Share Tech Mono',monospace;font-size:10px;line-height:1.6;padding:9px 11px;margin:12px 0;border-left:3px solid}
.sug-tag{display:inline-block;font-weight:700;margin-right:8px;letter-spacing:.1em}
.sug-UP{border-color:#fcee0a;background:rgba(252,238,10,.07);color:#fcee0a}
.sug-HOLD{border-color:#00f0ff;background:rgba(0,240,255,.06);color:#9fdcec}
.sug-DOWN{border-color:#ff003c;background:rgba(255,0,60,.07);color:#ff7a96}
.sug-INIT{border-color:#ff2a6d;background:rgba(255,42,109,.06);color:#ff8fb3}

.set-row{display:flex;align-items:center;gap:10px;font-family:'Share Tech Mono',monospace;font-size:12px;padding:7px 0;border-bottom:1px solid rgba(255,255,255,.05)}
.set-i{color:#fcee0a;font-size:10px;width:24px}
.set-v{color:#cfd6e4}
.set-x{margin-left:auto;background:none;border:none;color:#ff003c;cursor:pointer;font-size:12px;padding:2px 6px}
.set-input{display:flex;gap:8px;align-items:flex-end;margin-top:12px}
.si-field{flex:1}
.si-field label{display:block;font-family:'Share Tech Mono',monospace;font-size:8px;color:#5a647a;letter-spacing:.14em;margin-bottom:4px}
.si-field input{width:100%;background:#0a0d18;border:1px solid rgba(0,240,255,.25);color:#00f0ff;font-family:'Share Tech Mono',monospace;font-size:16px;padding:9px 8px;outline:none}
.si-field input:focus{border-color:#00f0ff;box-shadow:0 0 10px rgba(0,240,255,.25)}
.si-add{background:#00f0ff;color:#07080f;border:none;font-family:'Rajdhani',sans-serif;font-weight:700;font-size:13px;letter-spacing:.08em;padding:11px 14px;cursor:pointer;clip-path:polygon(8px 0,100% 0,100% calc(100% - 8px),calc(100% - 8px) 100%,0 100%,0 8px)}

/* library */
.filter-row{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px}
.chip{font-family:'Share Tech Mono',monospace;font-size:9px;letter-spacing:.1em;padding:6px 10px;background:transparent;border:1px solid rgba(255,255,255,.14);color:#5a647a;cursor:pointer;clip-path:polygon(6px 0,100% 0,100% calc(100% - 6px),calc(100% - 6px) 100%,0 100%,0 6px)}
.chip.on{border-color:#fcee0a;color:#fcee0a;box-shadow:0 0 10px rgba(252,238,10,.2)}
.lib-row{display:flex;align-items:center;gap:10px;background:rgba(13,16,28,.85);border:1px solid rgba(255,255,255,.07);padding:11px 13px;margin-bottom:8px;clip-path:polygon(0 0,calc(100% - 12px) 0,100% 12px,100% 100%,0 100%)}
.lib-main{flex:1}
.lib-next{font-family:'Share Tech Mono',monospace;font-size:9px;color:#00f0ff;margin-top:4px;letter-spacing:.06em}
.lib-add{background:transparent;border:1px solid #fcee0a;color:#fcee0a;font-family:'Share Tech Mono',monospace;font-size:10px;padding:7px 10px;cursor:pointer}
.lib-add.in{border-color:rgba(0,240,255,.4);color:#00f0ff;opacity:.7}
.lib-add:disabled{cursor:default}

/* build */
.build-label{display:block;font-family:'Share Tech Mono',monospace;font-size:9px;color:#5a647a;letter-spacing:.14em;margin-bottom:6px}
.build-name{width:100%;background:#0a0d18;border:1px solid rgba(0,240,255,.25);color:#eef2f9;font-family:'Rajdhani',sans-serif;font-weight:700;font-size:16px;letter-spacing:.05em;padding:11px 12px;outline:none}
.build-name:focus{border-color:#00f0ff;box-shadow:0 0 10px rgba(0,240,255,.25)}
.drag-wrap{position:relative}
.build-row{display:flex;align-items:center;gap:10px;background:rgba(13,16,28,.92);border:1px solid rgba(255,255,255,.07);padding:9px 12px;margin-bottom:7px;clip-path:polygon(0 0,calc(100% - 12px) 0,100% 12px,100% 100%,0 100%);position:relative;will-change:transform}
.build-row.lifted{border-color:#00f0ff;background:rgba(13,20,34,.98);box-shadow:0 8px 28px rgba(0,0,0,.6),0 0 18px rgba(0,240,255,.4)}
.grip{flex-shrink:0;color:#5a647a;font-size:18px;line-height:1;padding:6px 8px 6px 2px;cursor:grab;touch-action:none;user-select:none;-webkit-user-select:none}
.grip:active{cursor:grabbing}
.build-row.lifted .grip{color:#00f0ff;text-shadow:0 0 8px #00f0ff}
.build-main{flex:1;min-width:0}
.build-rm{background:none;border:1px solid rgba(255,0,60,.35);color:#ff003c;font-size:11px;padding:6px 9px;cursor:pointer;flex-shrink:0}
.rest-edit{display:flex;align-items:center;gap:7px;margin-top:7px}
.rest-edit-l{font-family:'Share Tech Mono',monospace;font-size:8px;color:#5a647a;letter-spacing:.16em}
.rest-step{background:rgba(0,240,255,.07);border:1px solid rgba(0,240,255,.3);color:#00f0ff;font-family:'Share Tech Mono',monospace;font-size:13px;width:26px;height:24px;line-height:1;cursor:pointer;padding:0}
.rest-step:active{background:rgba(0,240,255,.2)}
.rest-val{font-family:'Share Tech Mono',monospace;font-size:12px;color:#8b95ab;min-width:38px;text-align:center}
.rest-val.custom{color:#fcee0a;text-shadow:0 0 8px rgba(252,238,10,.4)}
.rest-def{background:none;border:none;color:#5a647a;font-size:12px;cursor:pointer;padding:2px 4px}
.rest-def:hover{color:#ff2a6d}
.reset-btn{width:100%;margin-top:8px;background:transparent;border:1px dashed rgba(255,255,255,.18);color:#5a647a;font-family:'Share Tech Mono',monospace;font-size:10px;letter-spacing:.1em;padding:9px;cursor:pointer}
.reset-btn:hover{color:#ff2a6d;border-color:rgba(255,42,109,.4)}

/* stats */
.stat-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}
.stat-card{background:rgba(13,16,28,.85);border:1px solid rgba(255,255,255,.07);padding:14px;clip-path:polygon(0 0,calc(100% - 12px) 0,100% 12px,100% 100%,0 100%)}
.stat-card.big{grid-column:1/-1}
.stat-n{font-family:'Share Tech Mono',monospace;font-size:26px;line-height:1}
.stat-card.big .stat-n{font-size:38px}
.yellow{color:#fcee0a;text-shadow:0 0 16px rgba(252,238,10,.5)}
.cyan{color:#00f0ff;text-shadow:0 0 12px rgba(0,240,255,.45)}
.magenta{color:#ff2a6d;text-shadow:0 0 12px rgba(255,42,109,.5)}
.stat-l{font-family:'Share Tech Mono',monospace;font-size:8px;color:#5a647a;letter-spacing:.16em;margin-top:6px}
.stat-ex{background:rgba(13,16,28,.85);border:1px solid rgba(255,255,255,.07);padding:12px 13px;margin-bottom:8px;cursor:pointer;clip-path:polygon(0 0,calc(100% - 12px) 0,100% 12px,100% 100%,0 100%)}
.stat-ex-top{display:flex;align-items:center;justify-content:space-between;gap:10px}
.pos{color:#00f0ff}.neg{color:#ff003c}
.stat-ex-hist{margin-top:10px;border-top:1px dashed rgba(255,255,255,.08);padding-top:8px}
.hist-row{display:flex;gap:10px;font-family:'Share Tech Mono',monospace;font-size:10px;padding:4px 0;color:#8b95ab}
.hist-date{color:#fcee0a;width:52px;flex-shrink:0}
.hist-sets{flex:1;word-break:break-word}
.hist-vol{color:#00f0ff}

/* plan */
.warm-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
@media(max-width:430px){.warm-grid{grid-template-columns:1fr}}
.warm-item{display:flex;gap:9px;align-items:flex-start;background:rgba(13,16,28,.85);border:1px solid rgba(255,255,255,.07);padding:10px 11px}
.warm-dot{width:5px;height:5px;background:#fcee0a;margin-top:6px;flex-shrink:0;box-shadow:0 0 6px #fcee0a}
.warm-n{font-size:13px;font-weight:600;color:#eef2f9}
.warm-d{font-family:'Share Tech Mono',monospace;font-size:9px;color:#00f0ff;margin-top:2px}
.ramp{border:1px solid rgba(255,255,255,.07);background:rgba(13,16,28,.85);padding:4px 13px}
.ramp-row{display:flex;justify-content:space-between;font-family:'Share Tech Mono',monospace;font-size:11px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.05)}
.ramp-row:last-child{border-bottom:none}
.ramp-l{color:#fcee0a}
.ramp-r{color:#8b95ab}
.plan-row{display:flex;justify-content:space-between;padding:9px 13px;background:rgba(13,16,28,.85);border:1px solid rgba(255,255,255,.06);margin-bottom:6px;font-size:14px}
.plan-n{color:#cfd6e4;font-weight:600}
.plan-d{font-family:'Share Tech Mono',monospace;font-size:11px;color:#5a647a}

/* rest timer */
.rest-start{width:100%;margin-top:12px;background:transparent;border:1px solid rgba(0,240,255,.35);color:#00f0ff;font-family:'Share Tech Mono',monospace;font-size:11px;letter-spacing:.1em;padding:9px;cursor:pointer;clip-path:polygon(8px 0,100% 0,100% calc(100% - 8px),calc(100% - 8px) 100%,0 100%,0 8px)}
.rest-start:active{transform:translateY(1px)}
.rest-bar{position:fixed;left:0;right:0;bottom:60px;z-index:55;background:rgba(8,11,20,.97);border-top:1px solid rgba(0,240,255,.3);overflow:hidden;backdrop-filter:blur(8px)}
.rest-bar.done{border-top-color:#fcee0a}
.rest-fill{position:absolute;top:0;left:0;bottom:0;background:linear-gradient(90deg,rgba(0,240,255,.16),rgba(0,240,255,.05));border-right:2px solid #00f0ff;box-shadow:0 0 14px rgba(0,240,255,.4);transition:width .25s linear}
.rest-bar.done .rest-fill{background:rgba(252,238,10,.12);border-right-color:#fcee0a;box-shadow:0 0 16px rgba(252,238,10,.5);animation:restpulse 1s ease-in-out infinite}
@keyframes restpulse{0%,100%{opacity:1}50%{opacity:.4}}
.rest-inner{position:relative;display:flex;align-items:center;gap:12px;padding:10px 14px;max-width:560px;margin:0 auto}
.rest-info{min-width:0;flex:1}
.rest-label{font-family:'Share Tech Mono',monospace;font-size:8px;letter-spacing:.18em;color:#5a647a}
.rest-bar.done .rest-label{color:#fcee0a}
.rest-ex{font-size:13px;font-weight:600;color:#eef2f9;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rest-clock{font-family:'Share Tech Mono',monospace;font-size:24px;color:#00f0ff;text-shadow:0 0 12px rgba(0,240,255,.5);min-width:64px;text-align:center}
.rest-bar.done .rest-clock{color:#fcee0a;text-shadow:0 0 12px rgba(252,238,10,.5);font-size:18px}
.rest-ctrls{display:flex;gap:6px;flex-shrink:0}
.rest-ctrls button{background:rgba(0,240,255,.08);border:1px solid rgba(0,240,255,.3);color:#00f0ff;font-family:'Share Tech Mono',monospace;font-size:11px;padding:8px 9px;cursor:pointer}
.rest-ctrls .rest-skip{background:rgba(255,0,60,.08);border-color:rgba(255,0,60,.35);color:#ff003c}
@media(max-width:380px){.rest-ctrls button{padding:8px 6px;font-size:10px}.rest-clock{font-size:20px;min-width:54px}}

/* per-exercise tuning */
.tune-edit{flex-wrap:wrap;margin-top:4px}
.tune-gap{margin-left:8px}
.tune-dash{color:#5a647a;font-family:'Share Tech Mono',monospace;font-size:11px;padding:0 1px}

/* data vault */
.vault-btns{display:flex;gap:8px;flex-wrap:wrap}
.vault-btn{font-family:'Share Tech Mono',monospace;font-size:11px;letter-spacing:.08em;padding:10px 14px;cursor:pointer;background:rgba(0,240,255,.06);border:1px solid rgba(0,240,255,.3);color:#00f0ff}
.vault-btn.yellow{background:rgba(252,238,10,.06);border-color:rgba(252,238,10,.35);color:#fcee0a}
.vault-btn.red{background:rgba(255,0,60,.06);border-color:rgba(255,0,60,.35);color:#ff003c}
.vault-btn:disabled{opacity:.35;cursor:default}
.vault-msg{margin-top:10px;font-family:'Share Tech Mono',monospace;font-size:10px;letter-spacing:.08em;color:#fcee0a;text-shadow:0 0 8px rgba(252,238,10,.4)}
.vault-panel{margin-top:10px}
.vault-ta{width:100%;background:rgba(8,10,18,.9);border:1px solid rgba(0,240,255,.25);color:#eef2f9;font-family:'Share Tech Mono',monospace;font-size:10px;padding:10px;margin-bottom:8px;resize:vertical}

/* bottom nav */
.bnav{position:fixed;bottom:0;left:0;right:0;display:flex;background:rgba(8,10,18,.96);border-top:1px solid rgba(0,240,255,.2);backdrop-filter:blur(8px);z-index:60;padding-bottom:env(safe-area-inset-bottom)}
.bnav-btn{flex:1;background:none;border:none;color:#5a647a;font-family:'Share Tech Mono',monospace;font-size:9px;letter-spacing:.1em;padding:11px 4px 13px;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:3px;border-top:2px solid transparent}
.bnav-btn.on{color:#fcee0a;border-top-color:#fcee0a;text-shadow:0 0 10px rgba(252,238,10,.5)}
.bnav-ic{font-size:16px;line-height:1}
input::-webkit-outer-spin-button,input::-webkit-inner-spin-button{-webkit-appearance:none}
button:focus-visible,input:focus-visible{outline:2px solid #fcee0a;outline-offset:1px}
`;

function SearchControls({search,setSearch,muscle,setMuscle}) { return <div className="search-controls"><label>SEARCH ARSENAL<input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Exercise, equipment, muscle…"/></label><label>MUSCLE GROUP<select value={muscle} onChange={e=>setMuscle(e.target.value)}><option value="ALL">All muscles</option>{[...new Set(LIB.map(e=>e.mus))].sort().map(m=><option key={m}>{m}</option>)}</select></label></div>; }
function ExerciseGuide({ex}) { const g=guideFor(ex); return <details className="exercise-guide"><summary>SETUP & TECHNIQUE {ex.perSide ? " / EACH SIDE" : ""}</summary><p>{g.setup}</p><p>{g.cue}</p><p className="load-note">{g.load}</p></details>; }
