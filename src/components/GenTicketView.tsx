import { type Booking } from "@/lib/api";
import { format, isAfter } from "date-fns";
import { Clock, Download, MapPin, Printer, ShieldCheck, ShieldAlert, Train } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState } from "react";

interface GenTicketViewProps {
  booking: Booking;
}

export default function GenTicketView({ booking }: GenTicketViewProps) {
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [isExpired, setIsExpired] = useState<boolean>(false);

  useEffect(() => {
    if (!booking.gen_validity_end) return;

    const validityEnd = new Date(booking.gen_validity_end);

    const updateTimer = () => {
      const now = new Date();
      if (isAfter(now, validityEnd)) {
        setIsExpired(true);
        setTimeLeft("00:00:00");
        return;
      }

      setIsExpired(false);
      const diff = validityEnd.getTime() - now.getTime();
      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft(
        `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
      );
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [booking.gen_validity_end]);

  const qrData = JSON.stringify({
    pnr: booking.booking_number,
    from: booking.source_station,
    to: booking.destination_station,
    date: booking.travel_date,
    validUntil: booking.gen_validity_end,
    type: "UNRESERVED",
    status: isExpired ? "EXPIRED" : "VALID",
  });

  return (
    <div className="relative overflow-hidden rounded-xl border border-amber-200 bg-amber-50 shadow-sm transition-all duration-300">
      {/* Background Watermark */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-[0.03] rotate-[-30deg]">
        <span className="text-[120px] font-black text-amber-900 uppercase tracking-widest whitespace-nowrap drop-shadow-sm">
          DIGITAL ONLY
        </span>
      </div>

      <div className="relative p-5 sm:p-6 pb-4 border-b border-amber-200 bg-gradient-to-r from-amber-700 to-amber-900 text-amber-50">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-800/50 border border-amber-600/50 text-xs font-semibold tracking-wide uppercase mb-3">
              <Train className="w-3.5 h-3.5" />
              Unreserved Open Ticket
            </div>
            <h2 className="text-xl sm:text-2xl font-bold font-display opacity-95">
              {booking.source_station} → {booking.destination_station}
            </h2>
            <div className="mt-1 text-sm font-medium text-amber-200/90 flex items-center gap-2">
              <span className="opacity-80">PNR</span>
              <span className="text-base text-white tracking-wider">{booking.booking_number}</span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2 w-full sm:w-auto bg-black/10 p-3 rounded-lg backdrop-blur-sm border border-white/10 shadow-inner">
            <span className="text-xs font-semibold text-amber-200/80 uppercase tracking-wider">Remaining Validity</span>
            {isExpired ? (
              <div className="flex items-center gap-2 text-red-400 font-bold bg-white/10 px-3 py-1.5 rounded-md">
                <ShieldAlert className="w-4 h-4" /> EXPIRED
              </div>
            ) : (
              <div className="flex items-center gap-2 text-green-400 font-mono text-xl sm:text-2xl font-bold bg-white/10 p-2 sm:px-3 sm:py-1.5 rounded-md">
                <Clock className="w-5 h-5 text-green-400/80" /> {timeLeft}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="relative p-5 sm:p-6 grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 bg-white/60">
        <div className="md:col-span-2 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-amber-100/30 p-3 rounded-lg border border-amber-100">
              <p className="text-xs uppercase font-bold text-amber-800/60 mb-1">Date</p>
              <p className="font-semibold text-amber-950">{format(new Date(booking.travel_date), "dd MMM yyyy")}</p>
            </div>
            <div className="bg-amber-100/30 p-3 rounded-lg border border-amber-100">
              <p className="text-xs uppercase font-bold text-amber-800/60 mb-1">Passengers</p>
              <p className="font-semibold text-amber-950">{booking.passengers?.length || 1} Adult</p>
            </div>
            <div className="bg-amber-100/30 p-3 rounded-lg border border-amber-100">
              <p className="text-xs uppercase font-bold text-amber-800/60 mb-1">Fare Paid</p>
              <p className="font-semibold text-amber-950">₹{Number(booking.total_amount).toFixed(2)}</p>
            </div>
            <div className="bg-amber-100/30 p-3 rounded-lg border border-amber-100">
              <p className="text-xs uppercase font-bold text-amber-800/60 mb-1">Valid Until</p>
              <p className={`font-semibold ${isExpired ? "text-red-600 line-through opacity-70" : "text-amber-950"}`}>
                {booking.gen_validity_end ? format(new Date(booking.gen_validity_end), "hh:mm a") : "N/A"}
              </p>
            </div>
          </div>

          <div>
            <p className="text-xs uppercase font-bold text-amber-800/60 mb-2 mt-4 border-b border-amber-200/50 pb-1">
              Passenger List
            </p>
            <div className="space-y-2 max-h-[140px] overflow-y-auto pr-2 custom-scrollbar">
              {booking.passengers?.map((p, idx) => (
                <div key={idx} className="flex justify-between items-center text-sm py-1 border-b border-amber-100/50 last:border-0">
                  <span className="font-medium text-amber-950">
                    {p.passenger_name} <span className="text-amber-700/70 text-xs">({p.passenger_gender === "U" ? "Anonymous" : p.passenger_gender})</span>
                  </span>
                  <span className="text-amber-700 font-semibold text-xs tracking-wider">UNRESERVED</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center p-4 bg-white rounded-xl border-2 border-dashed border-amber-200 relative group">
          <p className="text-xs uppercase font-semibold text-amber-800 mb-3 tracking-widest text-center shadow-sm w-full py-1 bg-amber-50 rounded-t-lg">
            Scan to Verify
          </p>
          <div className={`p-2 bg-white rounded-lg shadow-sm border transition-all ${isExpired ? "opacity-30 grayscale border-red-200" : "border-amber-100"}`}>
            <QRCodeSVG value={qrData} size={130} level="M" />
            {isExpired && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="text-red-600 font-black text-2xl rotate-[-20deg] px-2 py-1 bg-white/90 border-2 border-red-600 rounded drop-shadow-md">INVALID</span>
              </div>
            )}
          </div>
          <p className="text-[10px] text-amber-700/60 mt-3 text-center px-2">
            Show this QR code to the Train Conductor (TC) along with valid ID.
          </p>
        </div>
      </div>

      <div className="relative bg-amber-100/80 px-5 py-3 border-t border-amber-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm">
        <div className="flex items-center gap-2 text-amber-900 font-medium">
          <ShieldCheck className="w-4 h-4 text-amber-700" />
          Valid for travel in any train departing within 3 hours.
        </div>
        <div className="flex items-center gap-4 text-amber-700/80">
           <span className="flex items-center gap-1 line-through opacity-70"><Download className="w-3 h-3"/> Download</span>
           <span className="flex items-center gap-1 line-through opacity-70"><Printer className="w-3 h-3"/> Print</span>
        </div>
      </div>
    </div>
  );
}
