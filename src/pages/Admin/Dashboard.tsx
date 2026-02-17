import { Card } from "@/components/ui/card";
import { API_BASE } from "@/lib/api";
import { Activity, Map, Route as RouteIcon, Train } from "lucide-react";
import { useEffect, useState } from "react";

export default function Dashboard() {
    const [stats, setStats] = useState({
        totalTrains: 0,
        totalRuns: 0,
        activeRuns: 0,
        missingTimetable: 0
    });
    useEffect(() => {
        const fetchStats = async () => {
            try {
                // Fetch from backend
                const res = await fetch(`${API_BASE}/admin/dashboard`);
                if (res.ok) {
                    const data = await res.json();
                    setStats(data);
                }
            } catch (error) {
                console.error("Failed to fetch dashboard stats", error);
            }
        };
        fetchStats();
    }, []);

    const metrics = [
        { label: "Total Trains", value: stats.totalTrains, icon: Train, color: "text-blue-600", bg: "bg-blue-50" },
        { label: "Total Runs", value: stats.totalRuns, icon: RouteIcon, color: "text-emerald-600", bg: "bg-emerald-50" },
        { label: "Active Today", value: stats.activeRuns, icon: Activity, color: "text-indigo-600", bg: "bg-indigo-50" },
        { label: "Missing Timetable", value: stats.missingTimetable, icon: Map, color: "text-amber-600", bg: "bg-amber-50" },
    ];

    return (
        <div className="space-y-8">
            <div>
                 <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
                 <p className="text-slate-500">Overview of your train network status.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {metrics.map((m) => (
                    <Card key={m.label} className="p-6 border-slate-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${m.bg} ${m.color}`}>
                            <m.icon className="w-7 h-7" />
                        </div>
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">{m.label}</p>
                            <h3 className="text-3xl font-bold text-slate-900">{m.value}</h3>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
}
