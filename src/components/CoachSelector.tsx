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
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
        Select Coach
      </h3>
      <div className="flex flex-wrap gap-2">
        {coaches.map((coach) => (
          <button
            key={coach}
            onClick={() => onSelect(coach)}
            className={cn(
              'coach-tab flex flex-col items-center min-w-[80px] transition-all duration-200',
              selectedCoach === coach ? 'coach-tab-active scale-105' : 'coach-tab-inactive'
            )}
          >
            <div className="flex items-center gap-2">
              <div className={cn('w-2 h-2 rounded-full', getCoachColor(coach))} />
              <span className="font-semibold">{coach}</span>
            </div>
            <span className={cn(
              'text-xs mt-1',
              selectedCoach === coach ? 'text-primary-foreground/80' : 'text-muted-foreground'
            )}>
              {getCoachTypeLabel(coach)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
