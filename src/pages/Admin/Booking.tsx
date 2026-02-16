import { StationSearchInput } from "@/components/StationSearchInput";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Armchair, CalendarIcon, Search, Train } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function AdminBooking() {
    const [source, setSource] = useState("");
    const [destination, setDestination] = useState("");
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    
    // Selecting items
    const [selectedRun, setSelectedRun] = useState<any>(null);
    const [selectedCoach, setSelectedCoach] = useState<any>(null);

    const handleSearch = async () => {
        if (!source || !destination || !date) {
            toast.error("Please fill all fields");
            return;
        }

        setLoading(true);
        setSelectedRun(null);
        setSelectedCoach(null);
        
        try {
            // Reusing the public search API for now
            const formattedDate = format(date, "yyyy-MM-dd");
            const res = await fetch(`http://localhost:3000/api/trains/search?source=${source}&destination=${destination}&date=${formattedDate}`);
            if (!res.ok) throw new Error("Search failed");
            const data = await res.json();
            setSearchResults(data);
            if (data.length === 0) toast.info("No trains found");
        } catch (error) {
            toast.error("Failed to search trains");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">Admin Booking Interface</h1>
            
            {/* Search Section */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-end">
                <div className="w-64">
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Source</label>
                    <StationSearchInput value={source} onChange={setSource} placeholder="From Station" />
                </div>
                <div className="w-64">
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Destination</label>
                    <StationSearchInput value={destination} onChange={setDestination} placeholder="To Station" />
                </div>
                <div className="w-48">
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Date</label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}>
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {date ? format(date, "PPP") : <span>Pick a date</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
                        </PopoverContent>
                    </Popover>
                </div>
                <Button onClick={handleSearch} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
                    <Search className="w-4 h-4 mr-2" />
                    {loading ? "Searching..." : "Find Trains"}
                </Button>
            </div>

            <div className="flex gap-6">
                {/* Results List */}
                {searchResults.length > 0 && (
                    <div className="w-1/3 space-y-4">
                        <h2 className="font-bold text-lg text-slate-700">Available Trains</h2>
                        {searchResults.map((run) => (
                            <div 
                                key={run.run_id} 
                                onClick={() => { setSelectedRun(run); setSelectedCoach(null); }}
                                className={cn(
                                    "p-4 rounded-xl border cursor-pointer transition-all",
                                    selectedRun?.run_id === run.run_id 
                                        ? "bg-blue-50 border-blue-500 ring-1 ring-blue-500" 
                                        : "bg-white border-slate-200 hover:border-blue-300"
                                )}
                            >
                                <div className="flex justify-between items-center mb-2">
                                    <h3 className="font-bold text-blue-700">{run.train_name}</h3>
                                    <span className="text-xs font-mono bg-slate-100 px-2 py-1 rounded">{run.train_number}</span>
                                </div>
                                <div className="flex justify-between text-sm text-slate-600">
                                    <span>{run.departure_time}</span>
                                    <span className="text-slate-300">→</span>
                                    <span>{run.arrival_time}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Train/Coach View */}
                {selectedRun && (
                    <div className="flex-1 space-y-6">
                         {/* Train Overview */}
                         <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                             <div className="flex items-center gap-2 mb-4">
                                 <Train className="w-5 h-5 text-blue-600" />
                                 <h2 className="font-bold text-xl">Select Coach</h2>
                             </div>
                             
                             {/* Coaches Grid */}
                             <div className="grid grid-cols-6 gap-3">
                                 {/* Mock Data for Coaches if not in API yet */}
                                 {(selectedRun.coaches && selectedRun.coaches.length > 0 ? selectedRun.coaches : [
                                     { id: 1, name: 'S1', type: 'SL' }, { id: 2, name: 'S2', type: 'SL' }, 
                                     { id: 3, name: 'B1', type: '3A' }, { id: 4, name: 'B2', type: '3A' },
                                     { id: 5, name: 'A1', type: '2A' }
                                 ]).map((coach: any) => (
                                     <button
                                         key={coach.id || coach.name}
                                         onClick={() => setSelectedCoach(coach)}
                                         className={cn(
                                             "p-3 rounded-lg border text-center transition-all",
                                             selectedCoach?.name === coach.name
                                                 ? "bg-indigo-600 text-white border-indigo-600 shadow-md"
                                                 : "bg-slate-50 border-slate-200 hover:bg-white hover:border-indigo-300 text-slate-700"
                                         )}
                                     >
                                         <div className="font-bold text-lg">{coach.name}</div>
                                         <div className={cn("text-xs uppercase", selectedCoach?.name === coach.name ? "text-indigo-200" : "text-slate-400")}>{coach.type}</div>
                                     </button>
                                 ))}
                             </div>
                         </div>

                         {/* Seat Map View */}
                         {selectedCoach && (
                             <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm animate-in fade-in slide-in-from-bottom-4">
                                 <div className="flex items-center justify-between mb-6">
                                     <div className="flex items-center gap-2">
                                         <Armchair className="w-5 h-5 text-indigo-600" />
                                         <h2 className="font-bold text-xl">Coach {selectedCoach.name}</h2>
                                     </div>
                                     <div className="flex gap-4 text-xs font-medium">
                                         <div className="flex items-center gap-1"><div className="w-3 h-3 bg-white border border-slate-300 rounded"></div> Available</div>
                                         <div className="flex items-center gap-1"><div className="w-3 h-3 bg-slate-100 border border-slate-200 rounded text-slate-300">X</div> Booked</div>
                                         <div className="flex items-center gap-1"><div className="w-3 h-3 bg-green-500 rounded"></div> Selected</div>
                                     </div>
                                 </div>

                                 {/* Simple 8x8 Grid for Prototype */}
                                 <div className="grid grid-cols-4 gap-4 max-w-sm mx-auto">
                                     {Array.from({ length: 72 }).map((_, i) => {
                                         const seatNum = i + 1;
                                         // Random status for demo
                                         const isBooked = Math.random() > 0.7; 
                                         return (
                                             <button 
                                                 key={seatNum}
                                                 disabled={isBooked}
                                                 className={cn(
                                                     "h-10 w-10 rounded-md flex items-center justify-center text-xs font-bold transition-all relative",
                                                     isBooked 
                                                         ? "bg-slate-100 text-slate-300 cursor-not-allowed"
                                                         : "bg-white border border-slate-300 hover:border-green-500 hover:text-green-600 shadow-sm"
                                                 )}
                                             >
                                                 {seatNum}
                                             </button>
                                         );
                                     })}
                                 </div>
                             </div>
                         )}
                    </div>
                )}
            </div>
        </div>
    );
}
