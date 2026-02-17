
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { API_BASE } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Check, ChevronsUpDown, Loader2, MapPin } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useDebounce } from '../hooks/use-debounce';

interface Station {
    id: number;
    code: string;
    name: string;
    city?: string;
}

interface StationSearchInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    iconColorClass?: string;
    label?: string;
}

export function StationSearchInput({ value, onChange, placeholder, iconColorClass = "text-blue-600", label }: StationSearchInputProps) {
    const [open, setOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [stations, setStations] = useState<Station[]>([]);
    const [loading, setLoading] = useState(false);
    
    // We want to initialize searchTerm with the current value if it exists,
    // but typically value is just the name.
    // Ideally, we might want to store the whole station object, but the parent uses string.
    // So we'll trigger search on user typing.

    // If the parent passes a value (which is a station name), we should probably 
    // NOT set search term to it immediately to avoid triggering search unless the user focuses.
    // However, for display we need it. 
    
    // Actually, CommandInput acts as the input. 
    
    const debouncedSearch = useDebounce(searchTerm, 300);

    useEffect(() => {
        if (!debouncedSearch || debouncedSearch.length < 2) {
            setStations([]);
            return;
        }

        const fetchStations = async () => {
            setLoading(true);
            try {
                const res = await fetch(`${API_BASE}/trains/stations/search?q=${encodeURIComponent(debouncedSearch)}`);
                if (res.ok) {
                    const data = await res.json();
                    setStations(data);
                }
            } catch (error) {
                console.error("Error fetching stations:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchStations();
    }, [debouncedSearch]);

    return (
        <div className="space-y-2 flex flex-col">
            {label && <label className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1">{label}</label>}
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className="w-full h-16 justify-between text-base px-4 rounded-xl border-slate-200 hover:border-blue-400 hover:bg-slate-50 transition-all group"
                    >
                        <div className="flex items-center gap-3 w-full">
                            <div className={cn("p-2 rounded-lg transition-colors bg-opacity-10", iconColorClass.replace("text-", "bg-"), iconColorClass)}>
                                <MapPin className="w-5 h-5" />
                            </div>
                            <div className="flex flex-col items-start truncate">
                                <span className={cn("font-medium truncate w-full text-left", !value && "text-slate-400")}>
                                    {value || placeholder || "Select station..."}
                                </span>
                                {value && <span className="text-xs text-slate-400 font-normal">Station</span>}
                            </div>
                        </div>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0 rounded-xl" align="start">
                    <Command shouldFilter={false}> 
                         {/* We disable client-side filtering because we do server-side filtering */}
                        <CommandInput 
                            placeholder="Type station code or name..." 
                            value={searchTerm}
                            onValueChange={setSearchTerm}
                        />
                        <CommandList>
                            {loading && (
                                <div className="py-6 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Searching...
                                </div>
                            )}
                            {!loading && stations.length === 0 && searchTerm.length >= 2 && (
                                <CommandEmpty>No station found.</CommandEmpty>
                            )}
                            {!loading && searchTerm.length < 2 && (
                                <div className="py-4 text-center text-sm text-muted-foreground">
                                    Type at least 2 characters
                                </div>
                            )}
                            <CommandGroup>
                                {stations.map((station) => (
                                    <CommandItem
                                        key={station.id}
                                        value={station.name} // Value for filtering/accessibility
                                        onSelect={() => {
                                            onChange(station.code); // Pass code back
                                            setOpen(false);
                                            setSearchTerm("");
                                        }}
                                    >
                                        <Check
                                            className={cn(
                                                "mr-2 h-4 w-4",
                                                value === station.name ? "opacity-100" : "opacity-0"
                                            )}
                                        />
                                        <div className="flex flex-col">
                                            <span className="font-medium">{station.name}</span>
                                            <span className="text-xs text-muted-foreground">{station.code} • {station.city || 'Station'}</span>
                                        </div>
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
        </div>
    );
}
