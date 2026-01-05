import { Seat as SeatType } from '@/data/coachLayouts';
import { Button } from '@/components/ui/button';
import { X, Ticket, ArrowRight } from 'lucide-react';

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
    <div className="glass-card p-6 h-fit sticky top-6 animate-slide-up">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Ticket className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="font-display font-semibold text-lg text-foreground">Booking Summary</h2>
          <p className="text-sm text-muted-foreground">Review your selection</p>
        </div>
      </div>

      {/* Train Info */}
      <div className="p-4 bg-muted/50 rounded-lg mb-4">
        <p className="font-medium text-foreground">{trainName}</p>
        <p className="text-sm text-muted-foreground">Train #{trainNumber}</p>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded font-medium">
            Coach {selectedCoach}
          </span>
        </div>
      </div>

      {/* Selected Seats */}
      <div className="mb-4">
        <h3 className="text-sm font-medium text-muted-foreground mb-3">
          Selected Seats ({selectedSeats.length})
        </h3>
        
        {selectedSeats.length === 0 ? (
          <p className="text-sm text-muted-foreground italic py-4 text-center bg-muted/30 rounded-lg">
            No seats selected yet
          </p>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
            {selectedSeats.map((seat) => (
              <div
                key={seat.id}
                className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg group hover:bg-secondary transition-colors"
              >
                <div>
                  <span className="font-medium text-foreground">Seat {seat.number}</span>
                  <p className="text-xs text-muted-foreground capitalize">
                    {seat.type.replace('-', ' ')}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-foreground">₹{seat.price}</span>
                  <button
                    onClick={() => onRemoveSeat(seat)}
                    className="p-1 hover:bg-destructive/10 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                    aria-label={`Remove seat ${seat.number}`}
                  >
                    <X className="w-4 h-4 text-destructive" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Total */}
      <div className="border-t border-border pt-4 mb-6">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Passengers</span>
          <span className="font-medium text-foreground">{selectedSeats.length}</span>
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-lg font-semibold text-foreground">Total Amount</span>
          <span className="text-xl font-bold text-primary">₹{totalAmount}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-3">
        <Button
          onClick={onConfirm}
          disabled={selectedSeats.length === 0}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-5"
        >
          Confirm Selection
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
        <Button
          onClick={onChangeCoach}
          variant="outline"
          className="w-full border-border hover:bg-secondary"
        >
          Change Coach
        </Button>
      </div>
    </div>
  );
};
