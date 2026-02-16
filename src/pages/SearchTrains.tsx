
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
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
import { CalendarDays, Check, ChevronsUpDown, MapPin, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const SearchTrains = () => {
  const navigate = useNavigate();
  const [stations, setStations] = useState<{station_name: string, station_code: string}[]>([]);
  const [source, setSource] = useState<string>('');
  const [destination, setDestination] = useState<string>('');
  const [date, setDate] = useState<Date>();
  const [travelClass, setTravelClass] = useState<string>('');
  const [quota, setQuota] = useState<string>('');
  const [openSource, setOpenSource] = useState(false);
  const [openDest, setOpenDest] = useState(false);

  useEffect(() => {
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
  }, []);

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
                <div className="space-y-2 flex flex-col">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1">From Station</label>
                    <Popover open={openSource} onOpenChange={setOpenSource}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={openSource}
                          className="w-full h-16 justify-between text-base px-4 rounded-xl border-slate-200 hover:border-blue-400 hover:bg-slate-50 transition-all group"
                        >
                          <div className="flex items-center gap-3">
                              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-100 transition-colors">
                                  <MapPin className="w-5 h-5" />
                              </div>
                              <div className="flex flex-col items-start">
                                  <span className={cn("font-medium", !source && "text-slate-400")}>
                                      {source ? stations.find((s) => s.station_name === source)?.station_name : "Select source..."}
                                  </span>
                                  {source && <span className="text-xs text-slate-400 font-normal">Departing Station</span>}
                              </div>
                          </div>
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[300px] p-0 rounded-xl" align="start">
                        <Command>
                          <CommandInput placeholder="Search station..." />
                          <CommandList>
                            <CommandEmpty>No station found.</CommandEmpty>
                            <CommandGroup>
                              {stations.map((station) => (
                                <CommandItem
                                  key={station.station_code || station.station_name}
                                  value={station.station_name}
                                  onSelect={(currentValue) => {
                                    setSource(currentValue === source ? "" : currentValue)
                                    setOpenSource(false)
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      source === station.station_name ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  {station.station_name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                </div>

                {/* Destination Station */}
                <div className="space-y-2 flex flex-col">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1">To Station</label>
                    <Popover open={openDest} onOpenChange={setOpenDest}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={openDest}
                          className="w-full h-16 justify-between text-base px-4 rounded-xl border-slate-200 hover:border-blue-400 hover:bg-slate-50 transition-all group"
                        >
                           <div className="flex items-center gap-3">
                              <div className="p-2 bg-rose-50 text-rose-600 rounded-lg group-hover:bg-rose-100 transition-colors">
                                  <MapPin className="w-5 h-5" />
                              </div>
                              <div className="flex flex-col items-start">
                                  <span className={cn("font-medium", !destination && "text-slate-400")}>
                                      {destination ? stations.find((s) => s.station_name === destination)?.station_name : "Select destination..."}
                                  </span>
                                  {destination && <span className="text-xs text-slate-400 font-normal">Arrival Station</span>}
                              </div>
                          </div>
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[300px] p-0 rounded-xl" align="start">
                        <Command>
                          <CommandInput placeholder="Search station..." />
                          <CommandList>
                            <CommandEmpty>No station found.</CommandEmpty>
                            <CommandGroup>
                              {stations.map((station) => (
                                <CommandItem
                                  key={station.station_code || station.station_name}
                                  value={station.station_name}
                                  onSelect={(currentValue) => {
                                    setDestination(currentValue === destination ? "" : currentValue)
                                    setOpenDest(false)
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      destination === station.station_name ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  {station.station_name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    {source && destination && source === destination && (
                        <span className="text-xs text-red-500 font-medium pl-1">Source and destination cannot be the same</span>
                    )}
                </div>
            </div>

            <div className="grid md:grid-cols-3 gap-8 mb-8">
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

                 {/* Class Selection */}
                 <div className="space-y-2 flex flex-col">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1">Class</label>
                    <Select value={travelClass} onValueChange={setTravelClass}>
                      <SelectTrigger className="w-full h-16 rounded-xl border-slate-200 hover:border-blue-400">
                        <SelectValue placeholder="Select class" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="All">All Classes</SelectItem>
                        <SelectItem value="SL">Sleeper (SL)</SelectItem>
                        <SelectItem value="3A">AC 3 Tier (3A)</SelectItem>
                        <SelectItem value="2A">AC 2 Tier (2A)</SelectItem>
                        <SelectItem value="1A">AC First Class (1A)</SelectItem>
                        <SelectItem value="CC">AC Chair Car (CC)</SelectItem>
                        <SelectItem value="2S">Second Sitting (2S)</SelectItem>
                      </SelectContent>
                    </Select>
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
                        <SelectItem value="SS">Senior Citizen</SelectItem>
                      </SelectContent>
                    </Select>
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
