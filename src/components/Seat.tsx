import { Seat as SeatType, SeatStatus, SeatType as SeatTypeEnum } from '@/data/coachLayouts';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface SeatProps {
  seat: SeatType;
  onSelect: (seat: SeatType) => void;
  isSelected: boolean;
}

const seatTypeLabels: Record<SeatTypeEnum, string> = {
  'lower': 'Lower Berth',
  'middle': 'Middle Berth',
  'upper': 'Upper Berth',
  'side-lower': 'Side Lower',
  'side-upper': 'Side Upper',
  'window': 'Window Seat',
  'aisle': 'Aisle Seat',
  'middle-seat': 'Middle Seat',
};

export const Seat = ({ seat, onSelect, isSelected }: SeatProps) => {
  const getStatusClass = (): string => {
    if (isSelected) return 'seat-selected';
    switch (seat.status) {
      case 'available':
        return 'seat-available';
      case 'booked':
        return 'seat-booked';
      case 'locked':
        return 'seat-locked';
      default:
        return 'seat-available';
    }
  };

  const handleClick = () => {
    if (seat.status === 'available' || isSelected) {
      onSelect(seat);
    }
  };

  const isClickable = seat.status === 'available' || isSelected;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={handleClick}
          disabled={!isClickable}
          className={cn(
            'seat-base',
            getStatusClass(),
            !isClickable && 'cursor-not-allowed'
          )}
          aria-label={`Seat ${seat.number} - ${seatTypeLabels[seat.type]} - ${seat.status}`}
        >
          {seat.number}
        </button>
      </TooltipTrigger>
      <TooltipContent 
        side="top" 
        className="bg-card border border-border shadow-lg px-3 py-2"
      >
        <div className="text-sm">
          <p className="font-semibold text-foreground">Seat {seat.number}</p>
          <p className="text-muted-foreground">{seatTypeLabels[seat.type]}</p>
          <p className="text-primary font-medium">₹{seat.price}</p>
          <p className={cn(
            'text-xs capitalize mt-1',
            seat.status === 'available' && 'text-emerald-600',
            seat.status === 'booked' && 'text-gray-500',
            seat.status === 'locked' && 'text-amber-600'
          )}>
            {isSelected ? 'Selected' : seat.status}
          </p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
};
