import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { API_BASE } from "@/lib/api";
import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function AdminCoaches() {
    const [trains, setTrains] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [creatingFor, setCreatingFor] = useState<number | null>(null);
    const [newCoach, setNewCoach] = useState<{ 
        coach_number: string; 
        coach_type: string; 
        capacity: number 
    }>({
        coach_number: "",
        coach_type: "SL",
        capacity: 72,
    });

    const load = async () => {
        try {
            setLoading(true);
            const res = await fetch(`${API_BASE}/trains`);
            if (!res.ok) throw new Error("Failed to fetch trains");
            const data = await res.json();
            setTrains(data);
        } catch (error) {
            console.error(error);
            toast.error("Failed to load trains for coaches");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const handleCreateCoach = async (trainId: number) => {
        if (!newCoach.coach_number) {
            toast.error("Coach number is required");
            return;
        }
        
        if (!newCoach.coach_type) {
            toast.error("Coach type is required");
            return;
        }

        if (newCoach.capacity < 1) {
            toast.error("Capacity must be at least 1");
            return;
        }

        try {
            setCreatingFor(trainId);
            const res = await fetch(`${API_BASE}/trains/${trainId}/coaches`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newCoach),
            });
            
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || "Failed to create coach");
            }
            
            toast.success(`Coach ${newCoach.coach_number} added successfully with ${newCoach.capacity} seats`);
            
            // Reset form
            setNewCoach({
                coach_number: "",
                coach_type: "SL",
                capacity: 72,
            });

            // Refresh list
            await load();
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Failed to add coach");
        } finally {
            setCreatingFor(null);
        }
    };

    const handleDeleteCoach = async (coachId: number, coachNumber: string) => {
        if (!confirm(`Are you sure you want to delete coach ${coachNumber}? This will also delete all ${coachNumber}'s seats.`)) {
            return;
        }

        try {
            const res = await fetch(`${API_BASE}/coaches/${coachId}`, {
                method: "DELETE",
            });
            
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || "Failed to delete coach");
            }
            
            toast.success(`Coach ${coachNumber} deleted successfully`);
            
            // Refresh list
            await load();
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Failed to delete coach");
        }
    };

    // Helper to get coach type display name
    const getCoachTypeLabel = (type: string) => {
        const labels: Record<string, string> = {
            'SL': 'Sleeper (SL)',
            '1A': 'First AC (1A)',
            '2A': 'Second AC (2A)',
            '3A': 'Third AC (3A)',
            '3E': 'AC 3 Economy (3E)',
            'CC': 'Chair Car (CC)',
            'EC': 'Executive Chair (EC)',
            'EA': 'Executive Anubhuti (EA)',
            '2S': 'Second Sitting (2S)',
            'EV': 'Vistadome (EV)'
        };
        return labels[type] || type;
    };

    // Helper to get default capacity for coach type
    const getDefaultCapacity = (type: string) => {
        const capacities: Record<string, number> = {
            'SL': 72,
            '1A': 18,
            '2A': 54,
            '3A': 64,
            '3E': 72,
            'CC': 78,
            'EC': 56,
            'EA': 44,
            '2S': 108,
            'EV': 44
        };
        return capacities[type] || 72;
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Coach Management</h1>
                    <p className="text-slate-500 text-sm">
                        Manage coach compositions for each train. Seats are auto-generated based on coach type.
                    </p>
                </div>
            </div>

            <div className="grid gap-6">
                {loading ? (
                    <p className="text-sm text-slate-500">Loading trains and coaches...</p>
                ) : (
                    trains.map((train) => (
                        <Card
                            key={train.train_id}
                            className="border-slate-100 shadow-sm bg-white"
                        >
                            <CardHeader className="pb-4 flex flex-row items-start justify-between space-y-0">
                                <div>
                                    <CardTitle className="text-lg">{train.train_name}</CardTitle>
                                    <p className="text-xs text-slate-500 font-mono">
                                        #{train.train_number}
                                    </p>
                                </div>
                                <span className="bg-purple-50 text-purple-700 px-3 py-1 rounded-lg text-xs font-bold">
                                    {train.coaches?.length || 0} Coaches
                                </span>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                                    {train.coaches?.map((coach: any) => (
                                        <div
                                            key={coach.coach_id}
                                            className="p-3 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border border-slate-200 flex flex-col items-center justify-center text-center group relative hover:shadow-md transition-all"
                                        >
                                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                                                {coach.coach_type}
                                            </div>
                                            <div className="text-lg font-black text-slate-800">
                                                {coach.coach_number}
                                            </div>
                                            <div className="text-[10px] text-slate-400 font-medium">
                                                {coach.capacity || coach.total_seats || 0} Seats
                                            </div>
                                            {/* Delete button - shows on hover */}
                                            <button
                                                onClick={() => handleDeleteCoach(coach.coach_id, coach.coach_number)}
                                                className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                                                title="Delete coach"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                    {(!train.coaches || train.coaches.length === 0) && (
                                        <p className="text-sm text-slate-400 italic py-2 col-span-full">
                                            No coaches added to this train yet.
                                        </p>
                                    )}
                                </div>

                                {/* Add coach for this train */}
                                <div className="mt-4 border-t border-slate-100 pt-4">
                                    <p className="text-xs font-semibold text-slate-500 uppercase mb-3 flex items-center gap-2">
                                        <Plus className="w-3 h-3" />
                                        Add New Coach
                                    </p>
                                    <div className="grid gap-3 md:grid-cols-[1.5fr,2fr,1fr,auto]">
                                        <div>
                                            <label className="text-[11px] uppercase font-semibold text-slate-400 mb-1 block">
                                                Coach No.
                                            </label>
                                            <Input
                                                placeholder="e.g. S1, A1, B2"
                                                value={creatingFor === train.train_id ? newCoach.coach_number : ""}
                                                onChange={(e) => {
                                                    setCreatingFor(train.train_id);
                                                    setNewCoach(prev => ({ ...prev, coach_number: e.target.value.toUpperCase() }));
                                                }}
                                                className="h-10"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[11px] uppercase font-semibold text-slate-400 mb-1 block">
                                                Coach Type
                                            </label>
                                            <Select
                                                value={creatingFor === train.train_id ? newCoach.coach_type : "SL"}
                                                onValueChange={(value: any) => {
                                                    setCreatingFor(train.train_id);
                                                    const defaultCap = getDefaultCapacity(value);
                                                    setNewCoach(prev => ({ 
                                                        ...prev, 
                                                        coach_type: value,
                                                        capacity: defaultCap 
                                                    }));
                                                }}
                                            >
                                                <SelectTrigger className="h-10">
                                                    <SelectValue placeholder="Select type" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="SL">Sleeper (SL) - 72 seats</SelectItem>
                                                    <SelectItem value="1A">First AC (1A) - 18 seats</SelectItem>
                                                    <SelectItem value="2A">Second AC (2A) - 54 seats</SelectItem>
                                                    <SelectItem value="3A">Third AC (3A) - 64 seats</SelectItem>
                                                    <SelectItem value="3E">AC 3 Economy (3E) - 72 seats</SelectItem>
                                                    <SelectItem value="CC">Chair Car (CC) - 78 seats</SelectItem>
                                                    <SelectItem value="EC">Executive Chair (EC) - 56 seats</SelectItem>
                                                    <SelectItem value="2S">Second Sitting (2S) - 108 seats</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <label className="text-[11px] uppercase font-semibold text-slate-400 mb-1 block">
                                                Capacity
                                            </label>
                                            <Input
                                                type="number"
                                                min="1"
                                                max="200"
                                                value={creatingFor === train.train_id ? newCoach.capacity : 72}
                                                onChange={(e) => {
                                                    setCreatingFor(train.train_id);
                                                    setNewCoach(prev => ({ ...prev, capacity: parseInt(e.target.value) || 72 }));
                                                }}
                                                className="h-10"
                                            />
                                        </div>
                                        <div className="flex items-end">
                                            <Button
                                                type="button"
                                                size="sm"
                                                className="w-full h-10 bg-purple-600 hover:bg-purple-700 rounded-xl"
                                                disabled={creatingFor === train.train_id && !newCoach.coach_number}
                                                onClick={() => handleCreateCoach(train.train_id)}
                                            >
                                                <Plus className="w-3 h-3 mr-1.5" />
                                                Add Coach
                                            </Button>
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-2 italic">
                                        💡 Seats will be auto-generated based on the selected coach type and capacity
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}
