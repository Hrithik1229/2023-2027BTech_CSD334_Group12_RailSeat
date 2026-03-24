import { API_BASE } from "@/lib/api";
import { getStoredUser } from "@/lib/api";
import {
  CheckCircle2,
  ChevronRight,
  CircleDot,
  ClipboardCheck,
  Clock,
  Loader2,
  LogOut,
  Search,
  Train as TrainIcon,
  Users,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

/* ─── Types ──────────────────────────────────────────────────────────────── */
interface Coach {
  coach_id: number;
  coach_number: string;
  coach_type: string;
  sequence_order: number;
  capacity: number;
}

interface TrainResult {
  train_id: number;
  train_number: string;
  train_name: string;
  train_type: string;
  coaches: Coach[];
}

interface ManifestEntry {
  passenger_id: number;
  passenger_name: string;
  passenger_gender: string;
  booking_number: string;
  booking_id: number;
  contact_name: string;
  source_station: string;
  destination_station: string;
  seat_id: number;
  seat_number: number;
  berth_type: string;
  seat_status: string;
  coach_number: string;
  coach_type: string;
}

interface ManifestMetrics {
  totalBookings: number;
  verifiedCount: number;
  pendingCount: number;
  verificationRate: string;
}

// ─── Progress Helper ──────────────────────────────────────────────────────
const parseRate = (rate: string) => parseFloat(rate.replace("%", "")) || 0;

// ─── Loading Skeleton ──────────────────────────────────────────────────────
const ManifestSkeleton = () => (
  <div className="space-y-4">
    {[1, 2, 3, 4, 5].map((i) => (
      <div key={i} className="flex bg-white/70 backdrop-blur-xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] h-32 overflow-hidden animate-pulse">
        {/* Left Seat Box Skeleton */}
        <div className="w-24 bg-slate-100/60 shrink-0"></div>
        
        {/* Perforation Line Skeleton */}
        <div className="relative w-0 border-r-2 border-dashed border-slate-200/50 flex flex-col justify-between py-2"></div>
        
        <div className="flex-1 p-5 flex flex-col justify-between sm:flex-row sm:items-center">
          <div className="space-y-3 w-full max-w-[200px]">
            <div className="h-5 bg-slate-200 rounded-md w-3/4"></div>
            <div className="h-3 bg-slate-100 rounded-md w-1/2"></div>
            <div className="h-3 bg-slate-100 rounded-md w-2/3"></div>
          </div>
          <div className="mt-4 sm:mt-0 flex sm:flex-col items-center justify-between sm:justify-end sm:items-end gap-3 w-full sm:w-auto">
             <div className="h-5 bg-slate-200 rounded-md w-16"></div>
             <div className="h-8 bg-slate-200 rounded-xl w-24"></div>
          </div>
        </div>
      </div>
    ))}
  </div>
);

/* ─── Main Component ─────────────────────────────────────────────────────── */
export default function TCDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);

  // Search
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<TrainResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<any>(null);

  // Selected train & coach
  const [selectedTrain, setSelectedTrain] = useState<TrainResult | null>(null);
  const [selectedCoach, setSelectedCoach] = useState<Coach | null>(null);
  const [travelDate, setTravelDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split("T")[0];
  });

  // Manifest
  const [manifest, setManifest] = useState<ManifestEntry[]>([]);
  const [metrics, setMetrics] = useState<ManifestMetrics | null>(null);
  const [loadingManifest, setLoadingManifest] = useState(false);
  const [verifyingId, setVerifyingId] = useState<number | null>(null);

  /* ── Auth Check ──────────────────────────────────────────────────────── */
  useEffect(() => {
    let stored = getStoredUser();
    if (!stored) {
      try {
        const adminStored = localStorage.getItem("user");
        if (adminStored) stored = JSON.parse(adminStored);
      } catch (e) {}
    }

    if (!stored || (stored.role !== "tc" && stored.role !== "admin")) {
      navigate("/login");
      return;
    }
    setUser(stored);
    setAuthChecked(true);
  }, [navigate]);

  /* ── Debounced Search ────────────────────────────────────────────────── */
  useEffect(() => {
    if (searchTimeout) clearTimeout(searchTimeout);
    const timeout = setTimeout(() => {
      doSearch(query.trim());
    }, 350);
    setSearchTimeout(timeout);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const doSearch = async (q: string) => {
    setSearching(true);
    try {
      const res = await fetch(`${API_BASE}/tc/trains/search?q=${encodeURIComponent(q)}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setSearchResults(data);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  /* ── Select Train ────────────────────────────────────────────────────── */
  const handleSelectTrain = (train: TrainResult) => {
    setSelectedTrain(train);
    setSelectedCoach(null);
    setManifest([]);
    setMetrics(null);
    setQuery("");
    setSearchResults([]);
  };

  /* ── Select Coach → Load Manifest ────────────────────────────────────── */
  const handleSelectCoach = async (coach: Coach) => {
    setSelectedCoach(coach);
    setLoadingManifest(true);
    try {
      const res = await fetch(
        `${API_BASE}/tc/manifest?coachId=${coach.coach_id}&travelDate=${travelDate}`
      );
      if (!res.ok) throw new Error();
      const data = await res.json();
      setManifest(data.manifest);
      setMetrics(data.metrics);
    } catch {
      setManifest([]);
      setMetrics(null);
    } finally {
      setLoadingManifest(false);
    }
  };

  /* ── Verify / Unverify Seat ──────────────────────────────────────────── */
  const handleVerify = async (entry: ManifestEntry) => {
    setVerifyingId(entry.seat_id);
    const action = entry.seat_status === "occupied" ? "unverify" : "verify";
    try {
      const res = await fetch(`${API_BASE}/tc/seats/${entry.seat_id}/verify`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error();

      // OPTIMISTIC UI UPDATE
      setManifest((prev) =>
        prev.map((m) =>
          m.seat_id === entry.seat_id
            ? { ...m, seat_status: action === "verify" ? "occupied" : "booked" }
            : m
        )
      );
      // Update metrics smoothly
      setMetrics((prev) => {
        if (!prev) return prev;
        const delta = action === "verify" ? 1 : -1;
        const newVerified = prev.verifiedCount + delta;
        const rate =
          prev.totalBookings > 0
            ? ((newVerified / prev.totalBookings) * 100).toFixed(1)
            : "0.0";
        return {
          ...prev,
          verifiedCount: newVerified,
          pendingCount: prev.pendingCount - delta,
          verificationRate: `${rate}%`,
        };
      });
    } catch {
      // Silently fail - user can retry
    } finally {
      setVerifyingId(null);
    }
  };

  /* ── Logout ──────────────────────────────────────────────────────────── */
  const handleLogout = () => {
    localStorage.removeItem("railseat_user");
    localStorage.removeItem("admin_token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 relative overflow-x-hidden font-sans text-slate-800">
      {/* ── Background Premium Radial Decor ── */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
          {/* Subtle soft mesh gradient background */}
          <div className="absolute top-0 left-[-10%] w-full h-[800px] bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-indigo-100/40 via-blue-50/20 to-transparent"></div>
          <div className="absolute top-[20%] right-[-10%] w-[800px] h-[800px] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-100/20 via-transparent to-transparent"></div>
      </div>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white/70 backdrop-blur-2xl shadow-[0_4px_30px_rgb(0,0,0,0.03)] border-b border-white border-opacity-40">
        <div className="max-w-screen-xl mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white rounded-[1.25rem] flex items-center justify-center shadow-[0_2px_15px_rgb(79,70,229,0.12)]">
              <ClipboardCheck className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-slate-900 leading-tight">Verification Portal</h1>
              <p className="text-[10px] font-black text-indigo-500/80 uppercase tracking-[0.2em] mt-0.5">
                TC Pass · {user?.username}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2.5 rounded-[1rem] text-xs font-bold text-slate-500 hover:text-red-600 hover:bg-red-50 hover:shadow-[0_4px_15px_rgb(239,68,68,0.1)] transition-all duration-300"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline tracking-wide">Sign Out</span>
          </button>
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-4 sm:px-6 py-8 space-y-10 relative z-10">
        {/* ── Controls Section ── */}
        <div className="grid md:grid-cols-[220px_1fr] gap-5 relative z-20">
          <div className="flex-shrink-0 group">
            <label className="text-[10px] text-slate-400 uppercase tracking-widest font-black block mb-2 ml-1 transition-colors group-focus-within:text-indigo-500">
              Mission Date
            </label>
            <input
              type="date"
              value={travelDate}
              onChange={(e) => {
                setTravelDate(e.target.value);
                if (selectedCoach) {
                  setSelectedCoach(null);
                  setManifest([]);
                  setMetrics(null);
                }
              }}
              className="w-full bg-white/70 backdrop-blur-xl border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[1.25rem] px-5 py-4 text-sm text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/30 hover:shadow-[0_8px_30px_rgb(79,70,229,0.08)] transition-all cursor-pointer"
            />
          </div>

          <div className="relative group">
            <label className="text-[10px] text-slate-400 uppercase tracking-widest font-black block mb-2 ml-1 transition-colors group-focus-within:text-indigo-500 opacity-0 md:opacity-100 hidden md:block">
              Locate Transit
            </label>
            <div className="relative">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by train name or number..."
                className="w-full bg-white/70 backdrop-blur-xl border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[1.25rem] pl-14 pr-5 py-4 text-sm text-slate-800 font-bold placeholder:text-slate-400 placeholder:font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/30 hover:shadow-[0_8px_30px_rgb(79,70,229,0.08)] transition-all"
              />
              {searching && (
                <div className="absolute right-5 top-1/2 -translate-y-1/2">
                    <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
                </div>
              )}
            </div>

            {/* Dropdown Results */}
            {selectedTrain && query.trim().length > 0 && searchResults.length > 0 && (
              <div className="absolute z-30 w-full mt-3 bg-white/95 backdrop-blur-3xl rounded-[1.5rem] overflow-hidden shadow-[0_20px_50px_rgb(0,0,0,0.1)] border border-white/50 animate-in fade-in slide-in-from-top-4 duration-300">
                <div className="max-h-[300px] overflow-y-auto p-2">
                    {searchResults.map((train) => (
                    <button
                        key={train.train_id}
                        onClick={() => handleSelectTrain(train)}
                        className="w-full flex items-center gap-4 px-4 py-3.5 hover:bg-slate-50 rounded-[1rem] transition-all duration-200 text-left group/item"
                    >
                        <div className="w-10 h-10 bg-slate-100 group-hover/item:bg-indigo-100 group-hover/item:scale-110 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300">
                            <TrainIcon className="w-4 h-4 text-slate-500 group-hover/item:text-indigo-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-900 truncate">{train.train_name}</p>
                            <p className="text-xs font-semibold text-slate-500 mt-0.5 tracking-wide">
                                #{train.train_number} <span className="text-slate-300 mx-1">•</span> {train.train_type}
                            </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover/item:text-indigo-500 group-hover/item:translate-x-1 transition-all" />
                    </button>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Main Train List (When No Train Selected) ── */}
        {!selectedTrain && (
          <div className="animate-in fade-in duration-700">
            {searching && searchResults.length === 0 ? (
              <div className="flex justify-center py-24">
                <div className="w-20 h-20 bg-white/80 backdrop-blur-md shadow-[0_10px_40px_rgb(79,70,229,0.1)] rounded-[2rem] flex items-center justify-center">
                    <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
                </div>
              </div>
            ) : searchResults.length > 0 ? (
              <div className="bg-white/60 backdrop-blur-xl rounded-[2rem] overflow-hidden shadow-[0_10px_40px_rgb(0,0,0,0.03)] p-3 space-y-2 relative z-10 border border-white/50">
                {searchResults.map((train) => (
                  <button
                    key={train.train_id}
                    onClick={() => handleSelectTrain(train)}
                    className="w-full relative overflow-hidden flex items-center gap-5 p-4 bg-white/40 hover:bg-white rounded-[1.5rem] transition-all duration-300 text-left group hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:-translate-y-1"
                  >
                    <div className="relative w-16 h-16 bg-white shadow-sm border border-slate-100 group-hover:border-indigo-100 group-hover:bg-indigo-50 rounded-[1.25rem] flex items-center justify-center flex-shrink-0 transition-all duration-500 group-hover:scale-110">
                      <TrainIcon className="w-7 h-7 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                    </div>
                    
                    <div className="flex-1 min-w-0 relative z-10">
                      <p className="text-xl font-black text-slate-900 truncate tracking-tight group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-indigo-600 group-hover:to-blue-600 transition-all">{train.train_name}</p>
                      <div className="flex items-center gap-2.5 mt-1.5">
                          <span className="px-2.5 py-0.5 bg-slate-200/60 group-hover:bg-indigo-100/70 text-slate-700 group-hover:text-indigo-700 rounded-md text-[10px] font-black tracking-widest transition-colors">
                              #{train.train_number}
                          </span>
                          <span className="text-xs font-semibold text-slate-500 tracking-wide">
                              {train.train_type} <span className="text-slate-300 mx-1">•</span> <strong className="text-slate-700 group-hover:text-indigo-600">{train.coaches?.length || 0}</strong> cars
                          </span>
                      </div>
                    </div>
                    
                    <div className="relative z-10 flex-shrink-0 w-12 h-12 rounded-[1rem] bg-slate-50 group-hover:bg-indigo-600 shadow-sm flex items-center justify-center transition-all duration-300">
                      <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-white group-hover:translate-x-1 transition-all duration-300" />
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-28 bg-white/40 backdrop-blur-xl border border-white/50 rounded-[2.5rem] shadow-[0_10px_40px_rgb(0,0,0,0.03)]">
                <div className="w-24 h-24 bg-white/80 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-[0_10px_30px_rgb(0,0,0,0.05)]">
                  <Search className="w-10 h-10 text-slate-300" />
                </div>
                <h2 className="text-2xl font-black text-slate-800 mb-2 tracking-tight">No Locomotives Found</h2>
                <p className="text-sm font-medium text-slate-500 max-w-sm mx-auto tracking-wide leading-relaxed">
                  We couldn't track any trains matching your search query. Please revise your terms.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── Active Train Dashboard ── */}
        {selectedTrain && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700 ease-out">
            {/* ── Train Header Block ── */}
            <div className="relative overflow-hidden bg-white/80 backdrop-blur-xl border border-white/60 rounded-[2.5rem] p-6 sm:p-10 shadow-[0_15px_60px_rgb(0,0,0,0.06)]">
              {/* Abstract decorative graphic */}
              <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-50 to-transparent -translate-y-1/2 translate-x-1/3 opacity-80 pointer-events-none"></div>
              
              <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 bg-indigo-600 shadow-[0_10px_30px_rgb(79,70,229,0.3)] rounded-[1.5rem] flex items-center justify-center flex-shrink-0 scale-100 hover:scale-105 transition-transform duration-500 hover:rotate-2">
                    <TrainIcon className="w-10 h-10 text-white" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tighter leading-none">{selectedTrain.train_name}</h2>
                    <div className="flex items-center gap-3 mt-3">
                        <span className="px-3 py-1 bg-white shadow-sm text-indigo-700 rounded-lg text-xs font-black tracking-widest border border-slate-100">
                            #{selectedTrain.train_number}
                        </span>
                        <span className="text-sm font-bold text-slate-500 tracking-wide uppercase">
                            {selectedTrain.train_type}
                        </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedTrain(null);
                    setSelectedCoach(null);
                    setManifest([]);
                    setMetrics(null);
                  }}
                  className="self-start sm:self-auto text-xs font-bold text-slate-600 bg-white hover:text-indigo-700 px-5 py-3 rounded-xl hover:bg-indigo-50 shadow-sm border border-slate-100 transition-all duration-300 uppercase tracking-widest hover:shadow-[0_4px_20px_rgb(79,70,229,0.1)]"
                >
                  Switch Transit
                </button>
              </div>
            </div>

            {/* ── Coach "Train Car" Layout ── */}
            <div>
              <div className="flex items-center gap-2 mb-5 pl-3">
                 <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse shadow-[0_0_10px_rgb(79,70,229,0.6)]"></div>
                 <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black">
                   Attached Cars
                 </p>
              </div>
              
              <div className="flex gap-4 overflow-x-auto pb-6 px-2 mask-linear snap-x items-center">
                {selectedTrain.coaches?.length > 0 ? (
                  <>
                  {/* Visual hidden rod conveying connection */}
                  <div className="hidden sm:block absolute h-3 bg-slate-200/50 rounded-full w-[200%] top-1/2 -translate-y-1/2 -z-10"></div>
                  
                  {selectedTrain.coaches?.map((coach) => {
                    const isActive = selectedCoach?.coach_id === coach.coach_id;
                    return (
                      <button
                        key={coach.coach_id}
                        onClick={() => handleSelectCoach(coach)}
                        className={`relative snap-center shrink-0 w-36 h-[5.5rem] rounded-[1.5rem] flex flex-col items-center justify-center transition-all duration-500 group ${
                          isActive
                            ? "bg-indigo-600 shadow-[0_10px_30px_rgb(79,70,229,0.3)] text-white scale-105 z-10"
                            : "bg-white/80 backdrop-blur-md shadow-[0_4px_20px_rgb(0,0,0,0.03)] text-slate-700 hover:-translate-y-1 hover:shadow-[0_10px_30px_rgb(0,0,0,0.06)] hover:bg-white z-0"
                        }`}
                      >
                        {/* Windows / Design element for train car */}
                        <div className={`absolute top-2 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full ${isActive ? 'bg-indigo-400' : 'bg-slate-200'}`}></div>
                        
                        <span className="relative z-10 block text-2xl font-black tracking-tighter mt-1">{coach.coach_number}</span>
                        <span className={`relative z-10 block text-[10px] mt-1 tracking-widest font-black uppercase ${isActive ? "text-indigo-200" : "text-slate-400 group-hover:text-indigo-500 transition-colors"}`}>
                          {coach.coach_type}
                        </span>
                      </button>
                    );
                  })}
                  </>
                ) : (
                  <div className="w-full text-center py-8 bg-white/40 backdrop-blur-sm border border-dashed border-slate-300 rounded-[2rem]">
                     <p className="text-sm font-bold text-slate-500 italic tracking-wide">No consist data broadcasted.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Passenger Manifest & Verification Board ── */}
        {selectedCoach && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700 ease-out fill-mode-both delay-100">
            {loadingManifest ? (
              <ManifestSkeleton />
            ) : manifest.length === 0 ? (
              <div className="text-center py-28 bg-white/50 backdrop-blur-xl border border-white/50 rounded-[2.5rem] shadow-[0_10px_40px_rgb(0,0,0,0.03)]">
                <div className="w-24 h-24 bg-white/80 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-[0_10px_30px_rgb(0,0,0,0.05)]">
                  <Clock className="w-10 h-10 text-slate-300" />
                </div>
                <p className="text-2xl font-black text-slate-800 tracking-tight">Empty Manifest</p>
                <p className="text-sm font-medium text-slate-500 mt-2 max-w-sm mx-auto tracking-wide">No active reservations exist for this car segment on the selected date.</p>
              </div>
            ) : (
             <div className="flex flex-col-reverse xl:flex-row gap-8 items-start relative pb-20 sm:pb-0">
               
               {/* List Column */}
               <div className="flex-1 w-full space-y-6">
                  <div className="flex items-center justify-between pl-2">
                    <h3 className="text-xl font-black text-slate-900 tracking-tighter flex items-center gap-3">
                      <Users className="w-6 h-6 text-indigo-500" />
                      Passenger Checks
                    </h3>
                  </div>

                  <div className="space-y-4">
                    {manifest.map((entry) => {
                        const isVerified = entry.seat_status === "occupied";
                        const isVerifying = verifyingId === entry.seat_id;
                        
                        return (
                        <div
                            key={`${entry.passenger_id}-${entry.seat_id}`}
                            className={`group flex flex-row bg-white/70 backdrop-blur-xl rounded-[1.5rem] shadow-[0_4px_20px_rgb(0,0,0,0.03)] overflow-hidden transition-all duration-400 hover:-translate-y-1 hover:shadow-[0_15px_40px_rgb(0,0,0,0.06)] relative border-2 ${
                            isVerified
                                ? "border-emerald-100 bg-emerald-50/20"
                                : "border-transparent"
                            }`}
                        >
                            {/* Decorative background flair for verified */}
                            {isVerified && <div className="absolute inset-0 bg-gradient-to-r from-emerald-50/50 to-transparent pointer-events-none"></div>}

                            {/* ── Left side: Seat/Ticket Module ── */}
                            <div className={`w-28 flex flex-col justify-center items-center shrink-0 border-r-2 border-dashed relative ${isVerified ? 'bg-emerald-500/10 border-emerald-200/60' : 'bg-slate-50/50 border-slate-200/60'}`}>
                                {/* Perforation cutouts */}
                                <div className="absolute top-0 -right-2 w-4 h-4 rounded-full bg-slate-50 shadow-inner -translate-y-1/2"></div>
                                <div className="absolute bottom-0 -right-2 w-4 h-4 rounded-full bg-slate-50 shadow-inner translate-y-1/2"></div>
                                
                                <span className={`text-3xl font-black tabular-nums tracking-tighter ${isVerified ? 'text-emerald-700' : 'text-slate-800'}`}>
                                   {entry.seat_number}
                                </span>
                                <span className={`text-[9px] uppercase font-black tracking-widest mt-1 ${isVerified ? 'text-emerald-600' : 'text-slate-400'}`}>
                                   {entry.berth_type}
                                </span>
                            </div>

                            {/* ── Right side: Passenger Info & Actions ── */}
                            <div className="flex-1 p-5 lg:p-6 flex flex-col sm:flex-row justify-between relative z-10 gap-5 sm:gap-2">
                                <div className="flex-1 min-w-0 pr-4">
                                    <div className="flex items-center gap-3 mb-1">
                                      <p className="text-xl font-black text-slate-900 truncate tracking-tight">
                                      {entry.passenger_name}
                                      </p>
                                      {/* Status Micro-Badge */}
                                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full shadow-sm ${isVerified ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                                          {isVerified ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                                      </span>
                                    </div>
                                    <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-2">
                                        PNR: <span className="text-indigo-500 font-black">{entry.booking_number}</span>
                                    </p>
                                    <p className="text-xs font-bold text-slate-500 flex items-center gap-2">
                                        <span className="bg-slate-100 px-2 py-1 rounded-md">{entry.source_station}</span> 
                                        <ChevronRight className="w-3 h-3 text-slate-300" /> 
                                        <span className="bg-slate-100 px-2 py-1 rounded-md">{entry.destination_station}</span>
                                    </p>
                                </div>

                                {/* Action button */}
                                <div className="flex items-end sm:items-center justify-end">
                                  <button
                                    onClick={() => handleVerify(entry)}
                                    disabled={isVerifying}
                                    className={`relative overflow-hidden flex items-center justify-center gap-2 px-6 py-3.5 sm:py-3 rounded-[1.25rem] text-sm font-black tracking-wide transition-all duration-300 shadow-[0_4px_15px_rgb(0,0,0,0.05)] w-full sm:w-auto ${
                                        isVerified
                                        ? "bg-white text-slate-600 hover:text-rose-600 hover:bg-rose-50 hover:shadow-[0_8px_20px_rgb(225,29,72,0.1)] border border-slate-200"
                                        : "bg-indigo-600 border-indigo-600 text-white hover:bg-indigo-500 hover:shadow-[0_8px_25px_rgb(79,70,229,0.3)] hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
                                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                                    >
                                    {isVerifying ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : isVerified ? (
                                        <XCircle className="w-4 h-4" />
                                    ) : (
                                        <CircleDot className="w-4 h-4" />
                                    )}
                                    <span>{isVerified ? "Revoke" : "Verify Seat"}</span>
                                  </button>
                                </div>
                            </div>
                        </div>
                        );
                    })}
                  </div>
               </div>

               {/* Metrics Column (Sticky on Desktop, Bottom Sheet feel on Mobile) */}
               <div className="w-full xl:w-[350px] shrink-0 sticky top-28 xl:block fixed bottom-0 left-0 right-0 z-40 bg-white/95 xl:bg-white/80 backdrop-blur-3xl xl:rounded-[2.5rem] rounded-t-[2.5rem] p-6 lg:p-8 xl:shadow-[0_20px_60px_rgb(0,0,0,0.05)] shadow-[0_-10px_40px_rgb(0,0,0,0.1)] border-t xl:border border-white">
                 {/* Mobile drag handle indicator */}
                 <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6 xl:hidden"></div>

                 {metrics && (
                    <div className="space-y-8">
                        <div>
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">
                                Operation Status
                            </h3>
                            <div className="flex items-baseline gap-2">
                                <span
                                    className={`text-6xl font-black tabular-nums tracking-tighter transition-colors duration-700 ${
                                    parseRate(metrics.verificationRate) >= 90
                                        ? "text-emerald-500"
                                        : parseRate(metrics.verificationRate) >= 50
                                        ? "text-amber-500"
                                        : "text-indigo-600"
                                    }`}
                                >
                                    {metrics.verificationRate.replace('%', '')}
                                </span>
                                <span className="text-2xl font-black text-slate-300">%</span>
                            </div>
                        </div>

                        {/* High Performance Gauge / Progress bar */}
                        <div className="h-4 bg-slate-100 rounded-full overflow-hidden shadow-inner w-full relative">
                            <div
                                className={`h-full rounded-full transition-all duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)] relative overflow-hidden bg-gradient-to-r ${
                                parseRate(metrics.verificationRate) >= 90
                                    ? "from-emerald-400 to-teal-500"
                                    : parseRate(metrics.verificationRate) >= 50
                                    ? "from-amber-400 to-orange-500"
                                    : "from-blue-400 to-indigo-600"
                                }`}
                                style={{ width: metrics.verificationRate }}
                            >
                                <div className="absolute inset-0 bg-white/20 w-full h-full animate-[shimmer_2s_infinite]"></div>
                            </div>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2 bg-slate-50/80 rounded-[1.25rem] p-5 shadow-sm flex items-center justify-between border border-white">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Active</p>
                                <p className="text-2xl font-black tabular-nums text-slate-900">
                                    {metrics.totalBookings}
                                </p>
                            </div>
                            <div className="bg-emerald-50/50 rounded-[1.25rem] p-5 flex flex-col items-center justify-center text-center shadow-sm border border-emerald-100/50">
                                <p className="text-3xl font-black tabular-nums text-emerald-600">
                                    {metrics.verifiedCount}
                                </p>
                                <p className="text-[10px] font-black text-emerald-600/70 uppercase tracking-[0.2em] mt-2">Verified</p>
                            </div>
                            <div className="bg-amber-50/50 rounded-[1.25rem] p-5 flex flex-col items-center justify-center text-center shadow-sm border border-amber-100/50">
                                <p className="text-3xl font-black tabular-nums text-amber-600">
                                    {metrics.pendingCount}
                                </p>
                                <p className="text-[10px] font-black text-amber-600/70 uppercase tracking-[0.2em] mt-2">Pending</p>
                            </div>
                        </div>
                    </div>
                 )}
               </div>

             </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
