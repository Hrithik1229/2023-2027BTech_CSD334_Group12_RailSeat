import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { API_BASE } from "@/lib/api";
import { ClipboardCheck, Shield, User2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface User {
    user_id: number;
    username: string;
    email: string;
    role: "user" | "admin" | "tc";
    createdAt?: string;
}

export default function AdminUsers() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState<number | null>(null);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const res = await fetch(`${API_BASE}/admin/users`);
            if (!res.ok) throw new Error("Failed to load users");
            const data = await res.json();
            setUsers(data);
        } catch (error) {
            console.error(error);
            toast.error("Failed to fetch users");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const changeRole = async (user: User, newRole: "user" | "admin" | "tc") => {
        if (newRole === user.role) return;
        try {
            setUpdatingId(user.user_id);
            const res = await fetch(`${API_BASE}/admin/users/${user.user_id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ role: newRole }),
            });
            if (!res.ok) throw new Error("Failed to update role");
            toast.success(`Role updated to ${newRole.toUpperCase()}`);
            setUsers((prev) =>
                prev.map((u) =>
                    u.user_id === user.user_id
                        ? { ...u, role: newRole }
                        : u,
                ),
            );
        } catch (error) {
            console.error(error);
            toast.error("Failed to update user role");
        } finally {
            setUpdatingId(null);
        }
    };

    const getRoleBadge = (role: string) => {
        switch (role) {
            case "admin":
                return (
                    <Badge className="bg-amber-50 text-amber-700 border-amber-200">
                        <Shield className="w-3 h-3 mr-1" />
                        Admin
                    </Badge>
                );
            case "tc":
                return (
                    <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
                        <ClipboardCheck className="w-3 h-3 mr-1" />
                        TC
                    </Badge>
                );
            default:
                return <Badge variant="secondary">User</Badge>;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Users</h1>
                    <p className="text-slate-500 text-sm">
                        View registered users and manage roles (Admin, TC, User).
                    </p>
                </div>
            </div>

            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <User2 className="w-4 h-4 text-slate-500" />
                        User List
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <p className="text-sm text-slate-500">Loading users...</p>
                    ) : users.length === 0 ? (
                        <p className="text-sm text-slate-400 italic">
                            No users found yet. New signups will appear here.
                        </p>
                    ) : (
                        <div className="rounded-md border border-slate-100 overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50/80">
                                        <TableHead className="text-xs">Username</TableHead>
                                        <TableHead className="text-xs">Email</TableHead>
                                        <TableHead className="w-32 text-xs">Role</TableHead>
                                        <TableHead className="w-44 text-xs">Change Role</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {users.map((u) => (
                                        <TableRow key={u.user_id}>
                                            <TableCell className="align-middle text-sm font-medium">
                                                {u.username}
                                            </TableCell>
                                            <TableCell className="align-middle text-xs text-slate-600">
                                                {u.email}
                                            </TableCell>
                                            <TableCell className="align-middle">
                                                {getRoleBadge(u.role)}
                                            </TableCell>
                                            <TableCell className="align-middle">
                                                <Select
                                                    value={u.role}
                                                    onValueChange={(val: "user" | "admin" | "tc") =>
                                                        changeRole(u, val)
                                                    }
                                                    disabled={updatingId === u.user_id}
                                                >
                                                    <SelectTrigger className="h-8 w-36 text-xs">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="user">User</SelectItem>
                                                        <SelectItem value="admin">Admin</SelectItem>
                                                        <SelectItem value="tc">Ticket Checker</SelectItem>
                                                    </SelectContent>
                                                </Select>
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
