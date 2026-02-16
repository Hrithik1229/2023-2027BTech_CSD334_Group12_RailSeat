import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Plus, RefreshCcw, Train } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const DAY_OPTIONS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface TrainItem {
    train_id: number;
    train_number: string;
    train_name: string;
    status: "active" | "inactive";
    active_days?: string | null;
    runs?: {
        run_id: number;
        direction: "UP" | "DOWN";
        sourceStation?: { name: string };
        destinationStation?: { name: string };
        days_of_run?: string;
    }[];
}

export default function AdminTrains() {
    const [trains, setTrains] = useState<TrainItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [newTrain, setNewTrain] = useState({
        train_number: "",
        train_name: "",
        active_days: DAY_OPTIONS.join(","),
        status: "active" as "active" | "inactive",
    });

    const fetchTrains = async () => {
        try {
            setLoading(true);
            const res = await fetch("http://localhost:3000/api/trains");
            if (!res.ok) throw new Error("Failed to load trains");
            const data = await res.json();
            setTrains(data);
        } catch (error) {
            console.error(error);
            toast.error("Failed to fetch trains");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTrains();
    }, []);

    const handleCreateTrain = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTrain.train_number || !newTrain.train_name) {
            toast.error("Train number and name are required");
            return;
        }

        try {
            setCreating(true);
            const res = await fetch("http://localhost:3000/api/trains", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(newTrain),
            });
            if (!res.ok) throw new Error("Failed to create train");
            toast.success("Train created");
            setNewTrain({
                train_number: "",
                train_name: "",
                active_days: DAY_OPTIONS.join(","),
                status: "active",
            });
            await fetchTrains();
        } catch (error) {
            console.error(error);
            toast.error("Failed to create train");
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Train Management</h1>
                    <p className="text-slate-500 text-sm">
                        Manage base train records. Runs and detailed routes are configured in the Runs section.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="icon"
                        className="rounded-xl"
                        onClick={fetchTrains}
                        disabled={loading}
                    >
                        <RefreshCcw className={cn("w-4 h-4", loading && "animate-spin")} />
                    </Button>
                </div>
            </div>

            {/* Create train */}
            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-4 flex flex-row items-center justify-between space-y-0">
                    <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Plus className="w-4 h-4 text-blue-600" />
                            Add New Train
                        </CardTitle>
                    </div>
                </CardHeader>
                <CardContent>
                    <form
                        onSubmit={handleCreateTrain}
                        className="grid gap-4 md:grid-cols-[1.2fr,2fr,1.4fr,0.8fr,auto]"
                    >
                        <div>
                            <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">
                                Train Number
                            </label>
                            <Input
                                placeholder="e.g. 12601"
                                value={newTrain.train_number}
                                onChange={(e) =>
                                    setNewTrain((prev) => ({ ...prev, train_number: e.target.value }))
                                }
                            />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">
                                Train Name
                            </label>
                            <Input
                                placeholder="e.g. MGR Chennai Express"
                                value={newTrain.train_name}
                                onChange={(e) =>
                                    setNewTrain((prev) => ({ ...prev, train_name: e.target.value }))
                                }
                            />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">
                                Active Days
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {DAY_OPTIONS.map((day) => {
                                    const selectedDays = (newTrain.active_days || "")
                                        .split(",")
                                        .map((d) => d.trim())
                                        .filter(Boolean);
                                    const isSelected = selectedDays.includes(day);

                                    return (
                                        <button
                                            key={day}
                                            type="button"
                                            onClick={() => {
                                                const current = (newTrain.active_days || "")
                                                    .split(",")
                                                    .map((d) => d.trim())
                                                    .filter(Boolean);
                                                let next: string[];
                                                if (current.includes(day)) {
                                                    next = current.filter((d) => d !== day);
                                                } else {
                                                    next = [...current, day];
                                                }
                                                // Keep order consistent with DAY_OPTIONS
                                                const ordered = DAY_OPTIONS.filter((d) =>
                                                    next.includes(d),
                                                );
                                                setNewTrain((prev) => ({
                                                    ...prev,
                                                    active_days: ordered.join(","),
                                                }));
                                            }}
                                            className={cn(
                                                "px-2 py-1 rounded-full text-xs border transition-colors",
                                                isSelected
                                                    ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                                                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50",
                                            )}
                                        >
                                            {day}
                                        </button>
                                    );
                                })}
                            </div>
                            <p className="mt-1 text-[10px] text-slate-400">
                                Click to toggle days. Selected days will be stored as a comma-separated
                                list.
                            </p>
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">
                                Status
                            </label>
                            <Select
                                value={newTrain.status}
                                onValueChange={(value: "active" | "inactive") =>
                                    setNewTrain((prev) => ({ ...prev, status: value }))
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="inactive">Inactive</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-end">
                            <Button
                                type="submit"
                                className="w-full bg-blue-600 hover:bg-blue-700 rounded-xl"
                                disabled={creating}
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                {creating ? "Saving..." : "Save"}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            {/* Train list */}
            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Train className="w-4 h-4 text-slate-500" />
                        Existing Trains
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <p className="text-sm text-slate-500">Loading trains...</p>
                    ) : trains.length === 0 ? (
                        <p className="text-sm text-slate-400 italic">
                            No trains found. Create your first train above.
                        </p>
                    ) : (
                        <div className="space-y-3">
                            {trains.map((train) => (
                                <div
                                    key={train.train_id}
                                    className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 px-4 py-3 rounded-xl border border-slate-100 bg-white hover:border-blue-200 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center font-semibold text-sm">
                                            {train.train_number}
                                        </div>
                                        <div>
                                            <div className="font-semibold text-slate-900">
                                                {train.train_name}
                                            </div>
                                            <div className="text-xs text-slate-500">
                                                {train.runs?.length || 0} configured runs
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-start md:items-end gap-1 text-xs">
                                        <div className="flex items-center gap-2">
                                            <span
                                                className={cn(
                                                    "px-2 py-1 rounded-full font-semibold",
                                                    train.status === "active"
                                                        ? "bg-emerald-50 text-emerald-700"
                                                        : "bg-slate-100 text-slate-500"
                                                )}
                                            >
                                                {train.status === "active" ? "Active" : "Inactive"}
                                            </span>
                                            {train.active_days && (
                                                <span className="text-[11px] text-slate-500">
                                                    Days: {train.active_days}
                                                </span>
                                            )}
                                        </div>
                                        {train.runs && train.runs.length > 0 && (
                                            <div className="hidden md:flex flex-wrap gap-2 text-[11px] text-slate-500">
                                                {train.runs.slice(0, 3).map((run) => (
                                                    <span
                                                        key={run.run_id}
                                                        className="px-2 py-0.5 rounded-full bg-slate-50 border border-slate-200"
                                                    >
                                                        {run.direction} •{" "}
                                                        {run.sourceStation?.name ?? "?"} →{" "}
                                                        {run.destinationStation?.name ?? "?"}
                                                    </span>
                                                ))}
                                                {train.runs.length > 3 && (
                                                    <span className="text-slate-400">
                                                        +{train.runs.length - 3} more
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
