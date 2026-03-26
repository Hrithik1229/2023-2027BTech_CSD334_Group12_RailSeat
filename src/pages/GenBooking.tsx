import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { API_BASE, getStoredUser } from '@/lib/api';
import { cn } from '@/lib/utils';
import {
    ArrowLeft,
    ArrowRight,
    CalendarDays,
    Info,
    MapPin,
    Minus,
    Plus,
    Train,
    Users,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

declare global {
    interface Window {
        Razorpay: new (o: Record<string, unknown>) => { open: () => void; on: (e: string, h: (r: Record<string, unknown>) => void) => void };
    }
}

interface PassengerCounts { adults: number; children: number; }

const GenBooking = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const {
        trainId,
        trainName,
        trainNumber,
        source, destination, date, isoDate,
        distance,
    } = location.state || {};

    const [counts, setCounts] = useState<PassengerCounts>({ adults: 1, children: 0 });
    const [trainCategory, setTrainCategory] = useState<'MAIL/EXP' | 'SUPERFAST' | 'ORDINARY'>('MAIL/EXP');
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [genInfo, setGenInfo] = useState<{
        totalCapacity: number;
        remaining: number;
        canBook: boolean;
        sentinelSeatId: number | null;
        genCoaches: { coach_number: string; sentinelSeatId: number | null }[];
    } | null>(null);

    const [farePerPax, setFarePerPax] = useState(0);

    const totalPassengers = counts.adults + counts.children;

    // ── Fetch GEN availability + fare on mount or when train type / passenger count changes ──
    useEffect(() => {
        if (!trainId || !isoDate) { navigate('/book'); return; }

        const init = async () => {
            setIsLoading(true);
            try {
                const avRes = await fetch(`${API_BASE}/trains/${trainId}/gen-availability?date=${isoDate}&passengerCount=${totalPassengers}`);
                if (!avRes.ok) {
                    const e = await avRes.json();
                    toast.error(e.error || 'No General coaches available for this train.');
                    navigate(-1);
                    return;
                }
                const avData = await avRes.json();
                setGenInfo({
                    totalCapacity: avData.totalCapacity,
                    remaining: avData.remaining,
                    canBook: !!avData.canBook,
                    sentinelSeatId: avData.genCoaches?.[0]?.sentinelSeatId ?? null,
                    genCoaches: (avData.genCoaches ?? []).map((c: { coach_number: string; sentinelSeatId?: number | null }) => ({
                        coach_number: c.coach_number,
                        sentinelSeatId: c.sentinelSeatId ?? null,
                    })),
                });

                const backendTrainType = trainCategory === 'SUPERFAST' ? 'SUPERFAST' : trainCategory === 'MAIL/EXP' ? 'EXPRESS' : 'LOCAL';
                const fareRes = await fetch(`${API_BASE}/trains/fare`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        distance: distance || 100,
                        trainType: backendTrainType,
                        coachType: 'GEN',
                        berthTypes: ['LB'],
                    }),
                });
                if (fareRes.ok) {
                    const fareData = await fareRes.json();
                    setFarePerPax(fareData['LB'] || fareData[Object.keys(fareData)[0]] || 50);
                } else {
                    setFarePerPax(50);
                }
            } catch (err) {
                console.error(err);
                toast.error('Failed to load General coach info.');
                navigate(-1);
            } finally {
                setIsLoading(false);
            }
        };
        init();
    }, [trainId, isoDate, distance, navigate, trainCategory, totalPassengers]);

    const handleCountChange = (type: 'adults' | 'children', delta: number) => {
        setCounts(prev => {
            const nextVal = Math.max(type === 'adults' ? 1 : 0, prev[type] + delta);
            const totalNext = (type === 'adults' ? nextVal : prev.adults) + (type === 'children' ? nextVal : prev.children);

            if (totalNext > 4) {
                toast.error('Maximum 4 passengers allowed per ticket.');
                return prev;
            }
            return { ...prev, [type]: nextVal };
        });
    };

    const totalFare = (farePerPax * counts.adults) + ((farePerPax / 2) * counts.children);

    const handlePay = async () => {
        const user = getStoredUser();
        if (!user) { toast.error('Please login first'); navigate('/login'); return; }

        if (!trainId) {
            toast.error('Missing train information. Please go back and select a train again.');
            return;
        }
        if (!isoDate) {
            toast.error('Missing travel date. Please go back and select a date.');
            return;
        }
        const safeTotal = Math.max(totalFare, 1);

        setIsSubmitting(true);
        try {
            const orderRes = await fetch(`${API_BASE}/payments/create-gen-order`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    totalAmount: safeTotal,
                    trainId,
                    travelDate: isoDate,
                    passengerCount: totalPassengers,
                    validityHours: 3,
                }),
            });
            if (!orderRes.ok) {
                const e = await orderRes.json();
                throw new Error(e.error || 'Failed to create payment order.');
            }
            const order = await orderRes.json();
            setIsSubmitting(false);

            // Mock payment: skip Razorpay UI, directly verify on backend
            if (order?.provider === "mock" || order?.key_id === "mock") {
                const verifyRes = await fetch(`${API_BASE}/payments/verify-gen-payment`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        contactName: user.username || "Unreserved Passenger",
                        email: user.email,
                        userId: user.user_id,
                        trainId,
                        sourceStation: source,
                        destinationStation: destination,
                        travelDate: isoDate,
                        passengers: Array.from({ length: totalPassengers }).map((_, i) => ({
                            name: i < counts.adults ? "Adult" : "Child",
                            gender: "other",
                        })),
                        totalAmount: safeTotal,
                        sentinelSeatId: genInfo?.sentinelSeatId,
                    }),
                });
                const data = await verifyRes.json();
                if (!verifyRes.ok || !data.verified) throw new Error(data.error || "Mock payment verification failed.");

                toast.success("🎉 Booking Confirmed!", {
                    description: (
                        <div className="flex flex-col gap-1">
                            <span className="font-semibold">PNR: {data.booking.booking_number}</span>
                            <span>Amount Paid: ₹{totalFare}</span>
                            <span className="text-xs text-muted-foreground">Payment: Mock • Valid 3 hrs</span>
                        </div>
                    ),
                    duration: 8000,
                });
                navigate("/profile");
                return;
            }

            if (!window.Razorpay) {
                await new Promise<void>((res, rej) => {
                    const s = document.createElement('script');
                    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
                    s.onload = () => res();
                    s.onerror = () => rej(new Error('Failed to load Razorpay'));
                    document.body.appendChild(s);
                });
            }

            const rzp = new window.Razorpay({
                key: order.key_id,
                amount: order.amount,
                currency: order.currency || 'INR',
                name: 'RailSeat',
                description: `Unreserved Journey – ${trainCategory}`,
                ...(window.location.hostname !== 'localhost' && { image: `${window.location.origin}/logo%20(2).png` }),
                order_id: order.order_id,
                prefill: { name: user.username || 'Passenger', email: user.email || '' },
                theme: { color: '#4F46E5' },
                handler: async (response: Record<string, string>) => {
                    setIsSubmitting(true);
                    try {
                        const verifyRes = await fetch(`${API_BASE}/payments/verify-gen-payment`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature,
                                contactName: user.username || 'Unreserved Passenger',
                                email: user.email,
                                userId: user.user_id,
                                trainId,
                                sourceStation: source,
                                destinationStation: destination,
                                travelDate: isoDate,
                                passengers: Array.from({ length: totalPassengers }).map((_, i) => ({
                                    name: i < counts.adults ? 'Adult' : 'Child',
                                    gender: 'other' // DB enum supports male, female, other
                                })),
                                totalAmount: safeTotal,
                                sentinelSeatId: genInfo?.sentinelSeatId,
                            }),
                        });
                        const data = await verifyRes.json();
                        if (!verifyRes.ok || !data.verified) throw new Error(data.error || 'Payment verification failed.');

                        toast.success('🎉 Booking Confirmed!', {
                            description: (
                                <div className="flex flex-col gap-1">
                                    <span className="font-semibold">PNR: {data.booking.booking_number}</span>
                                    <span>Amount Paid: ₹{totalFare}</span>
                                    <span className="text-xs text-muted-foreground">General (Unreserved) Coach • Valid 3 hrs</span>
                                </div>
                            ),
                            duration: 8000,
                        });
                        navigate('/profile');
                    } catch (err: unknown) {
                        toast.error(`Verification failed: ${err instanceof Error ? err.message : "Unknown error"}`);
                    } finally {
                        setIsSubmitting(false);
                    }
                },
            });

            rzp.on('payment.failed', () => {
                toast.error('Payment failed. Please try again.');
                setIsSubmitting(false);
            });

            rzp.open();
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "An error occurred");
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
            </div>
        );
    }

    // Minimum fares per train category (shown on selector buttons)
    // Superfast > Mail/Exp > Ordinary — based on Indian Railways GEN fare structure
    const MIN_FARES: Record<'MAIL/EXP' | 'SUPERFAST' | 'ORDINARY', number> = {
        'ORDINARY':  Math.round(50  + ((distance || 100) - 50)  * 0.30),
        'MAIL/EXP':  Math.round(50  + ((distance || 100) - 50)  * 0.35),
        'SUPERFAST': Math.round(50  + ((distance || 100) - 50)  * 0.40 + 10), // +superfast surcharge
    };

    return (
        <div className="min-h-screen bg-background">
            <Navbar
                extraNav={
                    <Button variant="ghost" onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back
                    </Button>
                }
            />

            {/* Journey Header — matches SeatBooking gradient style */}
            <div className="bg-gradient-to-r from-slate-900 via-primary to-blue-800 text-white shadow-2xl relative overflow-hidden">
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-0 left-1/4 w-64 h-64 rounded-full bg-white blur-3xl" />
                    <div className="absolute bottom-0 right-1/4 w-48 h-48 rounded-full bg-blue-300 blur-3xl" />
                </div>
                <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

                <div className="container mx-auto px-6 py-5 relative z-10">
                    <div className="flex flex-wrap items-center justify-between gap-6">
                        {/* Train info */}
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white/10 rounded-xl backdrop-blur-sm border border-white/10">
                                    <Train className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold tracking-tight text-white leading-none">
                                        {trainName || 'General Coach Booking'}
                                    </h1>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        {trainNumber && <span className="text-xs text-blue-200 font-medium">#{trainNumber}</span>}
                                        <span className="text-xs bg-amber-400/20 text-amber-200 border border-amber-400/30 px-2 py-0.5 rounded-full font-semibold">
                                            GEN · Unreserved
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 ml-1">
                                <CalendarDays className="w-3.5 h-3.5 text-blue-300" />
                                <span className="text-sm text-blue-100 font-medium">{date}</span>
                            </div>
                        </div>

                        {/* Route display */}
                        <div className="flex items-center gap-4 bg-white/10 px-6 py-4 rounded-2xl backdrop-blur-sm border border-white/15 shadow-inner">
                            <div className="flex flex-col items-center">
                                <MapPin className="w-4 h-4 text-blue-300 mb-1" />
                                <span className="text-[10px] text-blue-300 uppercase tracking-widest font-semibold">From</span>
                                <span className="font-bold text-lg text-white mt-0.5">{source}</span>
                            </div>
                            <div className="flex flex-col items-center gap-1 px-2">
                                <div className="flex items-center gap-1">
                                    <div className="w-2 h-2 rounded-full bg-white/60" />
                                    <div className="w-12 h-0.5 bg-gradient-to-r from-white/40 via-white/80 to-white/40" />
                                    <ArrowRight className="w-4 h-4 text-white" />
                                    <div className="w-12 h-0.5 bg-gradient-to-r from-white/40 via-white/80 to-white/40" />
                                    <div className="w-2 h-2 rounded-full bg-white/60" />
                                </div>
                                <span className="text-[9px] text-white/40 uppercase tracking-widest">Journey</span>
                            </div>
                            <div className="flex flex-col items-center">
                                <MapPin className="w-4 h-4 text-emerald-300 mb-1" />
                                <span className="text-[10px] text-blue-300 uppercase tracking-widest font-semibold">To</span>
                                <span className="font-bold text-lg text-white mt-0.5">{destination}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main content */}
            <main className="container mx-auto px-4 py-8 max-w-5xl">
                <div className="grid lg:grid-cols-3 gap-8">

                    {/* ── Left panel: config ── */}
                    <div className="lg:col-span-2 space-y-5">


                        {/* Train Type selector */}
                        <div className="bg-card rounded-2xl border border-border shadow-sm p-5">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Train Type</p>
                            <div className="grid grid-cols-3 gap-2">
                                {(['ORDINARY', 'MAIL/EXP', 'SUPERFAST'] as const).map(type => (
                                    <button
                                        key={type}
                                        onClick={() => setTrainCategory(type)}
                                        className={cn(
                                            "py-3 px-3 rounded-xl text-sm font-semibold border transition-all flex flex-col items-center gap-0.5",
                                            trainCategory === type
                                                ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20"
                                                : "bg-background border-border text-muted-foreground hover:border-primary/40 hover:bg-primary/5"
                                        )}
                                    >
                                        <span>{type}</span>
                                        <span className={cn(
                                            "text-xs font-normal",
                                            trainCategory === type ? "text-primary-foreground/70" : "text-muted-foreground/70"
                                        )}>
                                            from ₹{MIN_FARES[type]}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Passenger count */}
                        <div className="bg-card rounded-2xl border border-border shadow-sm p-5">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Passengers</p>
                            <div className="space-y-4">
                                {/* Adults */}
                                <div className="flex items-center justify-between py-1">
                                    <div>
                                        <p className="font-semibold text-foreground">Adult</p>
                                        <p className="text-xs text-muted-foreground">Full fare · ₹{farePerPax.toFixed(0)} per pax</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => handleCountChange('adults', -1)}
                                            disabled={counts.adults <= 1}
                                            className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-primary disabled:text-muted-foreground disabled:border-muted transition-colors hover:bg-primary/5"
                                        >
                                            <Minus className="w-4 h-4" strokeWidth={2.5} />
                                        </button>
                                        <span className="w-8 text-center text-lg font-bold text-foreground tabular-nums">{counts.adults}</span>
                                        <button
                                            onClick={() => handleCountChange('adults', 1)}
                                            disabled={totalPassengers >= 4}
                                            className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-primary disabled:text-muted-foreground disabled:border-muted transition-colors hover:bg-primary/5"
                                        >
                                            <Plus className="w-4 h-4" strokeWidth={2.5} />
                                        </button>
                                    </div>
                                </div>

                                <div className="border-t border-border" />

                                {/* Children */}
                                <div className="flex items-center justify-between py-1">
                                    <div>
                                        <p className="font-semibold text-foreground">Child</p>
                                        <p className="text-xs text-muted-foreground">Half fare · ages 5–12 · ₹{(farePerPax / 2).toFixed(0)} per pax</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => handleCountChange('children', -1)}
                                            disabled={counts.children <= 0}
                                            className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-primary disabled:text-muted-foreground disabled:border-muted transition-colors hover:bg-primary/5"
                                        >
                                            <Minus className="w-4 h-4" strokeWidth={2.5} />
                                        </button>
                                        <span className="w-8 text-center text-lg font-bold text-foreground tabular-nums">{counts.children}</span>
                                        <button
                                            onClick={() => handleCountChange('children', 1)}
                                            disabled={totalPassengers >= 4}
                                            className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-primary disabled:text-muted-foreground disabled:border-muted transition-colors hover:bg-primary/5"
                                        >
                                            <Plus className="w-4 h-4" strokeWidth={2.5} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Passenger cap note */}
                        <p className="text-xs text-muted-foreground px-1">
                            <span className="font-semibold text-foreground">{totalPassengers}/4</span> passengers selected · max 4 per ticket
                        </p>

                        {/* Digital ticket notice */}
                        <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
                            <Info className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                            <p className="text-sm text-amber-800 font-medium leading-relaxed">
                                This is a <span className="font-bold">digital-only</span> unreserved ticket valid for <span className="font-bold">3 hours</span> from the time of purchase. PDF download is not available for GEN tickets.
                            </p>
                        </div>
                    </div>

                    {/* ── Right panel: fare summary ── */}
                    <div className="lg:col-span-1">
                        <div className="sticky top-24 bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                            {/* Header */}
                            <div className="p-5 border-b border-border">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Booking Summary</p>
                                <p className="font-bold text-foreground text-lg">General (Unreserved)</p>
                            </div>

                            {/* Fare breakdown */}
                            <div className="p-5 space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground flex items-center gap-1.5">
                                        <Users className="w-3.5 h-3.5" />
                                        {counts.adults} Adult{counts.adults !== 1 ? 's' : ''}
                                    </span>
                                    <span className="font-medium text-foreground">₹{(farePerPax * counts.adults).toFixed(0)}</span>
                                </div>
                                {counts.children > 0 && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground flex items-center gap-1.5">
                                            <Users className="w-3.5 h-3.5" />
                                            {counts.children} Child{counts.children !== 1 ? 'ren' : ''}
                                        </span>
                                        <span className="font-medium text-foreground">₹{((farePerPax / 2) * counts.children).toFixed(0)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Class</span>
                                    <span className="font-medium text-foreground">GEN · Second</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Validity</span>
                                    <span className="font-medium text-foreground">3 hours</span>
                                </div>

                                <div className="border-t border-border pt-3 mt-3 flex justify-between items-center">
                                    <span className="font-bold text-foreground">Total Fare</span>
                                    <span className="text-2xl font-bold text-primary">₹{totalFare.toFixed(0)}</span>
                                </div>
                            </div>

                            {/* Book button */}
                            <div className="px-5 pb-5">
                                <Button
                                    id="gen-book-btn"
                                    onClick={handlePay}
                                    disabled={isSubmitting || !genInfo?.canBook}
                                    className="w-full font-bold text-base py-6 rounded-xl shadow-lg shadow-primary/20"
                                >
                                    {isSubmitting
                                        ? 'Processing…'
                                        : genInfo?.canBook
                                            ? 'Proceed to Payment'
                                            : 'No Seats Available'}
                                </Button>
                                {!genInfo?.canBook && (
                                    <p className="text-center text-xs text-muted-foreground mt-2">
                                        This train's General coaches are full for the selected date.
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default GenBooking;
