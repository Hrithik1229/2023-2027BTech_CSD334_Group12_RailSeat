import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { API_BASE } from "@/lib/api";
import { Loader2, MapPin, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface Station {
    id: number;
    code: string | null;
    name: string;
    city?: string | null;
    state?: string | null;
}

export default function AdminStations() {
    const [stations, setStations] = useState<Station[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [savingId, setSavingId] = useState<number | "new" | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [form, setForm] = useState<Omit<Station, "id">>({
        code: "",
        name: "",
        city: "",
        state: "",
    });

    const fetchStations = async () => {
        try {
            setLoading(true);
            setError(null);
            console.log("Fetching stations from:", `${API_BASE}/admin/stations`);
            const res = await fetch(`${API_BASE}/admin/stations`);
            if (!res.ok) {
                const text = await res.text();
                throw new Error(`Failed to load stations: ${res.status} ${res.statusText}`);
            }
            const data = await res.json();
            setStations(data);
        } catch (error: any) {
            console.error("Fetch error:", error);
            setError(error.message || "Failed to load stations");
            // toast.error("Failed to fetch stations");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStations();
    }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name) {
            toast.error("Station name is required");
            return;
        }
        try {
            setSavingId("new");
            const res = await fetch(`${API_BASE}/admin/stations`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });
            if (!res.ok) throw new Error("Failed to create station");
            
            toast.success("Station created");
            setForm({ code: "", name: "", city: "", state: "" });
            setIsDialogOpen(false);
            await fetchStations();
        } catch (error) {
            console.error(error);
            toast.error("Failed to create station");
        } finally {
            setSavingId(null);
        }
    };

    const handleUpdate = async (station: Station, patch: Partial<Station>) => {
        const updated = { ...station, ...patch };
        setStations((prev) => prev.map((s) => (s.id === station.id ? updated : s)));
        try {
            setSavingId(station.id);
            const res = await fetch(`${API_BASE}/admin/stations/${station.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    code: updated.code,
                    name: updated.name,
                    city: updated.city,
                    state: updated.state,
                }),
            });
            if (!res.ok) throw new Error("Failed to update station");
            toast.success("Station updated");
        } catch (error) {
            console.error(error);
            toast.error("Failed to update station");
            fetchStations();
        } finally {
            setSavingId(null);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Delete this station?")) return;
        try {
            const res = await fetch(`${API_BASE}/admin/stations/${id}`, {
                method: "DELETE",
            });
            if (!res.ok && res.status !== 204) throw new Error("Failed to delete station");
            toast.success("Station deleted");
            setStations((prev) => prev.filter((s) => s.id !== id));
        } catch (error) {
            console.error(error);
            toast.error("Failed to delete station");
        } finally {
            setSavingId(null);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Stations</h1>
                    <p className="text-slate-500 text-sm">
                        Manage station master data used across routes and searches.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="icon" onClick={fetchStations} disabled={loading}>
                        <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                    </Button>
                    
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="bg-blue-600 hover:bg-blue-700">
                                <Plus className="w-4 h-4 mr-2" />
                                Add Station
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Add New Station</DialogTitle>
                                <DialogDescription>
                                    Create a new station record. Code must be unique.
                                </DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleCreate} className="space-y-4 pt-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Station Code</label>
                                        <Input
                                            placeholder="e.g. MAS"
                                            value={form.code ?? ""}
                                            onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Station Name</label>
                                        <Input
                                            placeholder="e.g. Chennai Central"
                                            value={form.name}
                                            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">City</label>
                                        <Input
                                            placeholder="e.g. Chennai"
                                            value={form.city ?? ""}
                                            onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">State</label>
                                        <Input
                                            placeholder="e.g. Tamil Nadu"
                                            value={form.state ?? ""}
                                            onChange={(e) => setForm((prev) => ({ ...prev, state: e.target.value }))}
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button type="submit" disabled={savingId === "new"}>
                                        {savingId === "new" && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                        Create Station
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3 border-b border-slate-50">
                    <CardTitle className="text-base flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-slate-500" />
                        Station List
                        <span className="ml-auto text-xs font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                            {stations.length} total
                        </span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-500 gap-3">
                            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                            <p className="text-sm">Loading stations...</p>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center py-12 text-red-500 gap-3">
                            <p className="font-bold">Error loading stations</p>
                            <p className="text-sm text-slate-600">{error}</p>
                            <Button variant="outline" onClick={fetchStations} className="mt-2">
                                Retry
                            </Button>
                        </div>
                    ) : stations.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
                            <MapPin className="w-12 h-12 opacity-20" />
                            <p className="text-sm italic">No stations found.</p>
                            <Button variant="link" onClick={() => setIsDialogOpen(true)}>
                                Create your first station
                            </Button>
                        </div>
                    ) : (
                        <div className="rounded-none border-0">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50 hover:bg-slate-50">
                                        <TableHead className="w-24 text-xs font-bold uppercase text-slate-500">Code</TableHead>
                                        <TableHead className="text-xs font-bold uppercase text-slate-500">Name</TableHead>
                                        <TableHead className="w-40 text-xs font-bold uppercase text-slate-500">City</TableHead>
                                        <TableHead className="w-40 text-xs font-bold uppercase text-slate-500">State</TableHead>
                                        <TableHead className="w-16 text-xs"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {stations.map((s) => (
                                        <TableRow key={s.id} className="hover:bg-blue-50/50 transition-colors group">
                                            <TableCell className="align-middle py-3">
                                                <Input
                                                    className="h-8 text-xs font-mono bg-transparent border-transparent hover:border-slate-200 focus:bg-white focus:border-blue-400 transition-all font-bold text-slate-700"
                                                    value={s.code ?? ""}
                                                    onChange={(e) =>
                                                        handleUpdate(s, {
                                                            code: e.target.value.toUpperCase(),
                                                        })
                                                    }
                                                />
                                            </TableCell>
                                            <TableCell className="align-middle py-3">
                                                <Input
                                                    className="h-8 text-sm bg-transparent border-transparent hover:border-slate-200 focus:bg-white focus:border-blue-400 transition-all font-medium"
                                                    value={s.name}
                                                    onChange={(e) =>
                                                        handleUpdate(s, { name: e.target.value })
                                                    }
                                                />
                                            </TableCell>
                                            <TableCell className="align-middle py-3">
                                                <Input
                                                    className="h-8 text-xs bg-transparent border-transparent hover:border-slate-200 focus:bg-white focus:border-blue-400 transition-all text-slate-600"
                                                    value={s.city ?? ""}
                                                    onChange={(e) =>
                                                        handleUpdate(s, { city: e.target.value })
                                                    }
                                                />
                                            </TableCell>
                                            <TableCell className="align-middle py-3">
                                                <Input
                                                    className="h-8 text-xs bg-transparent border-transparent hover:border-slate-200 focus:bg-white focus:border-blue-400 transition-all text-slate-600"
                                                    value={s.state ?? ""}
                                                    onChange={(e) =>
                                                        handleUpdate(s, { state: e.target.value })
                                                    }
                                                />
                                            </TableCell>
                                            <TableCell className="align-middle text-right py-3 pr-4">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-slate-300 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                                                    disabled={savingId === s.id}
                                                    onClick={() => handleDelete(s.id)}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

