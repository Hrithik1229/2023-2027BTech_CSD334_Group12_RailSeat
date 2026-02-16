import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import Index from "./pages/Index";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import Profile from "./pages/Profile";
import SearchTrains from "./pages/SearchTrains";
import SeatBooking from "./pages/SeatBooking";
import Signup from "./pages/Signup";
import TrainResults from "./pages/TrainResults";

import { AdminLayout } from "./components/AdminLayout";
import AdminDashboard from "./pages/Admin/Dashboard";
import AdminLogin from "./pages/Admin/Login";
import AdminRouteBuilder from "./pages/Admin/RouteBuilder";
import AdminRuns from "./pages/Admin/Runs";
import AdminTrains from "./pages/Admin/Trains";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/book" element={<SearchTrains />} />
          <Route path="/trains/results" element={<TrainResults />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/seats" element={<SeatBooking />} />
          
          {/* Admin Routes */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminLayout />}>
             <Route index element={<AdminDashboard />} />
             <Route path="trains" element={<AdminTrains />} />
             <Route path="runs" element={<AdminRuns />} />
             <Route path="runs/:id/route" element={<AdminRouteBuilder />} />
          </Route>

          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
