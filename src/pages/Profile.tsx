import GenTicketView from "@/components/GenTicketView";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { API_BASE, clearStoredUser, getMyBookings, getStoredUser, setStoredUser, updateUserProfile, type Booking } from "@/lib/api";
import { format, isAfter } from "date-fns";
import { Calendar, LogOut, Ticket, Train } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

/** Returns true if every seated passenger is a GEN / unreserved booking */
const isGenBooking = (b: Booking) =>
  b.gen_ticket || (b.passengers?.length > 0 &&
  b.passengers.every(
    (p: any) =>
      p.seat?.coach?.coach_type === "GEN" || p.seat?.seat_number === 0 || !p.seat
  ));

const Profile = () => {
  const user = getStoredUser();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [username, setUsername] = useState(user?.username ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const { toast } = useToast();

  const handleDownloadTicket = async (bookingId: number, pnr: string) => {
    if (downloadingId !== null) return; // already downloading
    setDownloadingId(bookingId);
    try {
      const res = await fetch(`${API_BASE}/bookings/${bookingId}/download-ticket`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Download failed");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `RailSeat_${pnr}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Download failed";
      toast({ variant: "destructive", title: msg });
    } finally {
      // Reset after the full animation completes (~4 s)
      setTimeout(() => setDownloadingId(null), 4000);
    }
  };

  const handleLogout = () => {
    clearStoredUser();
    navigate("/");
  };

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      try {
        const data = await getMyBookings(user.user_id);
        setBookings(data);
      } catch {
        toast({ variant: "destructive", title: "Failed to load bookings" });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.user_id]);

  useEffect(() => {
    if (user) {
      setUsername(user.username);
      setEmail(user.email);
    }
  }, [user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      const data: { username?: string; email?: string; password?: string } = { username, email };
      if (password.trim()) data.password = password;
      const { user: updated } = await updateUserProfile(user.user_id, data);
      setStoredUser(updated);
      setPassword("");
      setEditMode(false);
      toast({ title: "Profile updated" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Update failed";
      toast({ variant: "destructive", title: msg });
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center p-4 min-h-[60vh]">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Sign in required</CardTitle>
            <CardDescription>Please sign in to view your profile and bookings.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Button asChild>
                <Link to="/login">Sign in</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/signup">Sign up</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="font-display text-3xl font-bold text-foreground mb-8">Profile & Bookings</h1>

        {/* User info card */}
        <Card className="mb-8">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Your info</CardTitle>
              <CardDescription>Update your username and email</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {!editMode && (
                <Button variant="outline" size="sm" onClick={() => setEditMode(true)}>
                  Edit
                </Button>
              )}
              <Button
                variant="destructive"
                size="sm"
                onClick={handleLogout}
                className="gap-1.5"
              >
                <LogOut className="h-4 w-4" />
                Log out
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {editMode ? (
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">New password (leave blank to keep current)</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" disabled={saving}>
                    {saving ? "Saving…" : "Save"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setEditMode(false);
                      setUsername(user.username);
                      setEmail(user.email);
                      setPassword("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-2 text-sm">
                <p><span className="text-muted-foreground">Username:</span> {user.username}</p>
                <p><span className="text-muted-foreground">Email:</span> {user.email}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bookings list */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ticket className="h-5 w-5" />
              My Bookings
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground text-sm">Loading bookings…</p>
            ) : bookings.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No bookings yet.{" "}
                <Link to="/book" className="text-primary hover:underline">Book a train</Link>.
              </p>
            ) : (
              <ul className="space-y-4">
                {bookings.map((b) => isGenBooking(b) ? (
                  <li key={b.booking_id}>
                    <GenTicketView booking={b} />
                  </li>
                ) : (
                  <li
                    key={b.booking_id}
                    className="flex flex-col gap-4 p-4 rounded-xl border border-border bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    {/* Top row: summary + download button */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="space-y-1">
                        <p className="font-semibold flex items-center gap-2">
                          <Ticket className="h-4 w-4 text-primary" />
                          PNR: {b.booking_number}
                        </p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Train className="h-3.5 w-3" />
                          {b.train?.train_name ?? "Train"} • {b.source_station} → {b.destination_station}
                        </p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3.5 w-3" />
                          {format(new Date(b.travel_date), "PPP")}
                        </p>
                        <p className="text-sm">
                          Amount: ₹{Number(b.total_amount).toFixed(2)} •{" "}
                            <span
                              className={`capitalize font-semibold ${
                                b.booking_status === "confirmed"
                                  ? "text-green-600"
                                  : b.booking_status === "cancelled"
                                  ? "text-red-500"
                                  : (isAfter(new Date(), new Date(b.travel_date + "T23:59:59")) 
                                      ? "text-muted-foreground" 
                                      : "text-amber-500")
                              }`}
                            >
                              {b.booking_status === "confirmed" && isAfter(new Date(), new Date(b.travel_date + "T23:59:59")) 
                                ? "Completed" 
                                : b.booking_status}
                            </span>
                          </p>
                        </div>

                        {/* Download button — only for confirmed + paid bookings (and not GEN digital-only) */}
                        {(b.payment_status === "paid" || b.booking_status === "confirmed") && b.is_downloadable !== false && (
                          <div className="dl-btn-container">
                          <label
                            className={`dl-btn-label${
                              downloadingId === b.booking_id ? " dl-btn-checked" : ""
                            }`}
                            onClick={() => handleDownloadTicket(b.booking_id, b.booking_number)}
                          >
                            <input type="checkbox" className="dl-btn-input" readOnly checked={downloadingId === b.booking_id} />
                            <span className="dl-btn-circle">
                              <svg
                                className="dl-btn-icon"
                                aria-hidden="true"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  stroke="currentColor"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="1.5"
                                  d="M12 19V5m0 14-4-4m4 4 4-4"
                                />
                              </svg>
                              <div className="dl-btn-square"></div>
                            </span>
                            <p className="dl-btn-title">Download</p>
                            <p className="dl-btn-title">Done</p>
                          </label>
                        </div>
                      )}
                    </div>

                    {/* Passenger details */}
                    {b.passengers && b.passengers.length > 0 && (
                      <div className="pt-3 border-t border-border">
                        <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Passenger Details</p>
                        <div className="grid gap-2">
                          {b.passengers.map((p: any, idx: number) => (
                            <div key={idx} className="flex flex-wrap justify-between items-center text-sm bg-background/50 p-2 rounded border border-border/50">
                              <span className="font-medium">{p.passenger_name} <span className="text-muted-foreground text-xs">({p.passenger_gender})</span></span>
                                <span className="text-muted-foreground font-mono text-xs">
                                  {p.seat ? (
                                    <>
                                      COACH{" "}
                                      <span className="font-bold text-foreground">{p.seat.coach?.coach_number}</span>
                                      {" "}•{" "}
                                      SEAT{" "}
                                      <span className="font-bold text-foreground">{p.seat.seat_number}</span>
                                      {" "}•{" "}
                                      <span className="ml-1">{p.seat.berth_type}</span>
                                    </>
                                  ) : (
                                    "Unassigned"
                                  )}
                                </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;
