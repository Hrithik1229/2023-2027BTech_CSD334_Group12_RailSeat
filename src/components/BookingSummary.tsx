import { Button } from '@/components/ui/button';
import { Seat as SeatType } from '@/data/coachLayouts';
import { ArrowRight, Ticket, X } from 'lucide-react';

interface BookingSummaryProps {
  trainName: string;
  trainNumber: string;
  selectedCoach: string;
  selectedSeats: SeatType[];
  onRemoveSeat: (seat: SeatType) => void;
  onConfirm: () => void;
  onChangeCoach: () => void;
}

export const BookingSummary = ({
  trainName,
  trainNumber,
  selectedCoach,
  selectedSeats,
  onRemoveSeat,
  onConfirm,
  onChangeCoach,
}: BookingSummaryProps) => {
  const totalAmount = selectedSeats.reduce((sum, seat) => sum + seat.price, 0);

  return (
      <div className="glass-card p-6 h-fit sticky top-24 animate-slide-up border border-white/20 shadow-xl bg-white/70 dark:bg-black/40 backdrop-blur-md rounded-2xl">
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="p-2.5 bg-gradient-to-br from-primary to-blue-600 rounded-xl shadow-lg shadow-blue-500/20">
          <Ticket className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="font-display font-bold text-lg text-foreground">Booking Summary</h2>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Your Journey</p>
        </div>
      </div>

      {/* Train Info */}
      <div className="p-4 bg-gradient-to-br from-secondary/50 to-secondary/30 rounded-xl mb-6 border border-white/10">
        <div className="flex justify-between items-start mb-2">
            <div>
                <p className="font-bold text-foreground text-lg leading-tight">{trainName}</p>
                <p className="text-xs text-muted-foreground font-medium">#{trainNumber}</p>
            </div>
            <span className="text-xs px-2.5 py-1 bg-primary/10 text-primary rounded-full font-bold border border-primary/10">
                {selectedCoach}
            </span>
        </div>
      </div>

      {/* Selected Seats */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
             <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Selected ({selectedSeats.length})
            </h3>
            {selectedSeats.length > 0 && (
                <span className="text-[10px] text-green-600 font-bold px-2 py-0.5 bg-green-100 rounded-full">
                    {selectedSeats.length} SEATS
                </span>
            )}
        </div>
        
        {selectedSeats.length === 0 ? (
          <div className="text-sm text-muted-foreground/60 italic py-8 text-center border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl">
            Select seats to proceed
          </div>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1 customize-scrollbar">
            {selectedSeats.map((seat) => (
              <div
                key={seat.id}
                className="flex items-center justify-between p-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 group hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/5 flex items-center justify-center text-xs font-bold text-primary">
                        {seat.number}
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground capitalize">
                        {seat.type.replace('-', ' ')}
                      </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-foreground">₹{seat.price}</span>
                  <button
                    onClick={() => onRemoveSeat(seat)}
                    className="p-1.5 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition-all"
                    aria-label={`Remove seat ${seat.number}`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Total */}
      <div className="bg-gradient-to-r from-primary/5 to-transparent p-4 rounded-xl mb-6 border border-primary/10">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm text-muted-foreground font-medium">Passengers</span>
          <span className="font-bold text-foreground">{selectedSeats.length}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-lg font-bold text-foreground">Total</span>
          <span className="text-2xl font-bold text-primary">₹{totalAmount}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-3">
        <Button
          onClick={onConfirm}
          disabled={selectedSeats.length === 0}
          className="w-full bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 text-white font-bold py-6 rounded-xl shadow-lg shadow-primary/25 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
        >
          Confirm Booking
          <ArrowRight className="w-5 h-5 ml-2" />
        </Button>
        <Button
          onClick={onChangeCoach}
          variant="ghost"
          className="w-full text-muted-foreground hover:text-foreground hover:bg-secondary/50 font-medium"
        >
          Switch Coach
        </Button>
      </div>
    </div>
  );
};
