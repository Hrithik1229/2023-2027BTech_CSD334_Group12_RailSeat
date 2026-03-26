import GenTicketView from "@/components/GenTicketView";
import Navbar from "@/components/Navbar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  API_BASE,
  clearStoredUser,
  getMyBookings,
  getStoredUser,
  setStoredUser,
  updateUserProfile,
  type Booking,
} from "@/lib/api";
import { format, isAfter } from "date-fns";
import {
  AlertCircle,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  IndianRupee,
  LogOut,
  Ticket,
  Train,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

/** Returns true if every seated passenger is a GEN / unreserved booking */
const isGenBooking = (b: Booking) =>
  b.gen_ticket ||
  (b.passengers?.length > 0 &&
    b.passengers.every(
      (p: any) =>
        p.seat?.coach?.coach_type === "GEN" ||
        p.seat?.seat_number === 0 ||
        !p.seat
    ));

interface RefundPreview {
  totalAmount: number;
  refundAmount: number;
  cancellationCharge: number;
  hoursBeforeDeparture: number;
  policy: string;
  reason: string;
}

const PolicyBadge = ({ policy }: { policy: string }) => {
  if (policy === "no_refund")
    return <Badge variant="destructive" className="text-xs">No Refund</Badge>;
  if (policy === "flat_charge")
    return <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">Minimal Charge</Badge>;
  if (policy === "25_percent")
    return <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-xs">25% Charge</Badge>;
  return <Badge className="bg-orange-100 text-orange-800 border-orange-200 text-xs">50% Charge</Badge>;
};

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

  // ── Cancellation state ───────────────────────────────────────────────────
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancellingBooking, setCancellingBooking] = useState<Booking | null>(null);
  const [refundPreview, setRefundPreview] = useState<RefundPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const { toast } = useToast();

  const handleDownloadTicket = async (bookingId: number, pnr: string) => {
    if (downloadingId !== null) return;
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

  // ── Cancellation handlers ────────────────────────────────────────────────
  const handleCancelClick = async (booking: Booking) => {
    setCancellingBooking(booking);
    setRefundPreview(null);
    setCancelDialogOpen(true);
    setPreviewLoading(true);
    try {
      const res = await fetch(`${API_BASE}/bookings/${booking.booking_id}/cancel-preview`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to get refund estimate");
      setRefundPreview(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error fetching refund info";
      toast({ variant: "destructive", title: msg });
      setCancelDialogOpen(false);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancellingBooking) return;
    setCancelling(true);
    try {
      const res = await fetch(`${API_BASE}/bookings/${cancellingBooking.booking_id}/cancel`, {
        method: "PUT",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Cancellation failed");

      // Update local state immediately
      setBookings((prev) =>
        prev.map((b) =>
          b.booking_id === cancellingBooking.booking_id
            ? { ...b, booking_status: "cancelled", payment_status: data.refundAmount > 0 ? "refunded" : "no_refund" }
            : b
        )
      );

      toast({
        title: "Ticket Cancelled",
        description:
          data.refundAmount > 0
            ? `₹${data.refundAmount} will be refunded within 5–7 business days.`
            : "No refund applicable as per cancellation policy.",
      });
      setCancelDialogOpen(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Cancellation failed";
      toast({ variant: "destructive", title: msg });
    } finally {
      setCancelling(false);
      setCancellingBooking(null);
    }
  };

  const canCancelBooking = (b: Booking) => {
    if (b.booking_status === "cancelled") return false;
    if (isGenBooking(b)) return false;
    return true;
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
                <Button asChild><Link to="/login">Sign in</Link></Button>
                <Button variant="outline" asChild><Link to="/signup">Sign up</Link></Button>
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
                <Button variant="outline" size="sm" onClick={() => setEditMode(true)}>Edit</Button>
              )}
              <Button variant="destructive" size="sm" onClick={handleLogout} className="gap-1.5">
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
                  <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">New password (leave blank to keep current)</Label>
                  <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
                  <Button type="button" variant="ghost" onClick={() => { setEditMode(false); setUsername(user.username); setEmail(user.email); setPassword(""); }}>Cancel</Button>
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
                {bookings.map((b) =>
                  isGenBooking(b) ? (
                    <li key={b.booking_id}><GenTicketView booking={b} /></li>
                  ) : (
                    <li
                      key={b.booking_id}
                      className="flex flex-col gap-4 p-4 rounded-xl border border-border bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      {/* Top row */}
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
                          <p className="text-sm flex items-center gap-1.5">
                            <IndianRupee className="h-3.5 w-3" />
                            ₹{Number(b.total_amount).toFixed(2)}
                            <span className="mx-1">•</span>
                            <span className={`capitalize font-semibold ${
                              b.booking_status === "confirmed"
                                ? "text-green-600"
                                : b.booking_status === "cancelled"
                                ? "text-red-500"
                                : isAfter(new Date(), new Date(b.travel_date + "T23:59:59"))
                                ? "text-muted-foreground"
                                : "text-amber-500"
                            }`}>
                              {b.booking_status === "confirmed" && isAfter(new Date(), new Date(b.travel_date + "T23:59:59"))
                                ? "Completed"
                                : b.booking_status}
                            </span>
                            {b.booking_status === "cancelled" && b.payment_status === "refunded" && (
                              <span className="ml-1 text-xs text-green-600 font-normal flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" /> Refund initiated
                              </span>
                            )}
                            {b.booking_status === "cancelled" && b.payment_status === "no_refund" && (
                              <span className="ml-1 text-xs text-muted-foreground font-normal flex items-center gap-1">
                                <XCircle className="h-3 w-3" /> No refund
                              </span>
                            )}
                          </p>
                        </div>

                        {/* Action buttons */}
                        <div className="flex flex-col gap-2 shrink-0">
                          {/* Download button */}
                          {(b.payment_status === "paid" || b.booking_status === "confirmed") &&
                            b.is_downloadable !== false && (
                            <div className="dl-btn-container">
                              <label
                                className={`dl-btn-label${downloadingId === b.booking_id ? " dl-btn-checked" : ""}`}
                                onClick={() => handleDownloadTicket(b.booking_id, b.booking_number)}
                              >
                                <input type="checkbox" className="dl-btn-input" readOnly checked={downloadingId === b.booking_id} />
                                <span className="dl-btn-circle">
                                  <svg className="dl-btn-icon" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 19V5m0 14-4-4m4 4 4-4" />
                                  </svg>
                                  <div className="dl-btn-square"></div>
                                </span>
                                <p className="dl-btn-title">Download</p>
                                <p className="dl-btn-title">Done</p>
                              </label>
                            </div>
                          )}

                          {/* Cancel button */}
                          {canCancelBooking(b) && (
                            <Button
                              size="sm"
                              style={{ backgroundColor: "#dc2626", color: "#fff", borderColor: "transparent" }}
                              className="gap-1.5 hover:opacity-90 shadow-sm"
                              onClick={() => handleCancelClick(b)}
                            >
                              <XCircle className="h-4 w-4" />
                              Cancel Ticket
                            </Button>
                          )}
                        </div>
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
                                      COACH{" "}<span className="font-bold text-foreground">{p.seat.coach?.coach_number}</span>
                                      {" "}•{" "}SEAT{" "}<span className="font-bold text-foreground">{p.seat.seat_number}</span>
                                      {" "}•{" "}<span className="ml-1">{p.seat.berth_type}</span>
                                    </>
                                  ) : "Unassigned"}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </li>
                  )
                )}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Cancellation Confirmation Dialog ─────────────────────────────── */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              Cancel Ticket
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4 text-left">
                {cancellingBooking && (
                  <div className="text-sm text-foreground">
                    <span className="font-semibold">PNR {cancellingBooking.booking_number}</span>
                    {" — "}{cancellingBooking.source_station} → {cancellingBooking.destination_station}
                    <br />
                    <span className="text-muted-foreground">Travel: {format(new Date(cancellingBooking.travel_date), "PPP")}</span>
                  </div>
                )}

                {previewLoading && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                    <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                    Calculating refund…
                  </div>
                )}

                {refundPreview && !previewLoading && (
                  <div className="rounded-xl border border-border bg-muted/40 p-4 space-y-3">
                    {/* Policy badge */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Refund Policy</span>
                      <PolicyBadge policy={refundPreview.policy} />
                    </div>

                    {/* Rule explanation */}
                    <p className="text-xs text-muted-foreground leading-relaxed">{refundPreview.reason}</p>

                    {/* Breakdown */}
                    <div className="space-y-1.5 text-sm border-t border-border pt-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Ticket Amount</span>
                        <span className="font-medium">₹{refundPreview.totalAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-red-600">
                        <span>Cancellation Charge</span>
                        <span className="font-medium">− ₹{refundPreview.cancellationCharge.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-base border-t border-border pt-2 mt-1">
                        <span className={refundPreview.refundAmount > 0 ? "text-green-700" : "text-red-600"}>
                          {refundPreview.refundAmount > 0 ? "Refund Amount" : "Refund"}
                        </span>
                        <span className={refundPreview.refundAmount > 0 ? "text-green-700" : "text-red-600"}>
                          ₹{refundPreview.refundAmount.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* No-refund warning */}
                    {refundPreview.policy === "no_refund" && (
                      <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-800">
                        <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                        <p className="text-xs text-red-700 dark:text-red-400">
                          You will <strong>not receive any refund</strong> for this cancellation.
                        </p>
                      </div>
                    )}

                    {refundPreview.refundAmount > 0 && (
                      <p className="text-xs text-muted-foreground">
                        * Refund of ₹{refundPreview.refundAmount.toFixed(2)} will be credited to your original payment method within <strong>5–7 business days</strong>.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelling}>Keep Ticket</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmCancel}
              disabled={cancelling || previewLoading}
              style={{ backgroundColor: "#dc2626", color: "#fff", border: "none" }}
              className="font-semibold shadow-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {cancelling ? "Cancelling…" : "Confirm Cancellation"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Profile;
