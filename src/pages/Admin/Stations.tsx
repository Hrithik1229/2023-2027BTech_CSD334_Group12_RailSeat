import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MapPin, Plus, Trash2 } from "lucide-react";
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
    const [savingId, setSavingId] = useState<number | "new" | null>(null);
    const [form, setForm] = useState<Omit<Station, "id">>({
        code: "",
        name: "",
        city: "",
        state: "",
    });

    const fetchStations = async () => {
        try {
            setLoading(true);
            const res = await fetch("http://localhost:3000/api/admin/stations");
            if (!res.ok) throw new Error("Failed to load stations");
            const data = await res.json();
            setStations(data);
        } catch (error) {
            console.error(error);
            toast.error("Failed to fetch stations");
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
            const res = await fetch("http://localhost:3000/api/admin/stations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });
            if (!res.ok) throw new Error("Failed to create station");
            toast.success("Station created");
            setForm({ code: "", name: "", city: "", state: "" });
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
            const res = await fetch(`http://localhost:3000/api/admin/stations/${station.id}`, {
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
        if (!confirm("Delete this station? This may affect routes that use it.")) return;
        try {
            setSavingId(id);
            const res = await fetch(`http://localhost:3000/api/admin/stations/${id}`, {
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
            </div>

            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-4">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Plus className="w-4 h-4 text-blue-600" />
                        Add Station
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <form
                        onSubmit={handleCreate}
                        className="grid gap-4 md:grid-cols-[0.9fr,1.5fr,1fr,1fr,auto]"
                    >
                        <div>
                            <label className="text-[11px] font-semibold uppercase text-slate-500 mb-1 block">
                                Code
                            </label>
                            <Input
                                placeholder="e.g. MAS"
                                value={form.code ?? ""}
                                onChange={(e) =>
                                    setForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))
                                }
                            />
                        </div>
                        <div>
                            <label className="text-[11px] font-semibold uppercase text-slate-500 mb-1 block">
                                Name
                            </label>
                            <Input
                                placeholder="e.g. MGR Chennai Central"
                                value={form.name}
                                onChange={(e) =>
                                    setForm((prev) => ({ ...prev, name: e.target.value }))
                                }
                            />
                        </div>
                        <div>
                            <label className="text-[11px] font-semibold uppercase text-slate-500 mb-1 block">
                                City
                            </label>
                            <Input
                                placeholder="City"
                                value={form.city ?? ""}
                                onChange={(e) =>
                                    setForm((prev) => ({ ...prev, city: e.target.value }))
                                }
                            />
                        </div>
                        <div>
                            <label className="text-[11px] font-semibold uppercase text-slate-500 mb-1 block">
                                State
                            </label>
                            <Input
                                placeholder="State"
                                value={form.state ?? ""}
                                onChange={(e) =>
                                    setForm((prev) => ({ ...prev, state: e.target.value }))
                                }
                            />
                        </div>
                        <div className="flex items-end">
                            <Button
                                type="submit"
                                className="w-full bg-blue-600 hover:bg-blue-700 rounded-xl"
                                disabled={savingId === "new"}
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                {savingId === "new" ? "Saving..." : "Save"}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-slate-500" />
                        Station List
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <p className="text-sm text-slate-500">Loading stations...</p>
                    ) : stations.length === 0 ? (
                        <p className="text-sm text-slate-400 italic">No stations defined yet.</p>
                    ) : (
                        <div className="rounded-md border border-slate-100 overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50/80">
                                        <TableHead className="w-24 text-xs">Code</TableHead>
                                        <TableHead className="text-xs">Name</TableHead>
                                        <TableHead className="w-40 text-xs">City</TableHead>
                                        <TableHead className="w-40 text-xs">State</TableHead>
                                        <TableHead className="w-20 text-xs"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {stations.map((s) => (
                                        <TableRow key={s.id}>
                                            <TableCell className="align-middle">
                                                <Input
                                                    className="h-8 text-xs"
                                                    value={s.code ?? ""}
                                                    onChange={(e) =>
                                                        handleUpdate(s, {
                                                            code: e.target.value.toUpperCase(),
                                                        })
                                                    }
                                                />
                                            </TableCell>
                                            <TableCell className="align-middle">
                                                <Input
                                                    className="h-8 text-xs"
                                                    value={s.name}
                                                    onChange={(e) =>
                                                        handleUpdate(s, { name: e.target.value })
                                                    }
                                                />
                                            </TableCell>
                                            <TableCell className="align-middle">
                                                <Input
                                                    className="h-8 text-xs"
                                                    value={s.city ?? ""}
                                                    onChange={(e) =>
                                                        handleUpdate(s, { city: e.target.value })
                                                    }
                                                />
                                            </TableCell>
                                            <TableCell className="align-middle">
                                                <Input
                                                    className="h-8 text-xs"
                                                    value={s.state ?? ""}
                                                    onChange={(e) =>
                                                        handleUpdate(s, { state: e.target.value })
                                                    }
                                                />
                                            </TableCell>
                                            <TableCell className="align-middle text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
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

