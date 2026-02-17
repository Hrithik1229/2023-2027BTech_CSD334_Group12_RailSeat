import { Button } from "@/components/ui/button";
import { getStoredUser } from "@/lib/api";
import { cn } from "@/lib/utils";
import { LayoutDashboard, LayoutGrid, LogOut, Map, Route, Settings, TrainTrack, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

export function AdminLayout() {
    const navigate = useNavigate();
    const location = useLocation();
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem("admin_token");
        const user = getStoredUser();
        console.log("Admin Check:", { token, user });

        if (token || (user && (user.role === 'admin' || user.email === 'admin@gmail.com'))) {
             setIsAuthenticated(true);
        } else {
             navigate("/admin/login");
        }
    }, [navigate]);

    if (!isAuthenticated) return <div className="flex justify-center items-center h-screen">Checking access...</div>;

    const navItems = [
        { icon: LayoutDashboard, label: "Dashboard", path: "/admin" },
        { icon: TrainTrack, label: "Trains", path: "/admin/trains" },
        { icon: Route, label: "Runs", path: "/admin/runs" },
        { icon: Map, label: "Stations", path: "/admin/stations" },
        { icon: Users, label: "Users", path: "/admin/users" },
        { icon: Settings, label: "Fares", path: "/admin/fares" },
        { icon: LayoutGrid, label: "Coaches", path: "/admin/coaches" },
    ];

    return (
        <div className="flex min-h-screen bg-slate-50">
            {/* Sidebar */}
            <aside className="w-64 bg-white border-r border-slate-200 fixed h-full z-20 hidden md:flex flex-col">
                <div className="p-6 border-b border-slate-100">
                    <h2 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-2">
                         Admin Panel
                    </h2>
                </div>
                
                <nav className="flex-1 p-4 space-y-1">
                    {navItems.map((item) => (
                        <button
                            key={item.path}
                            onClick={() => navigate(item.path)}
                            className={cn(
                                "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all group",
                                location.pathname === item.path 
                                    ? "bg-blue-50 text-blue-700 shadow-sm" 
                                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                            )}
                        >
                            <item.icon className={cn("w-5 h-5", location.pathname === item.path ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600")} />
                            {item.label}
                        </button>
                    ))}
                </nav>

                <div className="p-4 border-t border-slate-100">
                    <Button 
                        variant="ghost" 
                        className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => {
                            // Clear all authentication data
                            localStorage.removeItem("admin_token");
                            localStorage.removeItem("user");
                            localStorage.removeItem("token");
                            // Redirect to index page
                            navigate("/");
                        }}
                    >
                        <LogOut className="w-4 h-4 mr-2" />
                        Logout
                    </Button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 md:ml-64 p-8 overflow-y-auto">
                <Outlet />
            </main>
        </div>
    );
}
