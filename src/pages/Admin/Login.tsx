import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { API_BASE } from "@/lib/api";
import { Lock } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function AdminLogin() {
    const [identifier, setIdentifier] = useState(""); // Username or Email
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        
        try {
            const res = await fetch(`${API_BASE}/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ identifier, password })
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "Login failed");
                return;
            }

            if (data.user.role === 'admin') {
                localStorage.setItem("admin_token", "admin_session_valid");
                localStorage.setItem("user", JSON.stringify(data.user));
                navigate("/admin");
            } else if (data.user.role === 'tc') {
                localStorage.setItem("railseat_user", JSON.stringify(data.user));
                navigate("/tc-dashboard");
            } else {
                setError("Access denied: You do not have admin or TC privileges.");
            }

        } catch (err) {
            setError("Failed to connect to server");
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="bg-white max-w-md w-full rounded-2xl shadow-xl p-8 border border-slate-100">
                <div className="text-center mb-8">
                     <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                         <Lock className="w-8 h-8" />
                     </div>
                     <h1 className="text-2xl font-bold text-slate-900">Admin Login</h1>
                     <p className="text-slate-500 mt-2">Secure access for authorized personnel only</p>
                </div>
                
                <form onSubmit={handleLogin} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 uppercase tracking-wide">Username or Email</label>
                        <Input 
                            value={identifier} 
                            onChange={(e) => setIdentifier(e.target.value)} 
                            placeholder="Enter username or email" 
                            className="h-12 rounded-xl text-lg bg-slate-50 border-slate-200 focus:bg-white transition-all"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 uppercase tracking-wide">Password</label>
                        <Input 
                            type="password"
                            value={password} 
                            onChange={(e) => setPassword(e.target.value)} 
                            placeholder="Enter password" 
                            className="h-12 rounded-xl text-lg bg-slate-50 border-slate-200 focus:bg-white transition-all"
                        />
                    </div>
                    
                    {error && <p className="text-red-500 text-sm font-medium text-center bg-red-50 py-2 rounded-lg">{error}</p>}
                    
                    <Button type="submit" className="w-full h-14 rounded-xl bg-blue-600 hover:bg-blue-700 font-bold text-lg shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.02]">
                        Login to Dashboard
                    </Button>
                </form>
            </div>
        </div>
    );
}
