/**
 * TrainInlineTracker — Horizontal station timeline
 * ─────────────────────────────────────────────────────────────────────────────
 * Each station is a styled CODE BADGE sitting ON the rail line.
 * The train icon stays pinned at the horizontal center.
 * The strip slides underneath so the current position is always centered.
 *
 *  ← fade   [MUM]━━━━━━━[PUNE]━━━━━━━[🚂]━━━━━━━[NGP]━━━━━━━[NDLS]  fade →
 *          Mumbai        Pune      ↑center       Nagpur        Delhi
 *          10:00         13:30                   17:15         22:00
 */

import { API_BASE } from '@/lib/api';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import {
    CheckCheck,
    Clock,
    MapPin,
    Navigation,
    Radio,
    Train as TrainIcon,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

// ─── Constants ────────────────────────────────────────────────────────────────
const STOP_WIDTH  = 175;   // px — horizontal space per station
const RAIL_TOP_PC = 42;    // % from top where the rail sits inside the track area

// ─── Types ────────────────────────────────────────────────────────────────────
interface TrackingStop {
  stop_id: number;
  stop_order: number;
  arrival_time: string | null;
  departure_time: string | null;
  halt_duration: number | null;
  distance_from_source: number;
  station: {
    id?: number;
    name: string;
    code: string;
    station_name?: string;
    station_code?: string;
  };
}

type TrainStatus = 'at_station' | 'in_transit' | 'not_started' | 'completed';

interface VirtualLocation {
  status: TrainStatus;
  progressPercent: number;
  segmentProgress: number;
  currentStopIndex: number;
  nextStopIndex: number | null;
  currentStation: string;
  nextStation: string | null;
  statusLabel: string;
}

// ─── Virtual GPS logic ────────────────────────────────────────────────────────
function toMins(t: string | null | undefined): number | null {
  if (!t) return null;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}
function sName(stop: TrackingStop) {
  return stop.station.name || stop.station.station_name || '';
}
function sCode(stop: TrackingStop) {
  return (stop.station.code || stop.station.station_code || '').toUpperCase();
}

function getLocation(stops: TrackingStop[], now: Date): VirtualLocation {
  const sorted = [...stops].sort((a, b) => a.stop_order - b.stop_order);
  const n = sorted.length;
  if (n === 0) return { status: 'not_started', progressPercent: 0, segmentProgress: 0, currentStopIndex: 0, nextStopIndex: null, currentStation: '', nextStation: null, statusLabel: 'No data' };

  const nowM = now.getHours() * 60 + now.getMinutes();
  const firstDep = toMins(sorted[0].departure_time);
  if (firstDep !== null && nowM < firstDep)
    return { status: 'not_started', progressPercent: 0, segmentProgress: 0, currentStopIndex: 0, nextStopIndex: null, currentStation: sName(sorted[0]), nextStation: null, statusLabel: `Departs ${sorted[0].departure_time?.substring(0, 5)}` };

  const lastArr = toMins(sorted[n - 1].arrival_time);
  if (lastArr !== null && nowM > lastArr)
    return { status: 'completed', progressPercent: 100, segmentProgress: 100, currentStopIndex: n - 1, nextStopIndex: null, currentStation: sName(sorted[n - 1]), nextStation: null, statusLabel: 'Journey complete' };

  for (let i = 0; i < n; i++) {
    const arr = toMins(sorted[i].arrival_time);
    const dep = toMins(sorted[i].departure_time);
    if ((arr === null || nowM >= arr) && (dep === null || nowM <= dep))
      return { status: 'at_station', progressPercent: (i / (n - 1)) * 100, segmentProgress: 50, currentStopIndex: i, nextStopIndex: i + 1 < n ? i + 1 : null, currentStation: sName(sorted[i]), nextStation: i + 1 < n ? sName(sorted[i + 1]) : null, statusLabel: `Halting at ${sName(sorted[i])}` };
    if (i + 1 < n) {
      const nextArr = toMins(sorted[i + 1].arrival_time);
      if (dep !== null && nextArr !== null && nowM >= dep && nowM <= nextArr) {
        const segPct = (nextArr - dep) > 0 ? Math.min(100, ((nowM - dep) / (nextArr - dep)) * 100) : 0;
        return { status: 'in_transit', progressPercent: Math.min(100, ((i + segPct / 100) / (n - 1)) * 100), segmentProgress: segPct, currentStopIndex: i, nextStopIndex: i + 1, currentStation: sName(sorted[i]), nextStation: sName(sorted[i + 1]), statusLabel: `En route → ${sName(sorted[i + 1])}` };
      }
    }
  }
  return { status: 'in_transit', progressPercent: 50, segmentProgress: 50, currentStopIndex: 0, nextStopIndex: null, currentStation: sName(sorted[0]), nextStation: null, statusLabel: 'En route' };
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface TrainInlineTrackerProps {
  runId: string | number;
  isOpen: boolean;
  onToggle: (e: React.MouseEvent) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function TrainInlineTracker({ runId, isOpen, onToggle }: TrainInlineTrackerProps) {
  const [stops, setStops]       = useState<TrackingStop[]>([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [now, setNow]           = useState(new Date());
  const [containerW, setContainerW] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasLoaded    = useRef(false);

  // Fetch once on first open
  useEffect(() => {
    if (!isOpen || !runId || hasLoaded.current) return;
    hasLoaded.current = true;
    (async () => {
      setLoading(true);
      try {
        const res  = await fetch(`${API_BASE}/trains/runs/${runId}`);
        if (!res.ok) throw new Error('Failed');
        const data = await res.json();
        setStops([...(data.stops ?? [])].sort((a: TrackingStop, b: TrackingStop) => a.stop_order - b.stop_order));
      } catch { setError('Could not load schedule data.'); }
      finally  { setLoading(false); }
    })();
  }, [isOpen, runId]);

  // Clock tick every 10 s
  useEffect(() => {
    if (!isOpen) return;
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 10_000);
    return () => clearInterval(id);
  }, [isOpen]);

  // Measure container
  useEffect(() => {
    if (!isOpen || !containerRef.current) return;
    const obs = new ResizeObserver(([e]) => setContainerW(e.contentRect.width));
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, [isOpen]);

  // Virtual position
  const loc     = stops.length ? getLocation(stops, now) : null;
  const n       = stops.length;
  const stripW  = n * STOP_WIDTH;
  // trainPx: pixel position of train inside the strip (0 = start, stripW = end)
  // mapped so 0% → first station center and 100% → last station center
  const trainPx = loc && n > 1
    ? STOP_WIDTH / 2 + (loc.progressPercent / 100) * (n - 1) * STOP_WIDTH
    : STOP_WIDTH / 2;
  const translateX = containerW > 0 ? containerW / 2 - trainPx : 0;

  // Status colours
  const STATUS = {
    at_station:  { badge: 'bg-emerald-50 border-emerald-200 text-emerald-700', dot: 'bg-emerald-500' },
    in_transit:  { badge: 'bg-blue-50 border-blue-200 text-blue-700',          dot: 'bg-blue-500'    },
    not_started: { badge: 'bg-amber-50 border-amber-200 text-amber-700',       dot: 'bg-amber-500'   },
    completed:   { badge: 'bg-slate-100 border-slate-200 text-slate-500',      dot: 'bg-slate-400'   },
  };
  const sm = STATUS[loc?.status ?? 'not_started'];

  return (
    <AnimatePresence initial={false}>
      {isOpen && (
        <motion.div
          key="inline-tracker"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.32, ease: [0.4, 0, 0.2, 1] }}
          style={{ overflow: 'hidden' }}
          onClick={e => e.stopPropagation()}
        >
          <div className="mt-5 pt-5 border-t border-slate-100 space-y-4">

            {/* ── Loading ─────────────────────────────────────────── */}
            {loading && (
              <div className="flex items-center gap-3 py-3">
                <div className="w-5 h-5 rounded-full border-2 border-blue-200 border-t-blue-600 animate-spin" />
                <span className="text-sm text-slate-400 font-medium">Loading live schedule…</span>
              </div>
            )}

            {/* ── Error ───────────────────────────────────────────── */}
            {error && !loading && (
              <p className="text-sm text-rose-500 py-2 flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-rose-100 inline-block flex-shrink-0" />
                {error}
              </p>
            )}

            {/* ── Main content ─────────────────────────────────────── */}
            {!loading && !error && loc && stops.length > 0 && (<>

              {/* ── Status row ───────────────────────────────────── */}
              <div className="flex flex-wrap items-center gap-2">
                <span className={cn('inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full border', sm.badge)}>
                  <span className={cn('w-1.5 h-1.5 rounded-full', sm.dot, loc.status === 'at_station' && 'animate-pulse')} />
                  {loc.statusLabel}
                </span>

                {/* current / next station chips */}
                {loc.status === 'in_transit' && loc.nextStation && loc.nextStopIndex !== null && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-100 px-3 py-1 rounded-full">
                    <Navigation className="w-3 h-3" />
                    {stops[loc.nextStopIndex] && sCode(stops[loc.nextStopIndex])} · {stops[loc.nextStopIndex]?.arrival_time?.substring(0, 5)}
                  </span>
                )}
                {loc.status === 'at_station' && stops[loc.currentStopIndex]?.departure_time && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full">
                    <MapPin className="w-3 h-3" />
                    Dep {stops[loc.currentStopIndex].departure_time?.substring(0, 5)}
                  </span>
                )}

                {/* clock */}
                <span className="ml-auto text-xs font-mono text-slate-400 inline-flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                </span>
              </div>

              {/* ── Horizontal track ─────────────────────────────── */}
              <div
                ref={containerRef}
                className="relative rounded-2xl overflow-hidden border border-slate-100"
                style={{ height: 148, background: 'linear-gradient(180deg,#f8fafc 0%,#f1f5f9 100%)' }}
              >
                {/* Left + right gradient fades */}
                <div className="absolute inset-y-0 left-0 w-20 z-10 pointer-events-none"
                  style={{ background: 'linear-gradient(to right,#f1f5f9 30%,transparent)' }} />
                <div className="absolute inset-y-0 right-0 w-20 z-10 pointer-events-none"
                  style={{ background: 'linear-gradient(to left,#f1f5f9 30%,transparent)' }} />

                {/* ── Fixed center: "now" marker ── */}
                <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center justify-center pointer-events-none">
                  {/* Vertical dashed guide */}
                  <div className="absolute top-0 bottom-0 w-px border-l border-dashed border-blue-300/50" />

                  {/* Train icon */}
                  <motion.div
                    className={cn(
                      'relative z-10 flex flex-col items-center gap-0.5',
                    )}
                    style={{ marginTop: `-${148 * RAIL_TOP_PC / 100 - 20}px` }}
                  >
                    <motion.div
                      className={cn(
                        'w-10 h-10 rounded-full flex items-center justify-center shadow-xl ring-4',
                        loc.status === 'at_station' ? 'bg-emerald-500 ring-emerald-100/70' :
                        loc.status === 'in_transit' ? 'bg-blue-600 ring-blue-100/70' :
                        loc.status === 'completed'  ? 'bg-slate-400 ring-slate-200/70' :
                        'bg-amber-500 ring-amber-100/70'
                      )}
                      animate={
                        loc.status === 'at_station' ? { scale: [1, 1.1, 1] } :
                        loc.status === 'in_transit' ? { y: [0, -3, 0] } : {}
                      }
                      transition={{ repeat: Infinity, duration: loc.status === 'at_station' ? 1.8 : 1.0, ease: 'easeInOut' }}
                    >
                      <TrainIcon className="w-5 h-5 text-white" />
                    </motion.div>
                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 leading-none">NOW</span>
                  </motion.div>
                </div>

                {/* ── Sliding station strip ── */}
                <div
                  className="absolute top-0 bottom-0"
                  style={{
                    width: stripW,
                    transform: `translateX(${translateX}px)`,
                    transition: 'transform 1.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                >
                  {/* Dashed track rail */}
                  <div
                    className="absolute left-0 right-0"
                    style={{
                      top: `${RAIL_TOP_PC}%`,
                      height: 2,
                      background: 'repeating-linear-gradient(to right,#94a3b8 0,#94a3b8 6px,transparent 6px,transparent 14px)',
                    }}
                  />

                  {/* Colored progress line (past portion) */}
                  {trainPx > STOP_WIDTH / 2 && (
                    <div
                      className="absolute"
                      style={{
                        top: `${RAIL_TOP_PC}%`,
                        height: 2,
                        left: STOP_WIDTH / 2,
                        width: Math.max(0, trainPx - STOP_WIDTH / 2),
                        background: 'linear-gradient(to right,#22c55e,#3b82f6)',
                        borderRadius: 2,
                      }}
                    />
                  )}

                  {/* ── Station nodes ── */}
                  {stops.map((stop, i) => {
                    const past    = i < loc.currentStopIndex;
                    const current = i === loc.currentStopIndex;
                    const next    = i === loc.nextStopIndex;
                    const future  = !past && !current && !next;
                    const code    = sCode(stop) || sName(stop).substring(0, 4).toUpperCase();
                    const name    = sName(stop);
                    const arrT    = stop.arrival_time?.substring(0, 5)  ?? '';
                    const depT    = stop.departure_time?.substring(0, 5) ?? '';
                    const timeDisplay = arrT || depT;
                    const halt    = stop.halt_duration;

                    // Badge size: current station is slightly larger
                    const badgeSize = current ? 'w-11 h-11' : past || next ? 'w-9 h-9' : 'w-8 h-8';
                    const badgeTop  = current
                      ? `calc(${RAIL_TOP_PC}% - 22px)` // centred on rail
                      : past || next
                      ? `calc(${RAIL_TOP_PC}% - 18px)`
                      : `calc(${RAIL_TOP_PC}% - 16px)`;

                    // Badge style by state
                    const badgeClass = cn(
                      'absolute rounded-full flex items-center justify-center transition-all duration-500 font-black tracking-tight leading-none cursor-default select-none',
                      badgeSize,
                      past    && 'bg-green-500 text-white shadow-md shadow-green-400/40 border border-green-400',
                      current && loc.status === 'at_station' && 'bg-emerald-500 text-white shadow-xl shadow-emerald-400/50 border-2 border-emerald-300 ring-4 ring-emerald-100',
                      current && loc.status !== 'at_station' && 'bg-blue-600 text-white shadow-xl shadow-blue-400/50 border-2 border-blue-400 ring-4 ring-blue-100',
                      next    && 'bg-white text-blue-600 border-2 border-blue-300 shadow-md shadow-blue-100/60',
                      future  && 'bg-white text-slate-400 border border-slate-200 shadow-sm',
                    );

                    // Text size inside badge (shorter = bigger text)
                    const codeTextClass = code.length <= 3 ? 'text-[9px]' : code.length === 4 ? 'text-[8px]' : 'text-[7px]';

                    return (
                      <div
                        key={stop.stop_id}
                        className="absolute"
                        style={{
                          left: i * STOP_WIDTH,
                          top: 0,
                          bottom: 0,
                          width: STOP_WIDTH,
                        }}
                      >
                        {/* ── Code badge centered horizontally in the slot ── */}
                        <div
                          className={badgeClass}
                          style={{
                            left: '50%',
                            transform: 'translateX(-50%)',
                            top: badgeTop,
                          }}
                        >
                          {/* Past station: show checkmark for single-char codes */}
                          {past && code.length > 5 ? (
                            <CheckCheck className="w-3 h-3" />
                          ) : (
                            <span className={codeTextClass}>{code}</span>
                          )}
                        </div>

                        {/* ── Connector line from badge bottom to rail ── */}
                        {(past || current || next) && (
                          <div
                            className={cn(
                              'absolute w-px',
                              past ? 'bg-green-300' : current ? 'bg-blue-300' : 'bg-blue-200'
                            )}
                            style={{
                              left: '50%',
                              top: badgeTop,
                              height: 8,
                              marginTop: current ? 44 : 36,
                            }}
                          />
                        )}

                        {/* ── Station info block — below the rail ── */}
                        <div
                          className="absolute w-full px-2 text-center"
                          style={{ top: `calc(${RAIL_TOP_PC}% + 10px)` }}
                        >
                          {/* Station full name */}
                          <p
                            className={cn(
                              'text-[10px] font-bold leading-tight truncate',
                              past    ? 'text-green-700'  :
                              current ? 'text-slate-900'  :
                              next    ? 'text-slate-700'  : 'text-slate-400'
                            )}
                            title={name}
                          >
                            {name}
                          </p>

                          {/* Arrival time */}
                          {timeDisplay && (
                            <p className={cn(
                              'text-[9px] font-mono leading-none mt-0.5',
                              past    ? 'text-green-500 line-through decoration-green-300' :
                              current ? 'text-blue-600 font-bold' :
                              next    ? 'text-blue-400' : 'text-slate-400'
                            )}>
                              {timeDisplay}
                            </p>
                          )}

                          {/* Halt badge — only show for stations with meaningful halt */}
                          {halt !== null && halt !== undefined && halt > 0 && (
                            <span className={cn(
                              'inline-flex items-center gap-0.5 mt-1 rounded-full px-1.5 py-0.5 leading-none',
                              'text-[8px] font-bold',
                              past    ? 'bg-green-100 text-green-600' :
                              current ? 'bg-amber-100 text-amber-700' :
                              'bg-slate-100 text-slate-400'
                            )}>
                              <Clock className="w-2 h-2" />
                              {halt}m
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── Progress bar row ─────────────────────────────── */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: 'linear-gradient(to right,#22c55e,#3b82f6)' }}
                    initial={{ width: 0 }}
                    animate={{ width: `${loc.progressPercent}%` }}
                    transition={{ duration: 1.3, ease: 'easeOut' }}
                  />
                </div>
                <span className="text-[10px] font-black font-mono text-slate-400 flex-shrink-0 tabular-nums">
                  {Math.round(loc.progressPercent)}%
                </span>
              </div>

              {/* Disclaimer */}
              <p className="text-[9px] text-slate-300 flex items-center gap-1">
                <Radio className="w-2.5 h-2.5 flex-shrink-0" />
                Virtual tracking based on schedule — not live GPS data
              </p>

            </>)}

            {!loading && !error && !loc && !stops.length && hasLoaded.current && (
              <p className="text-sm text-slate-400 py-3 text-center">No schedule data for this run.</p>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
