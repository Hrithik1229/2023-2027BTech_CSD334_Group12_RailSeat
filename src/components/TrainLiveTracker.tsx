import { API_BASE } from '@/lib/api';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import {
    CheckCircle2,
    ChevronRight,
    Clock,
    MapPin,
    Navigation,
    Radio,
    Train as TrainIcon,
    X,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface TrackingStop {
  stop_id: number;
  stop_order: number;
  arrival_time: string | null;
  departure_time: string | null;
  halt_duration: number | null;
  distance_from_source: number;
  station: {
    id: number;
    name: string;
    code: string;
    station_name?: string;
    station_code?: string;
  };
}

interface TrainRunData {
  run_id: number;
  train_id: number;
  direction: string;
  stops: TrackingStop[];
  train?: {
    train_name: string;
    train_number: string;
  };
}

interface TrainVirtualLocation {
  status: 'at_station' | 'in_transit' | 'not_started' | 'completed';
  progressPercent: number; // 0-100 along the full route
  segmentProgress: number; // 0-100 between current two stops
  currentStopIndex: number; // index in stops array
  nextStopIndex: number | null;
  currentStation: string | null;
  nextStation: string | null;
  minutesDelay: number; // always 0 for virtual
  statusLabel: string;
}

// ─── Virtual GPS Logic ────────────────────────────────────────────────────────

/**
 * Converts "HH:MM:SS" or "HH:MM" to total minutes since midnight.
 */
function timeToMinutes(time: string | null | undefined): number | null {
  if (!time) return null;
  const parts = time.split(':').map(Number);
  if (parts.length < 2) return null;
  return parts[0] * 60 + parts[1];
}

/**
 * Returns virtual train location based on current wall-clock time vs schedule.
 */
function getTrainVirtualLocation(
  stops: TrackingStop[],
  now: Date
): TrainVirtualLocation {
  const sorted = [...stops].sort((a, b) => a.stop_order - b.stop_order);
  if (sorted.length === 0) {
    return {
      status: 'not_started',
      progressPercent: 0,
      segmentProgress: 0,
      currentStopIndex: 0,
      nextStopIndex: null,
      currentStation: null,
      nextStation: null,
      minutesDelay: 0,
      statusLabel: 'No schedule data',
    };
  }

  const nowMins = now.getHours() * 60 + now.getMinutes();

  // Check if before first departure
  const firstDep = timeToMinutes(sorted[0].departure_time);
  if (firstDep !== null && nowMins < firstDep) {
    return {
      status: 'not_started',
      progressPercent: 0,
      segmentProgress: 0,
      currentStopIndex: 0,
      nextStopIndex: null,
      currentStation: sorted[0].station.name || sorted[0].station.station_name || '',
      nextStation: null,
      minutesDelay: 0,
      statusLabel: `Departs at ${sorted[0].departure_time?.substring(0, 5)}`,
    };
  }

  // Check if past last arrival
  const lastArr = timeToMinutes(sorted[sorted.length - 1].arrival_time);
  if (lastArr !== null && nowMins > lastArr) {
    return {
      status: 'completed',
      progressPercent: 100,
      segmentProgress: 100,
      currentStopIndex: sorted.length - 1,
      nextStopIndex: null,
      currentStation: sorted[sorted.length - 1].station.name || sorted[sorted.length - 1].station.station_name || '',
      nextStation: null,
      minutesDelay: 0,
      statusLabel: 'Journey Complete',
    };
  }

  // Walk through stops
  for (let i = 0; i < sorted.length; i++) {
    const stop = sorted[i];
    const arrMins = timeToMinutes(stop.arrival_time);
    const depMins = timeToMinutes(stop.departure_time);

    // At this station (between arrival and departure)
    const atStation =
      (arrMins === null || nowMins >= arrMins) &&
      (depMins === null || nowMins <= depMins);

    if (atStation) {
      return {
        status: 'at_station',
        progressPercent: (i / (sorted.length - 1)) * 100,
        segmentProgress: 50,
        currentStopIndex: i,
        nextStopIndex: i + 1 < sorted.length ? i + 1 : null,
        currentStation: stop.station.name || stop.station.station_name || '',
        nextStation:
          i + 1 < sorted.length
            ? sorted[i + 1].station.name || sorted[i + 1].station.station_name || ''
            : null,
        minutesDelay: 0,
        statusLabel: `At ${stop.station.name || stop.station.station_name}`,
      };
    }

    // In Transit between stop i and i+1
    if (i + 1 < sorted.length) {
      const nextStop = sorted[i + 1];
      const nextArrMins = timeToMinutes(nextStop.arrival_time);

      if (
        depMins !== null &&
        nextArrMins !== null &&
        nowMins >= depMins &&
        nowMins <= nextArrMins
      ) {
        const segment = nextArrMins - depMins;
        const elapsed = nowMins - depMins;
        const segProgress = segment > 0 ? Math.min(100, (elapsed / segment) * 100) : 0;
        const totalProgress =
          ((i + segProgress / 100) / (sorted.length - 1)) * 100;

        return {
          status: 'in_transit',
          progressPercent: Math.min(100, totalProgress),
          segmentProgress: segProgress,
          currentStopIndex: i,
          nextStopIndex: i + 1,
          currentStation: stop.station.name || stop.station.station_name || '',
          nextStation: nextStop.station.name || nextStop.station.station_name || '',
          minutesDelay: 0,
          statusLabel: `En route to ${nextStop.station.name || nextStop.station.station_name}`,
        };
      }
    }
  }

  // Fallback
  return {
    status: 'in_transit',
    progressPercent: 50,
    segmentProgress: 50,
    currentStopIndex: 0,
    nextStopIndex: null,
    currentStation: null,
    nextStation: null,
    minutesDelay: 0,
    statusLabel: 'En route',
  };
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface TrainLiveTrackerProps {
  runId: string | number;
  trainName: string;
  trainNumber: string;
  isOpen: boolean;
  onClose: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TrainLiveTracker({
  runId,
  trainName,
  trainNumber,
  isOpen,
  onClose,
}: TrainLiveTrackerProps) {
  const [runData, setRunData] = useState<TrainRunData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());
  const [location, setLocation] = useState<TrainVirtualLocation | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const trainIconRef = useRef<HTMLDivElement>(null);

  // Fetch run details (stops) when modal opens
  useEffect(() => {
    if (!isOpen || !runId) return;
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE}/trains/runs/${runId}`);
        if (!res.ok) throw new Error('Failed to fetch train schedule');
        const data: TrainRunData = await res.json();
        setRunData(data);
      } catch (e: any) {
        setError(e.message || 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [isOpen, runId]);

  // Tick every 10 seconds to update virtual position
  useEffect(() => {
    if (!isOpen) return;
    setNow(new Date());
    timerRef.current = setInterval(() => setNow(new Date()), 10_000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen]);

  // Recompute location whenever stops or time changes
  useEffect(() => {
    if (!runData?.stops?.length) return;
    setLocation(getTrainVirtualLocation(runData.stops, now));
  }, [runData, now]);

  const handleClose = useCallback(() => {
    setRunData(null);
    setError(null);
    setLocation(null);
    onClose();
  }, [onClose]);

  const stops = runData?.stops
    ? [...runData.stops].sort((a, b) => a.stop_order - b.stop_order)
    : [];

  const statusColors = {
    at_station: { bg: 'bg-emerald-500', dot: 'bg-emerald-400', text: 'text-emerald-700', badge: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
    in_transit: { bg: 'bg-blue-500', dot: 'bg-blue-400', text: 'text-blue-700', badge: 'bg-blue-50 border-blue-200 text-blue-700' },
    not_started: { bg: 'bg-amber-500', dot: 'bg-amber-400', text: 'text-amber-700', badge: 'bg-amber-50 border-amber-200 text-amber-700' },
    completed: { bg: 'bg-slate-400', dot: 'bg-slate-300', text: 'text-slate-600', badge: 'bg-slate-50 border-slate-200 text-slate-600' },
  };
  const colors = statusColors[location?.status ?? 'not_started'];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="tracker-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            key="tracker-modal"
            initial={{ opacity: 0, y: 60, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.97 }}
            transition={{ type: 'spring', damping: 28, stiffness: 380 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="bg-white rounded-3xl shadow-2xl shadow-blue-900/20 w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col pointer-events-auto"
              onClick={e => e.stopPropagation()}
            >
              {/* ── Header ── */}
              <div className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 p-6 overflow-hidden">
                {/* Background blobs */}
                <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/5 blur-2xl" />
                <div className="absolute -bottom-4 -left-4 w-32 h-32 rounded-full bg-indigo-400/20 blur-xl" />

                <div className="relative z-10 flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="flex items-center gap-1.5 text-xs font-bold text-blue-200 uppercase tracking-widest">
                        <Radio className="w-3 h-3 animate-pulse text-blue-300" />
                        Virtual Live Tracking
                      </span>
                    </div>
                    <h2 className="text-white font-bold text-xl leading-tight">{trainName}</h2>
                    <p className="text-blue-200 text-sm font-mono mt-0.5">#{trainNumber}</p>
                  </div>
                  <button
                    onClick={handleClose}
                    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Status Badge */}
                {location && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative z-10 mt-4 flex items-center gap-3"
                  >
                    <span className={cn(
                      'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border',
                      'bg-white/15 border-white/20 text-white'
                    )}>
                      <span className={cn(
                        'w-2 h-2 rounded-full',
                        location.status === 'at_station' && 'bg-emerald-400 animate-pulse',
                        location.status === 'in_transit' && 'bg-blue-300',
                        location.status === 'not_started' && 'bg-amber-400',
                        location.status === 'completed' && 'bg-slate-300',
                      )} />
                      {location.statusLabel}
                    </span>
                    <span className="text-white/60 text-xs">
                      {now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                    </span>
                  </motion.div>
                )}
              </div>

              {/* ── Body ── */}
              <div className="flex-1 overflow-y-auto">
                {isLoading && (
                  <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <div className="w-10 h-10 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                    <p className="text-slate-500 text-sm font-medium">Loading schedule…</p>
                  </div>
                )}

                {error && !isLoading && (
                  <div className="p-6 text-center">
                    <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-3">
                      <TrainIcon className="w-6 h-6 text-red-400" />
                    </div>
                    <p className="text-slate-700 font-semibold">Could not load schedule</p>
                    <p className="text-slate-400 text-sm mt-1">{error}</p>
                  </div>
                )}

                {!isLoading && !error && location && stops.length > 0 && (
                  <div className="p-5 space-y-6">
                    {/* ── Progress Bar with Train Icon ── */}
                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Route Progress</div>
                        <div className="text-xs font-mono font-bold text-blue-600">
                          {Math.round(location.progressPercent)}%
                        </div>
                      </div>

                      {/* Track rail */}
                      <div className="relative h-8 flex items-center">
                        {/* Rail background */}
                        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-2 bg-slate-200 rounded-full overflow-hidden">
                          <motion.div
                            className={cn('h-full rounded-full', colors.bg)}
                            initial={{ width: 0 }}
                            animate={{ width: `${location.progressPercent}%` }}
                            transition={{ duration: 1.2, ease: 'easeOut' }}
                          />
                        </div>

                        {/* Train icon sliding along */}
                        <motion.div
                          ref={trainIconRef}
                          className="absolute z-10 -translate-y-1/2 top-1/2"
                          style={{ left: 0 }}
                          animate={{ left: `calc(${location.progressPercent}% - 16px)` }}
                          transition={{ duration: 1.2, ease: 'easeOut' }}
                        >
                          <div className={cn(
                            'w-8 h-8 rounded-full flex items-center justify-center shadow-lg',
                            colors.bg,
                            location.status === 'at_station' && 'train-tracker-pulse',
                            location.status === 'in_transit' && 'train-tracker-ride',
                          )}>
                            <TrainIcon className="w-4 h-4 text-white" />
                          </div>
                        </motion.div>

                        {/* Start & End markers */}
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white shadow z-10" />
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-rose-500 border-2 border-white shadow z-10" />
                      </div>

                      {/* Station labels below */}
                      <div className="flex justify-between mt-2">
                        <span className="text-[10px] font-bold text-emerald-600 truncate max-w-[40%]">
                          {stops[0]?.station?.name || stops[0]?.station?.station_name}
                        </span>
                        <span className="text-[10px] font-bold text-rose-600 truncate max-w-[40%] text-right">
                          {stops[stops.length - 1]?.station?.name || stops[stops.length - 1]?.station?.station_name}
                        </span>
                      </div>
                    </div>

                    {/* ── Next Station Card ── */}
                    {location.status === 'in_transit' && location.nextStation && (
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-4 p-4 bg-blue-50 border border-blue-100 rounded-2xl"
                      >
                        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <Navigation className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Next Station</p>
                          <p className="font-bold text-slate-900 truncate">{location.nextStation}</p>
                          {location.nextStopIndex !== null && (
                            <p className="text-xs text-blue-600 font-mono">
                              Arriving {stops[location.nextStopIndex]?.arrival_time?.substring(0, 5) ?? '--:--'}
                            </p>
                          )}
                        </div>
                        <ChevronRight className="w-5 h-5 text-blue-400 flex-shrink-0" />
                      </motion.div>
                    )}

                    {location.status === 'at_station' && location.currentStation && (
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-4 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl"
                      >
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                          <MapPin className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Currently At</p>
                          <p className="font-bold text-slate-900 truncate">{location.currentStation}</p>
                          {stops[location.currentStopIndex]?.departure_time && (
                            <p className="text-xs text-emerald-600 font-mono">
                              Departs {stops[location.currentStopIndex].departure_time?.substring(0, 5)}
                            </p>
                          )}
                        </div>
                        <span className="flex-shrink-0 w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                      </motion.div>
                    )}

                    {/* ── Stops Timeline ── */}
                    <div>
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 px-1">
                        All Stations
                      </h3>
                      <div className="relative space-y-0 before:absolute before:left-[22px] before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-100 pl-2">
                        {stops.map((stop, i) => {
                          const stName = stop.station.name || stop.station.station_name || '';
                          const stCode = stop.station.code || stop.station.station_code || '';
                          const isCurrentOrPast = i <= location.currentStopIndex;
                          const isCurrent = i === location.currentStopIndex;
                          const isNext = i === location.nextStopIndex;
                          const isPast = isCurrentOrPast && !isCurrent;

                          return (
                            <motion.div
                              key={stop.stop_id}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.04 }}
                              className="relative z-10 flex items-start gap-3 py-2.5"
                            >
                              {/* Dot */}
                              <div className={cn(
                                'w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center bg-white transition-all duration-500',
                                isCurrent && location.status === 'at_station'
                                  ? 'border-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.15)]'
                                  : isNext
                                  ? 'border-blue-500 shadow-[0_0_0_4px_rgba(59,130,246,0.15)]'
                                  : isPast
                                  ? 'border-slate-300 bg-slate-100'
                                  : isCurrent
                                  ? 'border-blue-500'
                                  : 'border-slate-200'
                              )}>
                                {isPast && <CheckCircle2 className="w-3 h-3 text-slate-400 fill-slate-200" />}
                                {(isCurrent && location.status === 'at_station') && (
                                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                                )}
                                {(isCurrent && location.status === 'in_transit') && (
                                  <span className="w-2 h-2 bg-blue-400 rounded-full" />
                                )}
                              </div>

                              {/* Content */}
                              <div className={cn(
                                'flex-1 flex items-center justify-between min-w-0 transition-opacity',
                                !isCurrentOrPast && !isNext && 'opacity-40'
                              )}>
                                <div className="min-w-0">
                                  <p className={cn(
                                    'font-semibold text-sm truncate',
                                    isCurrent ? 'text-slate-900' : isPast ? 'text-slate-500' : 'text-slate-700'
                                  )}>
                                    {stName}
                                  </p>
                                  {stCode && (
                                    <p className="text-[10px] font-mono text-slate-400">{stCode}</p>
                                  )}
                                </div>
                                <div className="text-right flex-shrink-0 ml-2">
                                  {stop.arrival_time && (
                                    <p className={cn(
                                      'text-xs font-mono',
                                      isPast ? 'text-slate-400 line-through decoration-1' : 'text-slate-600'
                                    )}>
                                      {stop.arrival_time.substring(0, 5)}
                                    </p>
                                  )}
                                  {stop.departure_time && stop.arrival_time !== stop.departure_time && (
                                    <p className="text-[10px] font-mono text-slate-400">
                                      → {stop.departure_time.substring(0, 5)}
                                    </p>
                                  )}
                                  {stop.halt_duration !== null && stop.halt_duration !== undefined && stop.halt_duration > 0 && (
                                    <p className="text-[10px] text-amber-600 font-medium flex items-center gap-1 justify-end">
                                      <Clock className="w-2.5 h-2.5" />
                                      {stop.halt_duration}m halt
                                    </p>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {!isLoading && !error && stops.length === 0 && (
                  <div className="py-16 text-center">
                    <TrainIcon className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 font-medium">No schedule data found</p>
                    <p className="text-slate-400 text-sm mt-1">This run has no stops configured.</p>
                  </div>
                )}
              </div>

              {/* ── Footer ── */}
              <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <p className="text-xs text-slate-400 flex items-center gap-1.5">
                  <Radio className="w-3 h-3" />
                  Virtual tracking based on schedule — not real GPS
                </p>
                <button
                  onClick={handleClose}
                  className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors px-3 py-1.5 rounded-lg hover:bg-blue-50"
                >
                  Close
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
