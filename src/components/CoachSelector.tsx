import { cn } from '@/lib/utils';

interface CoachSelectorProps {
  coaches: string[];
  selectedCoach: string;
  onSelect: (coach: string) => void;
}

const getCoachTypeLabel = (coachId: string): string => {
  if (coachId.startsWith('A') || coachId.startsWith('B')) return 'AC 2-Tier';
  if (coachId.startsWith('S')) return 'Sleeper';
  if (coachId.startsWith('C')) return 'Chair Car';
  return 'General';
};

const getCoachColor = (coachId: string): string => {
  if (coachId.startsWith('A') || coachId.startsWith('B')) return 'bg-blue-500';
  if (coachId.startsWith('S')) return 'bg-amber-500';
  if (coachId.startsWith('C')) return 'bg-emerald-500';
  return 'bg-gray-500';
};

export const CoachSelector = ({ coaches, selectedCoach, onSelect }: CoachSelectorProps) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest">
            Select Coach
          </h3>
          <span className="text-xs text-muted-foreground bg-secondary/50 px-2 py-1 rounded-md">
            {coaches.length} Coaches Available
          </span>
      </div>
      <div className="flex flex-wrap gap-3">
        {coaches.map((coach) => (
          <button
            key={coach}
            onClick={() => onSelect(coach)}
            className={cn(
              'group relative flex flex-col items-center min-w-[90px] p-3 rounded-2xl border transition-all duration-300 ease-out',
              selectedCoach === coach 
                ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/25 scale-105' 
                : 'bg-card text-foreground border-border hover:border-primary/50 hover:bg-secondary/50'
            )}
          >
            <div className="flex items-center gap-2 mb-1">
              <div className={cn(
                  'w-2.5 h-2.5 rounded-full ring-2 ring-white/20', 
                  getCoachColor(coach),
                  selectedCoach === coach ? 'animate-pulse' : ''
              )} />
              <span className="font-bold text-lg leading-none">{coach}</span>
            </div>
            <span className={cn(
              'text-[10px] font-medium tracking-wide uppercase',
              selectedCoach === coach ? 'text-primary-foreground/90' : 'text-muted-foreground group-hover:text-foreground/80'
            )}>
              {getCoachTypeLabel(coach)}
            </span>
            
            {selectedCoach === coach && (
                <div className="absolute -bottom-1 w-12 h-1 bg-white/20 rounded-full blur-[2px]"></div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};
