import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { API_BASE } from "@/lib/api";
import { Shield, User2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface User {
    user_id: number;
    username: string;
    email: string;
    role: "user" | "admin";
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

    const toggleRole = async (user: User) => {
        const newRole = user.role === "admin" ? "user" : "admin";
        try {
            setUpdatingId(user.user_id);
            const res = await fetch(`${API_BASE}/admin/users/${user.user_id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ role: newRole }),
            });
            if (!res.ok) throw new Error("Failed to update role");
            toast.success(`Role updated to ${newRole}`);
            setUsers((prev) =>
                prev.map((u) =>
                    u.user_id === user.user_id
                        ? {
                              ...u,
                              role: newRole,
                          }
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

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Users</h1>
                    <p className="text-slate-500 text-sm">
                        View registered users and promote/demote admins.
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
                                        <TableHead className="w-32 text-xs">Actions</TableHead>
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
                                                {u.role === "admin" ? (
                                                    <Badge className="bg-amber-50 text-amber-700 border-amber-200">
                                                        <Shield className="w-3 h-3 mr-1" />
                                                        Admin
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="secondary">User</Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="align-middle">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-8 text-xs"
                                                    disabled={updatingId === u.user_id}
                                                    onClick={() => toggleRole(u)}
                                                >
                                                    {updatingId === u.user_id
                                                        ? "Updating..."
                                                        : u.role === "admin"
                                                        ? "Make User"
                                                        : "Make Admin"}
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

