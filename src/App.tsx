import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import ServerDown from "./components/ServerDown";
import Index from "./pages/Index";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import Profile from "./pages/Profile";
import SearchTrains from "./pages/SearchTrains";
import GenBooking from "./pages/GenBooking";
import SeatBooking from "./pages/SeatBooking";
import Signup from "./pages/Signup";
import TrainResults from "./pages/TrainResults";
import TCDashboard from "./pages/TCDashboard";

import { AdminLayout } from "./components/AdminLayout";
import AdminCoaches from "./pages/Admin/Coaches";
import AdminDashboard from "./pages/Admin/Dashboard";
import AdminFares from "./pages/Admin/Fares";
import AdminLogin from "./pages/Admin/Login";
import AdminRouteBuilder from "./pages/Admin/RouteBuilder";
import AdminRuns from "./pages/Admin/Runs";
import AdminStations from "./pages/Admin/Stations";
import AdminTrains from "./pages/Admin/Trains";
import AdminUsers from "./pages/Admin/Users";

import { API_BASE } from "./lib/api";

const queryClient = new QueryClient();

// ── Health-check wrapper ───────────────────────────────────────────────────────
function AppWithHealthCheck() {
  // null = still checking, true = up, false = down
  const [serverUp, setServerUp] = useState<boolean | null>(null);

  const checkServer = async () => {
    setServerUp(null);
    try {
      const res = await fetch(`${API_BASE}/health`, {
        signal: AbortSignal.timeout(5000),
      });
      setServerUp(res.ok);
    } catch {
      setServerUp(false);
    }
  };

  useEffect(() => {
    checkServer();
  }, []);

  // Checking — show a neutral full-screen loader so there's no flash
  if (serverUp === null) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex",
        flexDirection: "column", alignItems: "center", justifyContent: "center",
        gap: 16, background: "#f8fafc",
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: "50%",
          border: "4px solid #dbeafe", borderTopColor: "#144bb8",
          animation: "spin 0.8s linear infinite",
        }} />
        <p style={{ color: "#6b7280", fontFamily: "system-ui, sans-serif", fontSize: 15 }}>
          Connecting to RailSeat server…
        </p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Server down — show animated train scene
  if (serverUp === false) {
    return <ServerDown onRetry={checkServer} />;
  }

  // Server up — render the full app
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"                     element={<Index />} />
        <Route path="/login"                element={<Login />} />
        <Route path="/signup"               element={<Signup />} />
        <Route path="/book"                 element={<SearchTrains />} />
        <Route path="/trains/results"       element={<TrainResults />} />
        <Route path="/profile"              element={<Profile />} />
        <Route path="/seats"                element={<SeatBooking />} />
        <Route path="/gen-booking"           element={<GenBooking />} />
        <Route path="/tc-dashboard"          element={<TCDashboard />} />

        {/* Admin Routes */}
        <Route path="/admin/login"          element={<AdminLogin />} />
        <Route path="/admin"                element={<AdminLayout />}>
          <Route index                      element={<AdminDashboard />} />
          <Route path="trains"              element={<AdminTrains />} />
          <Route path="runs"                element={<AdminRuns />} />
          <Route path="runs/:id/route"      element={<AdminRouteBuilder />} />
          <Route path="stations"            element={<AdminStations />} />
          <Route path="users"               element={<AdminUsers />} />
          <Route path="fares"               element={<AdminFares />} />
          <Route path="coaches"             element={<AdminCoaches />} />
        </Route>

        {/* Catch-all */}
        <Route path="*"                     element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────
const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AppWithHealthCheck />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
