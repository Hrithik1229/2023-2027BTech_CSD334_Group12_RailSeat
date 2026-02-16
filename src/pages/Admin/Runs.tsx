import { Button } from "@/components/ui/button";
import { Map, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function AdminRuns() {
    const navigate = useNavigate();
    const [trains, setTrains] = useState<any[]>([]);

    useEffect(() => {
        fetch("http://localhost:3000/api/trains")
            .then(res => res.json())
            .then(setTrains);
    }, []);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Run Management</h1>
                    <p className="text-slate-500">Manage daily specific schedules and routes</p>
                </div>
                <Button className="bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20 rounded-xl">
                    <Plus className="w-4 h-4 mr-2"/> Add Run
                </Button>
            </div>

            <div className="grid gap-6">
                {trains.map(train => (
                    <div key={train.train_id} className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="font-bold text-lg">{train.train_name}</h3>
                                <p className="text-sm text-slate-500">#{train.train_number}</p>
                            </div>
                            <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-lg text-xs font-bold">
                                {train.runs?.length || 0} Runs
                            </span>
                        </div>

                        <div className="space-y-3">
                            {train.runs?.map((run: any) => (
                                <div key={run.run_id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-transparent hover:border-slate-200 transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-2 h-2 rounded-full ${run.direction === 'UP' ? 'bg-emerald-500' : 'bg-orange-500'}`}></div>
                                        <div>
                                            <div className="font-bold text-sm text-slate-900">
                                                {run.sourceStation?.name || run.source_station_id} 
                                                <span className="mx-2 text-slate-300">→</span> 
                                                {run.destinationStation?.name || run.destination_station_id}
                                            </div>
                                            <div className="text-xs text-slate-500 font-mono mt-0.5">
                                                {run.direction} • {run.days_of_run || 'Daily'}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button size="sm" variant="outline" className="h-8 text-xs border-slate-200" onClick={() => navigate(`/admin/runs/${run.run_id}/route`)}>
                                            <Map className="w-3 h-3 mr-2" /> Planner
                                        </Button>
                                    </div>
                                </div>
                            ))}
                            {(!train.runs || train.runs.length === 0) && (
                                <p className="text-sm text-slate-400 italic py-2">No active runs configured.</p>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
