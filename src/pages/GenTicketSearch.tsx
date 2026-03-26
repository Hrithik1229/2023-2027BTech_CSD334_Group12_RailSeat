import Navbar from '@/components/Navbar';
import { StationSearchInput } from '@/components/StationSearchInput';
import { Button } from '@/components/ui/button';
import { API_BASE } from '@/lib/api';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
    AlertCircle,
    ArrowLeft,
    ArrowRight,
    CalendarDays,
    Clock,
    Info,
    MapPin,
    Search,
    Train as TrainIcon,
} from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface TrainResult {
    train_id: number;
    train_number: string;
    train_name: string;
    departure_time: string;
    arrival_time: string;
    duration: string;
    distance_km: number;
    coaches: { coach_type: string; coach_number: string; capacity: number }[];
}

const today = new Date();
const todayIso = format(today, 'yyyy-MM-dd');
const todayDisplay = format(today, 'EEEE, MMMM d, yyyy');

const GenTicketSearch = () => {
    const navigate = useNavigate();
    const [source, setSource] = useState('');
    const [destination, setDestination] = useState('');
    const [trains, setTrains] = useState<TrainResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searched, setSearched] = useState(false);

    const isValid = source && destination && source !== destination;

    const handleSearch = async () => {
        if (!isValid) return;
        setIsLoading(true);
        setSearched(false);
        try {
            const res = await fetch(
                `${API_BASE}/trains/search?source=${encodeURIComponent(source)}&destination=${encodeURIComponent(destination)}&date=${todayIso}`
            );
            if (!res.ok) throw new Error('Failed to fetch trains');
            const data: TrainResult[] = await res.json();
            // Filter to only trains that have GEN coaches
            const genTrains = data.filter(t =>
                t.coaches?.some(c => c.coach_type === 'GEN')
            );
            setTrains(genTrains);
        } catch {
            toast.error('Could not load trains. Please try again.');
        } finally {
            setIsLoading(false);
            setSearched(true);
        }
    };

    const handleSelect = (train: TrainResult) => {
        navigate('/gen-booking', {
            state: {
                trainId: train.train_id.toString(),
                trainName: train.train_name,
                trainNumber: train.train_number,
                source,
                destination,
                date: todayDisplay,
                isoDate: todayIso,
                distance: train.distance_km,
            },
        });
    };

    return (
        <div className="min-h-screen bg-slate-50 selection:bg-amber-100 selection:text-amber-900">
            {/* Background decor */}
            <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-[20%] -right-[10%] w-[50%] h-[50%] rounded-full bg-amber-400/10 blur-3xl" />
                <div className="absolute top-[30%] -left-[10%] w-[40%] h-[40%] rounded-full bg-orange-300/10 blur-3xl" />
                <div className="absolute bottom-0 right-0 w-[30%] h-[30%] rounded-full bg-yellow-300/10 blur-3xl" />
            </div>

            <Navbar />

            <main className="container mx-auto px-4 py-10 max-w-4xl relative z-10">
                {/* Back */}
                <Button
                    variant="ghost"
                    className="mb-6 pl-0 hover:pl-2 transition-all text-slate-500"
                    onClick={() => navigate(-1)}
                >
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back
                </Button>

                {/* Header */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-amber-100 text-amber-700 border border-amber-200 rounded-full text-sm font-semibold mb-4">
                        <TrainIcon className="w-4 h-4" />
                        General (Unreserved) Ticket
                    </div>
                    <h1 className="font-display text-4xl md:text-5xl font-bold text-slate-900 mb-3">
                        Book a General Ticket
                    </h1>
                    <p className="text-slate-500 text-lg max-w-xl mx-auto">
                        Unreserved travel for today only. Pick your stations and select an available train.
                    </p>
                </div>

                {/* Today's date lock banner */}
                <div className="flex items-center gap-3 mb-6 px-5 py-3.5 bg-amber-50 border border-amber-200 rounded-2xl">
                    <CalendarDays className="w-5 h-5 text-amber-600 shrink-0" />
                    <div>
                        <p className="text-sm font-semibold text-amber-800">
                            Travel Date: <span className="font-bold">{todayDisplay}</span>
                        </p>
                        <p className="text-xs text-amber-600 mt-0.5">
                            General tickets are only valid for same-day travel (current railway format).
                        </p>
                    </div>
                </div>

                {/* Search card */}
                <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl border border-white/60 p-8 mb-8">
                    <div className="grid md:grid-cols-2 gap-6 mb-6">
                        <StationSearchInput
                            label="From Station"
                            value={source}
                            onChange={setSource}
                            placeholder="Departing Station"
                            iconColorClass="text-blue-600"
                        />
                        <div className="flex flex-col space-y-1">
                            <StationSearchInput
                                label="To Station"
                                value={destination}
                                onChange={setDestination}
                                placeholder="Arrival Station"
                                iconColorClass="text-rose-600"
                            />
                            {source && destination && source === destination && (
                                <span className="text-xs text-red-500 font-medium pl-1">
                                    Source and destination cannot be the same
                                </span>
                            )}
                        </div>
                    </div>

                    <Button
                        onClick={handleSearch}
                        disabled={!isValid || isLoading}
                        className="w-full h-14 text-base font-bold rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-lg shadow-amber-500/25 transition-all"
                    >
                        {isLoading ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                                Searching…
                            </>
                        ) : (
                            <>
                                <Search className="w-5 h-5 mr-2" />
                                Find Trains
                            </>
                        )}
                    </Button>
                </div>

                {/* Results */}
                {searched && !isLoading && (
                    <div>
                        {trains.length === 0 ? (
                            <div className="text-center py-16 bg-white border border-dashed border-slate-200 rounded-3xl">
                                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                                    <AlertCircle className="w-8 h-8 opacity-50" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-600 mb-1">No General Trains Found</h3>
                                <p className="text-slate-400 text-sm max-w-xs mx-auto">
                                    No trains with General (GEN) coaches run between these stations today.
                                    Try different stations.
                                </p>
                            </div>
                        ) : (
                            <>
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="font-bold text-lg text-slate-800">
                                        {trains.length} train{trains.length !== 1 ? 's' : ''} with General coaches
                                    </h2>
                                    <span className="text-xs text-slate-400 font-medium">{source} → {destination}</span>
                                </div>
                                <div className="space-y-4">
                                    {trains.map(train => {
                                        const genCoaches = train.coaches.filter(c => c.coach_type === 'GEN');
                                        return (
                                            <div
                                                key={train.train_id}
                                                className="group bg-white rounded-2xl border border-slate-100 shadow-md shadow-slate-200/50 hover:shadow-xl hover:border-amber-200 transition-all duration-300 p-5"
                                            >
                                                <div className="flex flex-col md:flex-row md:items-center gap-5">
                                                    {/* Train identity */}
                                                    <div className="flex items-center gap-4 md:w-1/4">
                                                        <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center shadow-inner shrink-0">
                                                            <TrainIcon className="w-6 h-6" />
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-slate-900 leading-tight">{train.train_name}</p>
                                                            <span className="text-xs font-medium bg-slate-100 text-slate-500 px-2 py-0.5 rounded mt-0.5 inline-block">
                                                                #{train.train_number}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Time info */}
                                                    <div className="flex-1 flex items-center justify-between gap-4 px-4 border-x border-dashed border-slate-100">
                                                        <div className="text-center">
                                                            <p className="text-xl font-bold text-slate-900 font-mono">
                                                                {train.departure_time.substring(0, 5)}
                                                            </p>
                                                            <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">{source}</p>
                                                        </div>
                                                        <div className="flex flex-col items-center gap-1">
                                                            <div className="flex items-center gap-1 text-xs text-slate-400 font-bold">
                                                                <Clock className="w-3 h-3" /> {train.duration}
                                                            </div>
                                                            <div className="w-16 h-0.5 bg-slate-200 rounded-full relative">
                                                                <div className="absolute top-1/2 left-0 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-slate-300" />
                                                                <div className="absolute top-1/2 right-0 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-slate-300" />
                                                            </div>
                                                            {train.distance_km > 0 && (
                                                                <div className="flex items-center gap-1 text-xs text-slate-400">
                                                                    <MapPin className="w-3 h-3" /> {train.distance_km} km
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="text-center">
                                                            <p className="text-xl font-bold text-slate-900 font-mono">
                                                                {train.arrival_time.substring(0, 5)}
                                                            </p>
                                                            <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">{destination}</p>
                                                        </div>
                                                    </div>

                                                    {/* GEN coach info + CTA */}
                                                    <div className={cn("flex flex-col items-center gap-2 md:w-1/5")}>
                                                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                                                            <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                                                            {genCoaches.length} GEN coach{genCoaches.length !== 1 ? 'es' : ''}
                                                        </div>
                                                        <Button
                                                            onClick={() => handleSelect(train)}
                                                            className="w-full font-bold rounded-xl bg-amber-500 hover:bg-amber-600 shadow-lg shadow-amber-500/20 text-white"
                                                        >
                                                            Book GEN
                                                            <ArrowRight className="w-4 h-4 ml-1.5" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        )}

                        {/* Rules footer */}
                        <div className="mt-6 flex items-start gap-3 px-5 py-4 bg-blue-50 border border-blue-100 rounded-2xl">
                            <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                            <p className="text-sm text-blue-700 leading-relaxed">
                                <span className="font-bold">General Ticket Rules:</span> Valid for same-day travel only · No seat reservation · Ticket valid for 3 hours from purchase · Max 4 passengers per ticket · Children (5–12) at half fare.
                            </p>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default GenTicketSearch;
