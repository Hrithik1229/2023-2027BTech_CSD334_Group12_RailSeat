
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ArrowLeft, ArrowRight, Clock, Filter, Train as TrainIcon, UtensilsCrossed, Wifi } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

interface TrainData {
    train_id: number;
    train_number: string;
    train_name: string;
    departure_time: string;
    arrival_time: string;
    duration: string;
    coaches: {
        coach_number: string;
        seats: { status: string }[];
    }[];
}

const TrainResults = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [trains, setTrains] = useState<TrainData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState("departure");

  const source = searchParams.get('source');
  const destination = searchParams.get('destination');
  const dateStr = searchParams.get('date');
  const travelClass = searchParams.get('class');
  const quota = searchParams.get('quota');

  useEffect(() => {
    const fetchTrains = async () => {
      setIsLoading(true);
      try {
        const query = new URLSearchParams({
            source: source || '',
            destination: destination || '',
            date: dateStr || ''
        });
        const response = await fetch(`http://localhost:3000/api/trains/search?${query.toString()}`);
        if (!response.ok) throw new Error('Failed to fetch');
        const data = await response.json();
        setTrains(data);
      } catch (error) {
        console.error('Failed to fetch trains:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (source && destination) {
        fetchTrains();
    }
  }, [source, destination, dateStr]);

  const sortedTrains = [...trains].sort((a, b) => {
      if (sortBy === "departure") return a.departure_time.localeCompare(b.departure_time);
      if (sortBy === "arrival") return a.arrival_time.localeCompare(b.arrival_time);
      if (sortBy === "duration") return a.duration.localeCompare(b.duration);
      return 0;
  });

  const handleBook = (train: TrainData) => {
     navigate('/seats', { 
        state: { 
          source, 
          destination, 
          date: dateStr ? format(new Date(dateStr), 'PPP') : '',
          isoDate: dateStr,
          trainId: train.train_id.toString(),
          class: travelClass,
          quota
        } 
      });
  };

  return (
    <div className="min-h-screen bg-slate-50 relative">
       {/* Background Decor */}
       <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-0 w-full h-[300px] bg-gradient-to-b from-blue-600/5 to-slate-50 opacity-10"></div>
      </div>

      <Navbar />

      <main className="container mx-auto px-4 py-8 max-w-6xl relative z-10">
        <div className="flex items-center justify-between mb-8">
            <div>
                <Button variant="ghost" className="mb-2 pl-0 hover:pl-2 transition-all" onClick={() => navigate(-1)}>
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back
                </Button>
                <h1 className="font-display text-3xl font-bold text-slate-900">
                    Trains from <span className="text-blue-600">{source}</span> to <span className="text-blue-600">{destination}</span>
                </h1>
                <p className="text-slate-500 mt-1">
                    {dateStr ? format(new Date(dateStr), 'EEEE, MMMM d, yyyy') : 'Date not selected'} • {trains.length} results
                </p>
            </div>
            
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-slate-400" />
                    <span className="text-sm font-medium text-slate-600">Sort by:</span>
                </div>
                <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-[180px] bg-white">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="departure">Departure Time</SelectItem>
                        <SelectItem value="arrival">Arrival Time</SelectItem>
                        <SelectItem value="duration">Duration</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>

        {isLoading ? (
            <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex gap-6">
                        <Skeleton className="w-16 h-16 rounded-2xl" />
                        <div className="flex-1 space-y-4">
                            <Skeleton className="h-6 w-1/3" />
                            <Skeleton className="h-4 w-1/4" />
                            <Skeleton className="h-12 w-full rounded-xl" />
                        </div>
                    </div>
                ))}
            </div>
        ) : trains.length === 0 ? (
            <div className="text-center py-20 bg-white border border-dashed border-slate-300 rounded-3xl">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                    <TrainIcon className="w-8 h-8 opacity-50" />
                </div>
                <h3 className="text-lg font-bold text-slate-600 mb-1">No trains found</h3>
                <p className="text-slate-400">Try changing your search parameters or date.</p>
                <Button variant="outline" className="mt-6" onClick={() => navigate(-1)}>
                    Back to Search
                </Button>
            </div>
        ) : (
            <div className="space-y-5">
                {sortedTrains.map((train) => (
                    <div 
                        key={train.train_id}
                        className="group bg-white rounded-3xl p-6 border border-slate-100 shadow-lg shadow-slate-200/50 hover:shadow-xl hover:shadow-slate-300/40 hover:border-blue-200 transition-all duration-300"
                    >
                        <div className="flex flex-col md:flex-row md:items-center gap-6 md:gap-8">
                             {/* Train Info */}
                             <div className="flex items-center gap-4 md:w-1/4">
                                <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-inner">
                                    <TrainIcon className="w-7 h-7" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-slate-900">{train.train_name}</h3>
                                    <span className="text-xs font-medium bg-slate-100 text-slate-500 px-2 py-0.5 rounded">
                                        #{train.train_number}
                                    </span>
                                </div>
                             </div>

                             {/* Time Info */}
                             <div className="flex-1 flex items-center justify-between gap-8 px-4 border-l border-r border-slate-100 border-dashed md:border-solid mx-4 md:mx-0 py-4 md:py-0">
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-slate-900 font-mono tracking-tight">{train.departure_time.substring(0, 5)}</p>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{source}</p>
                                </div>
                                <div className="flex flex-col items-center">
                                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 mb-1">
                                        <Clock className="w-3 h-3" /> {train.duration}
                                    </div>
                                    <div className="w-24 h-0.5 bg-slate-200 rounded-full relative">
                                        <div className="absolute top-1/2 left-0 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                                        <div className="absolute top-1/2 right-0 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                                    </div>
                                </div>
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-slate-900 font-mono tracking-tight">{train.arrival_time.substring(0, 5)}</p>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{destination}</p>
                                </div>
                             </div>

                             {/* Action */}
                             <div className="flex flex-col items-center gap-3 md:w-1/5">
                                <div className="flex gap-2 text-xs text-slate-400">
                                    <span title="Pantry Available"><UtensilsCrossed className="w-3 h-3" /></span>
                                    <span title="WiFi Available"><Wifi className="w-3 h-3" /></span>
                                </div>
                                <Button 
                                    onClick={() => handleBook(train)}
                                    className="w-full font-bold rounded-xl bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20"
                                >
                                    View Seats
                                    <ArrowRight className="w-4 h-4 ml-2" />
                                </Button>
                                <p className="text-xs text-green-600 font-medium">
                                    {train.coaches.reduce((acc, c) => acc + c.seats.filter(s => s.status === 'available').length, 0)} Options Available
                                </p>
                             </div>
                        </div>

                        {/* Class Badges */}
                        <div className="mt-6 pt-4 border-t border-slate-50 flex gap-2 overflow-x-auto pb-2">
                             {["1A", "2A", "3A", "SL"].map(cls => (
                                 <div key={cls} className={cn(
                                     "px-3 py-1.5 rounded-lg border text-sm font-medium whitespace-nowrap",
                                     travelClass === cls ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-white border-slate-100 text-slate-500"
                                 )}>
                                     {cls}
                                     <span className="ml-2 text-xs opacity-50">₹ {Math.floor(Math.random() * 2000) + 500}</span>
                                 </div>
                             ))}
                        </div>
                    </div>
                ))}
            </div>
        )}
      </main>
    </div>
  );
};

export default TrainResults;
