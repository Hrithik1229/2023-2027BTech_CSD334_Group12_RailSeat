import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { API_BASE, getStoredUser } from '@/lib/api';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import {
    AlertCircle,
    ArrowLeft,
    ArrowRight,
    CalendarDays,
    CheckCircle2,
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

interface PassengerRow { name: string; gender: string; age: string; }
const emptyPassenger = (): PassengerRow => ({ name: '', gender: '', age: '' });

const GenBooking = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const {
        trainId, trainName, trainNumber,
        source, destination, date, isoDate,
        distance,
    } = location.state || {};

    const [count, setCount] = useState(1);
    const [passengers, setPassengers] = useState<PassengerRow[]>([emptyPassenger()]);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // GEN availability info
    const [genInfo, setGenInfo] = useState<{
        totalCapacity: number;
        remaining: number;
        sentinelSeatId: number | null;
        genCoaches: { coach_number: string }[];
    } | null>(null);

    // Per-passenger fare (flat GEN rate)
    const [farePerPax, setFarePerPax] = useState(0);

    // ── Fetch GEN availability + fare on mount ──────────────────────
    useEffect(() => {
        if (!trainId || !isoDate) { navigate('/book'); return; }

        const init = async () => {
            setIsLoading(true);
            try {
                // 1. Check GEN coach capacity
                const avRes = await fetch(`${API_BASE}/trains/${trainId}/gen-availability?date=${isoDate}&passengerCount=1`);
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
                    sentinelSeatId: avData.genCoaches?.[0]?.sentinelSeatId ?? null,
                    genCoaches: avData.genCoaches ?? [],
                });

                // 2. Fetch GEN fare
                const fareRes = await fetch(`${API_BASE}/trains/fare`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        distance: distance || 100,
                        trainType: 'EXPRESS',
                        coachType: 'GEN',
                        berthTypes: ['LB'],  // GEN uses the LB fare entry as its single tier
                    }),
                });
                if (fareRes.ok) {
                    const fareData = await fareRes.json();
                    // fareData is { LB: <number> } from getFaresForCoach
                    setFarePerPax(fareData['LB'] || fareData[Object.keys(fareData)[0]] || 50);
                } else {
                    setFarePerPax(50); // fallback
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
    }, [trainId, isoDate]);

    // ── Sync passenger rows when count changes ──────────────────────
    const handleCountChange = (delta: number) => {
        const next = Math.max(1, Math.min(6, count + delta));
        if (genInfo && next > genInfo.remaining) {
            toast.error(`Only ${genInfo.remaining} seats remaining.`);
            return;
        }
        setCount(next);
        setPassengers(prev => {
            const updated = [...prev];
            while (updated.length < next) updated.push(emptyPassenger());
            return updated.slice(0, next);
        });
    };

    const updatePassenger = (i: number, field: keyof PassengerRow, val: string) => {
        setPassengers(prev => {
            const u = [...prev];
            u[i] = { ...u[i], [field]: val };
            return u;
        });
        setErrors(prev => { const e = { ...prev }; delete e[`${field}-${i}`]; return e; });
    };

    const validate = () => {
        const errs: Record<string, string> = {};
        passengers.forEach((p, i) => {
            if (!p.name.trim() || p.name.trim().length < 2) errs[`name-${i}`] = 'Full name required (min 2 chars)';
            else if (!/^[a-zA-Z\s]+$/.test(p.name.trim())) errs[`name-${i}`] = 'Name can only contain letters';
            if (!p.age || isNaN(+p.age) || +p.age < 1 || +p.age > 120) errs[`age-${i}`] = 'Valid age required (1 – 120)';
            if (!p.gender) errs[`gender-${i}`] = 'Gender required';
        });
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const totalFare = farePerPax * count;

    const handlePay = async () => {
        if (!validate()) return;
        const user = getStoredUser();
        if (!user) { toast.error('Please login first'); navigate('/login'); return; }

        setIsSubmitting(true);
        try {
            // 1. Create Razorpay GEN order
            const orderRes = await fetch(`${API_BASE}/payments/create-gen-order`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    totalAmount: totalFare,
                    trainId,
                    travelDate: isoDate,
                    passengerCount: count,
                }),
            });
            if (!orderRes.ok) {
                const e = await orderRes.json();
                throw new Error(e.error || 'Failed to create payment order.');
            }
            const order = await orderRes.json();
            setIsSubmitting(false);

            // 2. Load Razorpay SDK if needed
            if (!window.Razorpay) {
                await new Promise<void>((res, rej) => {
                    const s = document.createElement('script');
                    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
                    s.onload = () => res();
                    s.onerror = () => rej(new Error('Failed to load Razorpay'));
                    document.body.appendChild(s);
                });
            }

            // 3. Open checkout
            const rzp = new window.Razorpay({
                key: order.key_id,
                amount: order.amount,
                currency: order.currency || 'INR',
                name: 'RailSeat',
                description: `General Coach – ${trainName}`,
                image: `${window.location.origin}/logo%20(2).png`,
                order_id: order.order_id,
                prefill: { name: passengers[0].name, email: user.email || '' },
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
                                contactName: passengers[0].name,
                                email: user.email,
                                userId: user.user_id,
                                trainId,
                                sourceStation: source,
                                destinationStation: destination,
                                travelDate: isoDate,
                                passengers: passengers.map(p => ({ name: p.name, gender: p.gender })),
                                totalAmount: totalFare,
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
                                    <span className="text-xs text-muted-foreground">General (Unreserved) Coach</span>
                                </div>
                            ),
                            duration: 8000,
                        });
                        navigate('/book');
                    } catch (err: any) {
                        toast.error(`Verification failed: ${err.message}`);
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
        } catch (err: any) {
            toast.error(err.message);
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
            </div>
        );
    }

    const isFormComplete = passengers.every(p => p.name && p.age && p.gender);

    return (
        <div className="min-h-screen bg-slate-50">
            <Navbar
                extraNav={
                    <Button variant="ghost" onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
                        <ArrowLeft className="w-4 h-4 mr-2" /> Back
                    </Button>
                }
            />

            {/* Journey info bar */}
            <div className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 text-white shadow-xl">
                <div className="container mx-auto px-6 py-5 flex flex-wrap items-center justify-between gap-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/10 rounded-xl border border-white/10">
                            <Train className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-white leading-none">{trainName}</h1>
                            <p className="text-xs text-slate-300 font-medium mt-0.5">#{trainNumber}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 bg-white/10 px-5 py-3 rounded-2xl border border-white/15">
                        <div className="text-center">
                            <MapPin className="w-4 h-4 text-blue-300 mx-auto mb-1" />
                            <p className="text-xs text-slate-300 uppercase tracking-wider">From</p>
                            <p className="font-bold text-white">{source}</p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-white" />
                        <div className="text-center">
                            <MapPin className="w-4 h-4 text-emerald-300 mx-auto mb-1" />
                            <p className="text-xs text-slate-300 uppercase tracking-wider">To</p>
                            <p className="font-bold text-white">{destination}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 text-slate-300 text-sm">
                        <CalendarDays className="w-4 h-4" /> {date}
                    </div>
                </div>
            </div>

            <main className="container mx-auto px-4 py-8 max-w-3xl">

                {/* GEN info banner */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3"
                >
                    <div className="text-2xl mt-0.5">🚃</div>
                    <div>
                        <p className="font-bold text-amber-800">General / Unreserved Compartment</p>
                        <p className="text-sm text-amber-700 mt-0.5">
                            No specific seat is assigned. You may board any General coach on this train.
                            {genInfo && (
                                <span className="ml-2 font-semibold">
                                    {genInfo.remaining} of {genInfo.totalCapacity} seats remaining today.
                                </span>
                            )}
                        </p>
                    </div>
                </motion.div>

                {/* Passenger count selector */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-6"
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Users className="w-5 h-5 text-blue-600" />
                            <div>
                                <p className="font-bold text-slate-800">Number of Passengers</p>
                                <p className="text-xs text-slate-400">Max 6 per booking</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => handleCountChange(-1)}
                                disabled={count <= 1}
                                className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center hover:bg-slate-50 disabled:opacity-30 transition-all"
                            >
                                <Minus className="w-4 h-4" />
                            </button>
                            <span className="w-8 text-center text-xl font-bold text-slate-900">{count}</span>
                            <button
                                onClick={() => handleCountChange(1)}
                                disabled={count >= 6 || (!!genInfo && count >= genInfo.remaining)}
                                className="w-9 h-9 rounded-xl border border-blue-200 bg-blue-50 flex items-center justify-center hover:bg-blue-100 disabled:opacity-30 transition-all"
                            >
                                <Plus className="w-4 h-4 text-blue-600" />
                            </button>
                        </div>
                    </div>

                    {/* Fare summary */}
                    <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                        <p className="text-sm text-slate-500">
                            ₹{farePerPax} × {count} passenger{count > 1 ? 's' : ''}
                        </p>
                        <p className="text-2xl font-bold text-slate-900">₹{totalFare}</p>
                    </div>
                </motion.div>

                {/* Passenger forms */}
                <AnimatePresence>
                    <motion.div className="space-y-4">
                        {passengers.map((pax, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ delay: i * 0.05 }}
                                className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5"
                            >
                                {/* Header */}
                                <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-100">
                                    <div className={cn(
                                        'w-10 h-10 rounded-full flex items-center justify-center transition-colors',
                                        pax.name && pax.age && pax.gender ? 'bg-green-100' : 'bg-slate-100'
                                    )}>
                                        {pax.name && pax.age && pax.gender
                                            ? <CheckCircle2 className="w-5 h-5 text-green-600" />
                                            : <span className="text-sm font-bold text-slate-400">{i + 1}</span>
                                        }
                                    </div>
                                    <div>
                                        <p className="font-semibold text-slate-800">Passenger {i + 1}</p>
                                        <p className="text-xs text-slate-400">General (Unreserved) • ₹{farePerPax}</p>
                                    </div>
                                </div>

                                {/* Fields */}
                                <div className="grid md:grid-cols-3 gap-4">
                                    {/* Name */}
                                    <div className="space-y-1.5">
                                        <Label className="text-xs text-slate-500 uppercase font-semibold tracking-wide">Full Name</Label>
                                        <Input
                                            placeholder="Enter full name"
                                            value={pax.name}
                                            onChange={e => updatePassenger(i, 'name', e.target.value)}
                                            maxLength={50}
                                            className={cn('h-11', errors[`name-${i}`] && 'border-red-400 focus-visible:ring-red-200')}
                                        />
                                        {errors[`name-${i}`] && (
                                            <p className="text-xs text-red-500 flex items-center gap-1">
                                                <AlertCircle className="w-3 h-3" /> {errors[`name-${i}`]}
                                            </p>
                                        )}
                                    </div>

                                    {/* Age */}
                                    <div className="space-y-1.5">
                                        <Label className="text-xs text-slate-500 uppercase font-semibold tracking-wide">Age</Label>
                                        <Input
                                            type="number"
                                            placeholder="Age"
                                            value={pax.age}
                                            onChange={e => updatePassenger(i, 'age', e.target.value)}
                                            min={1} max={120}
                                            className={cn('h-11', errors[`age-${i}`] && 'border-red-400 focus-visible:ring-red-200')}
                                        />
                                        {errors[`age-${i}`] && (
                                            <p className="text-xs text-red-500 flex items-center gap-1">
                                                <AlertCircle className="w-3 h-3" /> {errors[`age-${i}`]}
                                            </p>
                                        )}
                                    </div>

                                    {/* Gender */}
                                    <div className="space-y-1.5">
                                        <Label className="text-xs text-slate-500 uppercase font-semibold tracking-wide">Gender</Label>
                                        <Select value={pax.gender} onValueChange={v => updatePassenger(i, 'gender', v)}>
                                            <SelectTrigger className={cn('h-11', errors[`gender-${i}`] && 'border-red-400')}>
                                                <SelectValue placeholder="Select gender" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="male">Male</SelectItem>
                                                <SelectItem value="female">Female</SelectItem>
                                                <SelectItem value="other">Other</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        {errors[`gender-${i}`] && (
                                            <p className="text-xs text-red-500 flex items-center gap-1">
                                                <AlertCircle className="w-3 h-3" /> {errors[`gender-${i}`]}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>
                </AnimatePresence>

                {/* Pay button */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="mt-8"
                >
                    <button
                        onClick={handlePay}
                        disabled={isSubmitting || !isFormComplete}
                        className="pay-btn w-full disabled:opacity-50 disabled:cursor-not-allowed"
                        type="button"
                    >
                        <span className="btn-text">
                            {isSubmitting ? 'Processing…' : isFormComplete ? 'Pay Now' : 'Fill Details'}
                        </span>
                        <div className="icon-container">
                            <svg viewBox="0 0 24 24" className="icon wallet-icon default-icon">
                                <path d="M21,18V19A2,2 0 0,1 19,21H5C3.89,21 3,20.1 3,19V5A2,2 0 0,1 5,3H19A2,2 0 0,1 21,5V6H12C10.89,6 10,6.9 10,8V16A2,2 0 0,0 12,18M12,16H22V8H12M16,13.5A1.5,1.5 0 0,1 14.5,12A1.5,1.5 0 0,1 16,10.5A1.5,1.5 0 0,1 17.5,12A1.5,1.5 0 0,1 16,13.5Z" fill="currentColor" />
                            </svg>
                            <svg viewBox="0 0 24 24" className="icon check-icon">
                                <path d="M9,16.17L4.83,12L3.41,13.41L9,19L21,7L19.59,5.59L9,16.17Z" fill="currentColor" />
                            </svg>
                        </div>
                    </button>
                    <p className="text-center text-xs text-slate-400 mt-3">
                        Secured by Razorpay · GEN ticket is non-seat-specific
                    </p>
                </motion.div>
            </main>
        </div>
    );
};

export default GenBooking;
