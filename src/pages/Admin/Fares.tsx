import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Coins, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type CoachType = "1A" | "2A" | "3A" | "SL" | "CC" | "2S";

interface FareRule {
    id: number;
    train_type: string;
    coach_type: CoachType;
    base_fare: string;
    per_km_rate: string;
    reservation_charge: string;
}

export default function AdminFares() {
    const [rules, setRules] = useState<FareRule[]>([]);
    const [loading, setLoading] = useState(true);
    const [savingId, setSavingId] = useState<number | "new" | null>(null);
    const [form, setForm] = useState<Omit<FareRule, "id">>({
        train_type: "EXPRESS",
        coach_type: "SL",
        base_fare: "0",
        per_km_rate: "0.5",
        reservation_charge: "0",
    });

    const fetchRules = async () => {
        try {
            setLoading(true);
            const res = await fetch("http://localhost:3000/api/admin/fares");
            if (!res.ok) throw new Error("Failed to load fare rules");
            const data = await res.json();
            setRules(data);
        } catch (error) {
            console.error(error);
            toast.error("Failed to fetch fare rules");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRules();
    }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setSavingId("new");
            const res = await fetch("http://localhost:3000/api/admin/fares", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });
            if (!res.ok) throw new Error("Failed to create fare rule");
            toast.success("Fare rule created");
            setForm({
                train_type: "EXPRESS",
                coach_type: "SL",
                base_fare: "0",
                per_km_rate: "0.5",
                reservation_charge: "0",
            });
            await fetchRules();
        } catch (error) {
            console.error(error);
            toast.error("Failed to create fare rule");
        } finally {
            setSavingId(null);
        }
    };

    const handleUpdate = async (rule: FareRule, patch: Partial<FareRule>) => {
        const updated = { ...rule, ...patch };
        setRules((prev) => prev.map((r) => (r.id === rule.id ? updated : r)));
        try {
            setSavingId(rule.id);
            const res = await fetch(`http://localhost:3000/api/admin/fares/${rule.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    train_type: updated.train_type,
                    coach_type: updated.coach_type,
                    base_fare: updated.base_fare,
                    per_km_rate: updated.per_km_rate,
                    reservation_charge: updated.reservation_charge,
                }),
            });
            if (!res.ok) throw new Error("Failed to update fare rule");
            toast.success("Fare rule updated");
        } catch (error) {
            console.error(error);
            toast.error("Failed to update fare rule");
            fetchRules();
        } finally {
            setSavingId(null);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Delete this fare rule?")) return;
        try {
            setSavingId(id);
            const res = await fetch(`http://localhost:3000/api/admin/fares/${id}`, {
                method: "DELETE",
            });
            if (!res.ok && res.status !== 204) throw new Error("Failed to delete fare rule");
            toast.success("Fare rule deleted");
            setRules((prev) => prev.filter((r) => r.id !== id));
        } catch (error) {
            console.error(error);
            toast.error("Failed to delete fare rule");
        } finally {
            setSavingId(null);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Fare Rules</h1>
                    <p className="text-slate-500 text-sm">
                        Configure base fares and per-km rates per train and coach type.
                    </p>
                </div>
            </div>

            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-4">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Plus className="w-4 h-4 text-blue-600" />
                        Add Fare Rule
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <form
                        onSubmit={handleCreate}
                        className="grid gap-4 md:grid-cols-[1.1fr,0.9fr,0.8fr,0.8fr,0.9fr,auto]"
                    >
                        <div>
                            <label className="text-[11px] font-semibold uppercase text-slate-500 mb-1 block">
                                Train Type
                            </label>
                            <Select
                                value={form.train_type}
                                onValueChange={(v) =>
                                    setForm((prev) => ({
                                        ...prev,
                                        train_type: v,
                                    }))
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="EXPRESS">EXPRESS</SelectItem>
                                    <SelectItem value="SUPERFAST">SUPERFAST</SelectItem>
                                    <SelectItem value="LOCAL">LOCAL</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="text-[11px] font-semibold uppercase text-slate-500 mb-1 block">
                                Coach Type
                            </label>
                            <Select
                                value={form.coach_type}
                                onValueChange={(v: CoachType) =>
                                    setForm((prev) => ({
                                        ...prev,
                                        coach_type: v,
                                    }))
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="1A">1A</SelectItem>
                                    <SelectItem value="2A">2A</SelectItem>
                                    <SelectItem value="3A">3A</SelectItem>
                                    <SelectItem value="SL">SL</SelectItem>
                                    <SelectItem value="CC">CC</SelectItem>
                                    <SelectItem value="2S">2S</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="text-[11px] font-semibold uppercase text-slate-500 mb-1 block">
                                Base Fare
                            </label>
                            <Input
                                type="number"
                                min={0}
                                step="0.5"
                                value={form.base_fare}
                                onChange={(e) =>
                                    setForm((prev) => ({
                                        ...prev,
                                        base_fare: e.target.value,
                                    }))
                                }
                            />
                        </div>
                        <div>
                            <label className="text-[11px] font-semibold uppercase text-slate-500 mb-1 block">
                                Per km Rate
                            </label>
                            <Input
                                type="number"
                                min={0}
                                step="0.1"
                                value={form.per_km_rate}
                                onChange={(e) =>
                                    setForm((prev) => ({
                                        ...prev,
                                        per_km_rate: e.target.value,
                                    }))
                                }
                            />
                        </div>
                        <div>
                            <label className="text-[11px] font-semibold uppercase text-slate-500 mb-1 block">
                                Reservation Charge
                            </label>
                            <Input
                                type="number"
                                min={0}
                                step="0.5"
                                value={form.reservation_charge}
                                onChange={(e) =>
                                    setForm((prev) => ({
                                        ...prev,
                                        reservation_charge: e.target.value,
                                    }))
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
                        <Coins className="w-4 h-4 text-slate-500" />
                        Fare Rules
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <p className="text-sm text-slate-500">Loading fare rules...</p>
                    ) : rules.length === 0 ? (
                        <p className="text-sm text-slate-400 italic">
                            No fare rules configured yet.
                        </p>
                    ) : (
                        <div className="rounded-md border border-slate-100 overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50/80">
                                        <TableHead className="text-xs">Train Type</TableHead>
                                        <TableHead className="text-xs">Coach Type</TableHead>
                                        <TableHead className="text-xs">Base Fare</TableHead>
                                        <TableHead className="text-xs">Per km Rate</TableHead>
                                        <TableHead className="text-xs">
                                            Reservation Charge
                                        </TableHead>
                                        <TableHead className="w-16 text-xs" />
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {rules.map((r) => (
                                        <TableRow key={r.id}>
                                            <TableCell>
                                                <Input
                                                    className="h-8 text-xs"
                                                    value={r.train_type}
                                                    onChange={(e) =>
                                                        handleUpdate(r, {
                                                            train_type: e.target.value,
                                                        })
                                                    }
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Select
                                                    value={r.coach_type}
                                                    onValueChange={(v: CoachType) =>
                                                        handleUpdate(r, { coach_type: v })
                                                    }
                                                >
                                                    <SelectTrigger className="h-8 text-xs">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="1A">1A</SelectItem>
                                                        <SelectItem value="2A">2A</SelectItem>
                                                        <SelectItem value="3A">3A</SelectItem>
                                                        <SelectItem value="SL">SL</SelectItem>
                                                        <SelectItem value="CC">CC</SelectItem>
                                                        <SelectItem value="2S">2S</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                            <TableCell>
                                                <Input
                                                    className="h-8 text-xs"
                                                    type="number"
                                                    value={r.base_fare}
                                                    onChange={(e) =>
                                                        handleUpdate(r, {
                                                            base_fare: e.target.value,
                                                        })
                                                    }
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Input
                                                    className="h-8 text-xs"
                                                    type="number"
                                                    value={r.per_km_rate}
                                                    onChange={(e) =>
                                                        handleUpdate(r, {
                                                            per_km_rate: e.target.value,
                                                        })
                                                    }
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Input
                                                    className="h-8 text-xs"
                                                    type="number"
                                                    value={r.reservation_charge}
                                                    onChange={(e) =>
                                                        handleUpdate(r, {
                                                            reservation_charge: e.target.value,
                                                        })
                                                    }
                                                />
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
                                                    disabled={savingId === r.id}
                                                    onClick={() => handleDelete(r.id)}
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

