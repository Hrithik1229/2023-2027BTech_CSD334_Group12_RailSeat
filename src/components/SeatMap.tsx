import { CoachLayout, Seat as SeatType } from '@/data/coachLayouts';
import { Seat } from './Seat';
import { SeatLegend } from './SeatLegend';

interface SeatMapProps {
  coach: CoachLayout;
  selectedSeats: SeatType[];
  onSeatSelect: (seat: SeatType) => void;
}

export const SeatMap = ({ coach, selectedSeats, onSeatSelect }: SeatMapProps) => {
  const isSeatSelected = (seat: SeatType) => 
    selectedSeats.some(s => s.id === seat.id);

  const renderSleeperLayout = () => (
    <div className="space-y-2">
      {/* Coach header */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-3 h-8 bg-primary rounded-sm" />
          <span className="text-sm font-medium text-muted-foreground">Entry</span>
        </div>
        <span className="text-xs text-muted-foreground">Toilet →</span>
      </div>
      
      {coach.rows.map((row, idx) => {
        const isMainRow = row.seats.length === 6;
        
        if (isMainRow) {
          return (
            <div key={row.rowNumber} className="flex items-center gap-2 mb-1">
              {/* Left side berths */}
              <div className="flex flex-col gap-1">
                {row.seats.slice(0, 3).map(seat => (
                  <Seat
                    key={seat.id}
                    seat={seat}
                    onSelect={onSeatSelect}
                    isSelected={isSeatSelected(seat)}
                  />
                ))}
              </div>
              
              {/* Aisle */}
              <div className="w-12 flex items-center justify-center">
                <div className="w-full h-1 bg-border rounded-full" />
              </div>
              
              {/* Right side berths */}
              <div className="flex flex-col gap-1">
                {row.seats.slice(3).map(seat => (
                  <Seat
                    key={seat.id}
                    seat={seat}
                    onSelect={onSeatSelect}
                    isSelected={isSeatSelected(seat)}
                  />
                ))}
              </div>
            </div>
          );
        } else {
          // Side berths
          return (
            <div key={row.rowNumber} className="flex items-center gap-2 pl-28 mb-4">
              <div className="flex flex-col gap-1">
                {row.seats.map(seat => (
                  <Seat
                    key={seat.id}
                    seat={seat}
                    onSelect={onSeatSelect}
                    isSelected={isSeatSelected(seat)}
                  />
                ))}
              </div>
              <span className="text-xs text-muted-foreground ml-2">Side</span>
            </div>
          );
        }
      })}
    </div>
  );

  const renderACLayout = () => (
    <div className="space-y-2">
      {/* Coach header */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-3 h-8 bg-blue-600 rounded-sm" />
          <span className="text-sm font-medium text-muted-foreground">Entry</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">AC</span>
          <span className="text-xs text-muted-foreground">Toilet →</span>
        </div>
      </div>
      
      {coach.rows.map((row) => {
        const isMainRow = row.seats.length === 4;
        
        if (isMainRow) {
          return (
            <div key={row.rowNumber} className="flex items-center gap-2 mb-1">
              {/* Left side berths */}
              <div className="flex flex-col gap-1">
                {row.seats.slice(0, 2).map(seat => (
                  <Seat
                    key={seat.id}
                    seat={seat}
                    onSelect={onSeatSelect}
                    isSelected={isSeatSelected(seat)}
                  />
                ))}
              </div>
              
              {/* Aisle */}
              <div className="w-16 flex items-center justify-center">
                <div className="w-full h-1 bg-blue-200 rounded-full" />
              </div>
              
              {/* Right side berths */}
              <div className="flex flex-col gap-1">
                {row.seats.slice(2).map(seat => (
                  <Seat
                    key={seat.id}
                    seat={seat}
                    onSelect={onSeatSelect}
                    isSelected={isSeatSelected(seat)}
                  />
                ))}
              </div>
            </div>
          );
        } else {
          // Side berths
          return (
            <div key={row.rowNumber} className="flex items-center gap-2 pl-24 mb-4">
              <div className="flex flex-col gap-1">
                {row.seats.map(seat => (
                  <Seat
                    key={seat.id}
                    seat={seat}
                    onSelect={onSeatSelect}
                    isSelected={isSeatSelected(seat)}
                  />
                ))}
              </div>
              <span className="text-xs text-muted-foreground ml-2">Side</span>
            </div>
          );
        }
      })}
    </div>
  );

  const renderChairCarLayout = () => (
    <div className="space-y-1">
      {/* Coach header with seat labels */}
      <div className="flex items-center gap-2 mb-4 pb-4 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-3 h-8 bg-emerald-600 rounded-sm" />
          <span className="text-sm font-medium text-muted-foreground">Entry</span>
        </div>
      </div>
      
      {/* Column headers */}
      <div className="flex items-center gap-2 mb-2 px-8">
        <div className="flex gap-1 w-32 justify-center">
          <span className="w-10 text-center text-xs text-muted-foreground">A</span>
          <span className="w-10 text-center text-xs text-muted-foreground">B</span>
          <span className="w-10 text-center text-xs text-muted-foreground">C</span>
        </div>
        <div className="w-8" />
        <div className="flex gap-1 w-24 justify-center">
          <span className="w-10 text-center text-xs text-muted-foreground">D</span>
          <span className="w-10 text-center text-xs text-muted-foreground">E</span>
        </div>
      </div>
      
      {coach.rows.map((row) => (
        <div key={row.rowNumber} className="flex items-center gap-2">
          {/* Row number */}
          <div className="w-6 text-right">
            <span className="text-xs text-muted-foreground">{row.rowNumber}</span>
          </div>
          
          {/* Left side (3 seats) */}
          <div className="flex gap-1">
            {row.seats.slice(0, 3).map(seat => (
              <Seat
                key={seat.id}
                seat={seat}
                onSelect={onSeatSelect}
                isSelected={isSeatSelected(seat)}
              />
            ))}
          </div>
          
          {/* Aisle */}
          <div className="w-8 flex items-center justify-center">
            <div className="w-1 h-6 bg-border rounded-full" />
          </div>
          
          {/* Right side (2 seats) */}
          <div className="flex gap-1">
            {row.seats.slice(3).map(seat => (
              <Seat
                key={seat.id}
                seat={seat}
                onSelect={onSeatSelect}
                isSelected={isSeatSelected(seat)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="animate-fade-in">
      <SeatLegend />
      
      <div className="mt-6 p-6 bg-card rounded-xl border border-border shadow-card overflow-x-auto">
        <div className="min-w-fit">
          {coach.type === 'sleeper' && renderSleeperLayout()}
          {coach.type === 'ac' && renderACLayout()}
          {coach.type === 'chair' && renderChairCarLayout()}
        </div>
      </div>
    </div>
  );
};
