import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Map, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function AdminRuns() {
    const navigate = useNavigate();
    const [trains, setTrains] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [creatingFor, setCreatingFor] = useState<number | null>(null);
    const [newRun, setNewRun] = useState<{ direction: "UP" | "DOWN"; days_of_run: string }>({
        direction: "UP",
        days_of_run: "Daily",
    });

    useEffect(() => {
        const load = async () => {
            try {
                setLoading(true);
                const res = await fetch("http://localhost:3000/api/trains");
                if (!res.ok) throw new Error("Failed to fetch trains");
                const data = await res.json();
                setTrains(data);
            } catch (error) {
                console.error(error);
                toast.error("Failed to load trains for runs");
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const handleCreateRun = async (trainId: number) => {
        if (!newRun.direction) {
            toast.error("Direction is required");
            return;
        }
        try {
            setCreatingFor(trainId);
            const res = await fetch(`http://localhost:3000/api/trains/${trainId}/runs`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    direction: newRun.direction,
                    days_of_run: newRun.days_of_run || "Daily",
                }),
            });
            if (!res.ok) throw new Error("Failed to create run");
            const created = await res.json();
            toast.success("Run created. Configure its route next.");

            // Refresh list
            const reload = await fetch("http://localhost:3000/api/trains");
            const data = await reload.json();
            setTrains(data);

            // Navigate directly to route builder
            navigate(`/admin/runs/${created.run_id}/route`);
        } catch (error) {
            console.error(error);
            toast.error("Failed to create run");
        } finally {
            setCreatingFor(null);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Run Management</h1>
                    <p className="text-slate-500 text-sm">
                        Create directional runs for each train and open the route planner to define detailed stops.
                    </p>
                </div>
            </div>

            <div className="grid gap-6">
                {loading ? (
                    <p className="text-sm text-slate-500">Loading trains and runs...</p>
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
                                <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-lg text-xs font-bold">
                                    {train.runs?.length || 0} Runs
                                </span>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-3">
                                    {train.runs?.map((run: any) => (
                                        <div
                                            key={run.run_id}
                                            className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-transparent hover:border-slate-200 transition-all"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div
                                                    className={`w-2 h-2 rounded-full ${
                                                        run.direction === "UP"
                                                            ? "bg-emerald-500"
                                                            : "bg-orange-500"
                                                    }`}
                                                ></div>
                                                <div>
                                                    <div className="font-bold text-sm text-slate-900">
                                                        {run.sourceStation?.name ||
                                                            run.source_station_id}
                                                        <span className="mx-2 text-slate-300">→</span>
                                                        {run.destinationStation?.name ||
                                                            run.destination_station_id}
                                                    </div>
                                                    <div className="text-xs text-slate-500 font-mono mt-0.5">
                                                        {run.direction} •{" "}
                                                        {run.days_of_run || "Daily"}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-8 text-xs border-slate-200"
                                                    onClick={() =>
                                                        navigate(`/admin/runs/${run.run_id}/route`)
                                                    }
                                                >
                                                    <Map className="w-3 h-3 mr-2" /> Planner
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                    {(!train.runs || train.runs.length === 0) && (
                                        <p className="text-sm text-slate-400 italic py-2">
                                            No active runs configured.
                                        </p>
                                    )}
                                </div>

                                {/* Create run for this train */}
                                <div className="mt-4 border-t border-slate-100 pt-4">
                                    <p className="text-xs font-semibold text-slate-500 uppercase mb-2">
                                        Add Run for this Train
                                    </p>
                                    <div className="grid gap-3 md:grid-cols-[0.6fr,1.4fr,auto]">
                                        <div>
                                            <label className="text-[11px] uppercase font-semibold text-slate-400 mb-1 block">
                                                Direction
                                            </label>
                                            <Select
                                                value={newRun.direction}
                                                onValueChange={(value: "UP" | "DOWN") =>
                                                    setNewRun((prev) => ({
                                                        ...prev,
                                                        direction: value,
                                                    }))
                                                }
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select direction" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="UP">UP</SelectItem>
                                                    <SelectItem value="DOWN">DOWN</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <label className="text-[11px] uppercase font-semibold text-slate-400 mb-1 block">
                                                Days of Run
                                            </label>
                                            <Input
                                                placeholder="e.g. Mon,Tue,Wed or Daily"
                                                value={newRun.days_of_run}
                                                onChange={(e) =>
                                                    setNewRun((prev) => ({
                                                        ...prev,
                                                        days_of_run: e.target.value,
                                                    }))
                                                }
                                            />
                                        </div>
                                        <div className="flex items-end">
                                            <Button
                                                type="button"
                                                size="sm"
                                                className="w-full bg-blue-600 hover:bg-blue-700 rounded-xl"
                                                disabled={creatingFor === train.train_id}
                                                onClick={() => handleCreateRun(train.train_id)}
                                            >
                                                <Plus className="w-3 h-3 mr-1.5" />
                                                {creatingFor === train.train_id
                                                    ? "Creating..."
                                                    : "Create & Open Planner"}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}
