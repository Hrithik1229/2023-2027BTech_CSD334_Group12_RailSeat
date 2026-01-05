import { CoachLayout, Seat as SeatType } from '@/data/coachLayouts';
import { Seat } from './Seat';
import { SeatLegend } from './SeatLegend';
import { cn } from '@/lib/utils';

interface SeatMapProps {
  coach: CoachLayout;
  selectedSeats: SeatType[];
  onSeatSelect: (seat: SeatType) => void;
}

const CompartmentDivider = () => (
  <div className="relative py-3 my-2">
    <div className="absolute inset-0 flex items-center">
      <div className="w-full border-t-2 border-dashed border-border/60" />
    </div>
    <div className="relative flex justify-center">
      <div className="w-3 h-3 rounded-full bg-border" />
    </div>
  </div>
);

const BerthLabel = ({ label, position }: { label: string; position: 'left' | 'right' }) => (
  <span className={cn(
    "seat-berth-label w-8 text-center",
    position === 'left' ? 'text-right pr-1' : 'text-left pl-1'
  )}>
    {label}
  </span>
);

export const SeatMap = ({ coach, selectedSeats, onSeatSelect }: SeatMapProps) => {
  const isSeatSelected = (seat: SeatType) => 
    selectedSeats.some(s => s.id === seat.id);

  const renderSleeperLayout = () => {
    const compartments: JSX.Element[] = [];
    
    for (let i = 0; i < coach.rows.length; i += 2) {
      const mainRow = coach.rows[i];
      const sideRow = coach.rows[i + 1];
      const compartmentNum = Math.floor(i / 2) + 1;
      
      compartments.push(
        <div key={compartmentNum} className="relative">
          {compartmentNum > 1 && <CompartmentDivider />}
          
          {/* Compartment container */}
          <div className="bg-gradient-to-r from-muted/30 via-transparent to-muted/30 rounded-xl p-4 border border-border/30">
            <div className="flex items-start gap-3">
              {/* Left berths with labels */}
              <div className="flex items-center gap-1">
                <div className="flex flex-col gap-1 text-right pr-1">
                  <BerthLabel label="UB" position="left" />
                  <BerthLabel label="MB" position="left" />
                  <BerthLabel label="LB" position="left" />
                </div>
                <div className="flex flex-col gap-1.5">
                  {mainRow.seats.slice(0, 3).reverse().map(seat => (
                    <Seat
                      key={seat.id}
                      seat={seat}
                      onSelect={onSeatSelect}
                      isSelected={isSeatSelected(seat)}
                    />
                  ))}
                </div>
              </div>
              
              {/* Aisle with window indicator */}
              <div className="flex flex-col items-center justify-center px-3 py-2">
                <div className="w-12 h-8 rounded-md bg-gradient-to-b from-sky-100 to-sky-200 border border-sky-300/50 flex items-center justify-center mb-2">
                  <span className="text-[8px] text-sky-600 font-medium">WINDOW</span>
                </div>
                <div className="flex-1 w-px bg-gradient-to-b from-border via-border/50 to-border" />
                <div className="text-[10px] text-muted-foreground mt-1">Aisle</div>
              </div>
              
              {/* Right berths with labels */}
              <div className="flex items-center gap-1">
                <div className="flex flex-col gap-1.5">
                  {mainRow.seats.slice(3).reverse().map(seat => (
                    <Seat
                      key={seat.id}
                      seat={seat}
                      onSelect={onSeatSelect}
                      isSelected={isSeatSelected(seat)}
                    />
                  ))}
                </div>
                <div className="flex flex-col gap-1 text-left pl-1">
                  <BerthLabel label="UB" position="right" />
                  <BerthLabel label="MB" position="right" />
                  <BerthLabel label="LB" position="right" />
                </div>
              </div>

              {/* Side berths */}
              {sideRow && (
                <div className="ml-auto flex items-center gap-1 pl-4 border-l border-border/50">
                  <div className="flex flex-col gap-1.5">
                    {sideRow.seats.map(seat => (
                      <Seat
                        key={seat.id}
                        seat={seat}
                        onSelect={onSeatSelect}
                        isSelected={isSeatSelected(seat)}
                      />
                    ))}
                  </div>
                  <div className="flex flex-col gap-1 text-left pl-1">
                    <BerthLabel label="SU" position="right" />
                    <BerthLabel label="SL" position="right" />
                  </div>
                </div>
              )}
            </div>
            
            {/* Compartment number */}
            <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
              <span className="text-[9px] font-bold text-primary">{compartmentNum}</span>
            </div>
          </div>
        </div>
      );
    }
    
    return <div className="space-y-1">{compartments}</div>;
  };

  const renderACLayout = () => {
    const compartments: JSX.Element[] = [];
    
    for (let i = 0; i < coach.rows.length; i += 2) {
      const mainRow = coach.rows[i];
      const sideRow = coach.rows[i + 1];
      const compartmentNum = Math.floor(i / 2) + 1;
      
      compartments.push(
        <div key={compartmentNum} className="relative">
          {compartmentNum > 1 && <CompartmentDivider />}
          
          {/* Compartment container with AC styling */}
          <div className="bg-gradient-to-r from-blue-50/50 via-white to-blue-50/50 rounded-xl p-4 border border-blue-200/40 shadow-sm">
            <div className="flex items-start gap-3">
              {/* Left berths */}
              <div className="flex items-center gap-1">
                <div className="flex flex-col gap-1 text-right pr-1">
                  <BerthLabel label="UB" position="left" />
                  <BerthLabel label="LB" position="left" />
                </div>
                <div className="flex flex-col gap-1.5">
                  {mainRow.seats.slice(0, 2).reverse().map(seat => (
                    <Seat
                      key={seat.id}
                      seat={seat}
                      onSelect={onSeatSelect}
                      isSelected={isSeatSelected(seat)}
                    />
                  ))}
                </div>
              </div>
              
              {/* Aisle with AC indicator */}
              <div className="flex flex-col items-center justify-center px-4 py-2">
                <div className="w-14 h-6 rounded-full bg-gradient-to-r from-blue-400 to-blue-500 flex items-center justify-center shadow-inner mb-2">
                  <span className="text-[8px] text-white font-bold tracking-wider">AC</span>
                </div>
                <div className="flex-1 w-px bg-gradient-to-b from-blue-200 via-blue-100 to-blue-200" />
              </div>
              
              {/* Right berths */}
              <div className="flex items-center gap-1">
                <div className="flex flex-col gap-1.5">
                  {mainRow.seats.slice(2).reverse().map(seat => (
                    <Seat
                      key={seat.id}
                      seat={seat}
                      onSelect={onSeatSelect}
                      isSelected={isSeatSelected(seat)}
                    />
                  ))}
                </div>
                <div className="flex flex-col gap-1 text-left pl-1">
                  <BerthLabel label="UB" position="right" />
                  <BerthLabel label="LB" position="right" />
                </div>
              </div>

              {/* Side berths */}
              {sideRow && (
                <div className="ml-auto flex items-center gap-1 pl-4 border-l border-blue-200/50">
                  <div className="flex flex-col gap-1.5">
                    {sideRow.seats.map(seat => (
                      <Seat
                        key={seat.id}
                        seat={seat}
                        onSelect={onSeatSelect}
                        isSelected={isSeatSelected(seat)}
                      />
                    ))}
                  </div>
                  <div className="flex flex-col gap-1 text-left pl-1">
                    <BerthLabel label="SU" position="right" />
                    <BerthLabel label="SL" position="right" />
                  </div>
                </div>
              )}
            </div>
            
            {/* Compartment number */}
            <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-blue-500/20 border border-blue-400/30 flex items-center justify-center">
              <span className="text-[9px] font-bold text-blue-600">{compartmentNum}</span>
            </div>
          </div>
        </div>
      );
    }
    
    return <div className="space-y-1">{compartments}</div>;
  };

  const renderChairCarLayout = () => (
    <div className="space-y-0.5">
      {/* Column headers */}
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border">
        <div className="w-8" />
        <div className="flex gap-1.5">
          {['A', 'B', 'C'].map(col => (
            <div key={col} className="w-11 h-6 rounded-md bg-emerald-100 border border-emerald-200 flex items-center justify-center">
              <span className="text-xs font-bold text-emerald-700">{col}</span>
            </div>
          ))}
        </div>
        <div className="w-10 flex items-center justify-center">
          <div className="px-2 py-1 bg-muted rounded text-[9px] font-medium text-muted-foreground">AISLE</div>
        </div>
        <div className="flex gap-1.5">
          {['D', 'E'].map(col => (
            <div key={col} className="w-11 h-6 rounded-md bg-emerald-100 border border-emerald-200 flex items-center justify-center">
              <span className="text-xs font-bold text-emerald-700">{col}</span>
            </div>
          ))}
        </div>
      </div>
      
      {/* Rows */}
      {coach.rows.map((row, idx) => (
        <div 
          key={row.rowNumber} 
          className={cn(
            "flex items-center gap-2 py-1 px-2 rounded-lg transition-colors",
            idx % 2 === 0 ? 'bg-muted/20' : 'bg-transparent'
          )}
        >
          {/* Row number */}
          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-[10px] font-bold text-primary">{row.rowNumber}</span>
          </div>
          
          {/* Left side (3 seats) */}
          <div className="flex gap-1.5">
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
          <div className="w-10 flex items-center justify-center">
            <div className="w-0.5 h-8 bg-gradient-to-b from-transparent via-border to-transparent rounded-full" />
          </div>
          
          {/* Right side (2 seats) */}
          <div className="flex gap-1.5">
            {row.seats.slice(3).map(seat => (
              <Seat
                key={seat.id}
                seat={seat}
                onSelect={onSeatSelect}
                isSelected={isSeatSelected(seat)}
              />
            ))}
          </div>
          
          {/* Window indicator for edge rows */}
          {(idx === 0 || idx === coach.rows.length - 1) && (
            <div className="ml-2 px-2 py-0.5 bg-sky-100 rounded text-[8px] text-sky-600 font-medium">
              EXIT
            </div>
          )}
        </div>
      ))}
    </div>
  );

  const getCoachIcon = () => {
    switch (coach.type) {
      case 'sleeper':
        return (
          <div className="flex items-center gap-2">
            <div className="w-4 h-8 bg-gradient-to-b from-amber-400 to-amber-500 rounded-sm" />
            <span className="text-sm font-medium text-foreground">Sleeper Class</span>
          </div>
        );
      case 'ac':
        return (
          <div className="flex items-center gap-2">
            <div className="w-4 h-8 bg-gradient-to-b from-blue-400 to-blue-600 rounded-sm" />
            <span className="text-sm font-medium text-foreground">AC 2-Tier</span>
          </div>
        );
      case 'chair':
        return (
          <div className="flex items-center gap-2">
            <div className="w-4 h-8 bg-gradient-to-b from-emerald-400 to-emerald-600 rounded-sm" />
            <span className="text-sm font-medium text-foreground">Chair Car</span>
          </div>
        );
    }
  };

  return (
    <div className="animate-fade-in">
      <SeatLegend />
      
      <div className="mt-6 p-6 bg-card rounded-2xl border border-border shadow-lg overflow-x-auto">
        {/* Coach header */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
          {getCoachIcon()}
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">
              {coach.totalSeats} seats
            </span>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-muted rounded-full">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-medium text-muted-foreground">Live</span>
            </div>
          </div>
        </div>
        
        <div className="min-w-fit">
          {coach.type === 'sleeper' && renderSleeperLayout()}
          {coach.type === 'ac' && renderACLayout()}
          {coach.type === 'chair' && renderChairCarLayout()}
        </div>
        
        {/* Coach footer */}
        <div className="mt-6 pt-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
          <span>← Entry/Exit</span>
          <span>Coach {coach.name}</span>
          <span>Toilet →</span>
        </div>
      </div>
    </div>
  );
};
