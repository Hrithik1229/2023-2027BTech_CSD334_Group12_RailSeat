import Navbar from '@/components/Navbar';
import { StationSearchInput } from '@/components/StationSearchInput';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { CalendarDays, Search } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const SearchTrains = () => {
  const navigate = useNavigate();
  // const [stations, setStations] = useState<{station_name: string, station_code: string}[]>([]); // Removed: Handled by StationSearchInput internally
  const [source, setSource] = useState<string>('');
  const [destination, setDestination] = useState<string>('');
  const [date, setDate] = useState<Date>();
  const [travelClass, setTravelClass] = useState<string>('');
  const [quota, setQuota] = useState<string>('');
  // const [openSource, setOpenSource] = useState(false); // Removed
  // const [openDest, setOpenDest] = useState(false); // Removed

  /* useEffect(() => {
    const fetchStations = async () => {
      try {
        const res = await fetch('http://localhost:3000/api/trains/stations');
        const data = await res.json();
        setStations(data);
      } catch (error) {
        console.error("Failed to fetch stations", error);
      }
    };
    fetchStations();
  }, []); */

  const handleSearch = () => {
    if (!source || !destination || !date || !travelClass || !quota) return;
    
    const params = new URLSearchParams({
      source,
      destination,
      date: format(date, 'yyyy-MM-dd'),
      class: travelClass,
      quota
    });

    navigate(`/trains/results?${params.toString()}`);
  };

  const isFormValid = source && destination && source !== destination && date && travelClass && quota;

  return (
    <div className="min-h-screen bg-slate-50 relative selection:bg-blue-100 selection:text-blue-900">
       {/* Background Decor */}
       <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-blue-600 to-slate-50 opacity-10"></div>
          <div className="absolute -top-[20%] -right-[10%] w-[50%] h-[50%] rounded-full bg-blue-400/20 blur-3xl"></div>
          <div className="absolute top-[20%] -left-[10%] w-[40%] h-[40%] rounded-full bg-indigo-400/20 blur-3xl"></div>
      </div>

      <Navbar />

      <main className="container mx-auto px-4 py-12 max-w-5xl relative z-10">
        <div className="text-center mb-12">
           <h1 className="font-display text-4xl md:text-5xl font-bold text-slate-900 mb-4">
             Plan Your Journey
           </h1>
           <p className="text-slate-500 text-lg">
             Search across thousands of routes and book your perfect seat
           </p>
        </div>

        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-white/50 p-8">
            <div className="grid md:grid-cols-2 gap-8 mb-8">
                {/* Source Station */}
                <StationSearchInput 
                    label="From Station"
                    value={source}
                    onChange={setSource}
                    placeholder="Departing Station"
                    iconColorClass="text-blue-600"
                />

                {/* Destination Station */}
                <div className="flex flex-col space-y-2">
                    <StationSearchInput 
                        label="To Station"
                        value={destination}
                        onChange={setDestination}
                        placeholder="Arrival Station"
                        iconColorClass="text-rose-600"
                    />
                    {source && destination && source === destination && (
                        <span className="text-xs text-red-500 font-medium pl-1">Source and destination cannot be the same</span>
                    )}
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8 mb-8">
                 {/* Date Selection */}
                 <div className="space-y-2 flex flex-col">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1">Travel Date</label>
                    <Popover>
                        <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            className={cn(
                            "w-full h-16 justify-start text-left font-normal border-slate-200 rounded-xl hover:border-blue-400 hover:bg-slate-50 transition-all",
                            !date && "text-muted-foreground"
                            )}
                        >
                            <CalendarDays className="mr-3 h-5 w-5 text-slate-400" />
                            {date ? format(date, "PPP") : <span>Pick a date</span>}
                        </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 rounded-xl shadow-lg border-slate-100" align="start">
                            <Calendar
                                mode="single"
                                selected={date}
                                onSelect={setDate}
                                disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))}
                                initialFocus
                                className="p-3"
                            />
                        </PopoverContent>
                    </Popover>
                 </div>

                 {/* Quota Selection */}
                 <div className="space-y-2 flex flex-col">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1">Quota</label>
                    <Select value={quota} onValueChange={setQuota}>
                      <SelectTrigger className="w-full h-16 rounded-xl border-slate-200 hover:border-blue-400">
                        <SelectValue placeholder="Select quota" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="GN">General</SelectItem>
                        <SelectItem value="TQ">Tatkal</SelectItem>
                        <SelectItem value="LD">Ladies</SelectItem>
                        <SelectItem value="SS">Lower Berth /Sr. Citizen</SelectItem>
                        <SelectItem value="WD">Person with Disability</SelectItem>
                      </SelectContent>
                    </Select>
                 </div>
            </div>

            {/* Class Selection - Pills */}
            <div className="space-y-3 mb-8">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1">Class</label>
                <div className="flex flex-wrap gap-2">
                    {[
                        { id: "All", label: "All" },
                        { id: "SL", label: "SL" },
                        { id: "3A", label: "3A" },
                        { id: "2A", label: "2A" },
                        { id: "1A", label: "1A" },
                        { id: "CC", label: "CC" },
                        { id: "2S", label: "2S" },
                        { id: "FC", label: "FC" },
                        { id: "EC", label: "EC" },
                        { id: "3E", label: "3E" },
                        { id: "VS", label: "VS" },
                    ].map((cls) => (
                        <button
                            key={cls.id}
                            onClick={() => setTravelClass(cls.id)}
                            className={cn(
                                "px-4 py-3 rounded-xl text-sm font-semibold transition-all border",
                                travelClass === cls.id 
                                    ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20 transform scale-105" 
                                    : "bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:bg-blue-50"
                            )}
                        >
                            {cls.label}
                        </button>
                    ))}
                </div>
            </div>

            <Button 
                onClick={handleSearch}
                disabled={!isFormValid}
                className="w-full h-16 text-lg font-bold rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/25 transition-all"
            >
                <Search className="w-5 h-5 mr-2" />
                Search Trains
            </Button>
        </div>
      </main>
    </div>
  );
};

export default SearchTrains;
