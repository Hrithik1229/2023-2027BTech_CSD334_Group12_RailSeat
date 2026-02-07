import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getMyBookings, getStoredUser, setStoredUser, updateUserProfile, type Booking } from "@/lib/api";
import { format } from "date-fns";
import { Calendar, Ticket, Train } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const Profile = () => {
  const user = getStoredUser();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [username, setUsername] = useState(user?.username ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

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
            {!editMode && (
              <Button variant="outline" size="sm" onClick={() => setEditMode(true)}>
                Edit
              </Button>
            )}
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
            <CardDescription>Bookings linked to your account (by user_id)</CardDescription>
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
                {bookings.map((b) => (
                  <li
                    key={b.booking_id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg border border-border bg-muted/30"
                  >
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
                        Amount: ₹{Number(b.total_amount).toFixed(2)} • Status:{" "}
                        <span className="capitalize">{b.booking_status}</span>
                      </p>
                    </div>
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
