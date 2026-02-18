import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { Seat as SeatType, SeatType as SeatTypeEnum } from '@/data/coachLayouts';
import { cn } from '@/lib/utils';

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
        className="z-50 overflow-hidden rounded-xl border bg-popover px-3 py-2 text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2"
      >
        <div className="grid gap-1 text-center">
          <div className="text-sm font-bold">Seat {seat.number}</div>
          <div className="text-xs text-muted-foreground">{seatTypeLabels[seat.type]}</div>
          {seat.price > 0 ? (
            <div className="font-mono text-sm font-bold text-emerald-600">
              ₹{seat.price}
            </div>
          ) : (
            <div className="text-xs text-muted-foreground animate-pulse">
              Updating fare...
            </div>
          )}
          <div className={cn(
            "text-[10px] font-bold uppercase tracking-wider mt-1",
            seat.status === 'available' ? 'text-emerald-500' :
            seat.status === 'booked' ? 'text-rose-500' :
            seat.status === 'locked' ? 'text-amber-500' : 'text-slate-500'
          )}>
            {isSelected ? 'Selected' : seat.status}
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
};
