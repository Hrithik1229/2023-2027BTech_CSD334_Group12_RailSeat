import { cn } from '@/lib/utils';

interface CoachSelectorProps {
  coaches: string[];
  selectedCoach: string;
  onSelect: (coach: string) => void;
}

type CoachMeta = {
  label: string;
  shortLabel: string;
  color: string;
  bgSelected: string;
  bgUnselected: string;
  dot: string;
  textSelected: string;
};

const getCoachMeta = (coachId: string): CoachMeta => {
  const id = coachId.toUpperCase();
  if (/^[AB]/.test(id) || id.startsWith('H'))
    return {
      label: 'AC Tier', shortLabel: 'AC',
      color: 'from-blue-500 to-blue-700',
      bgSelected: 'bg-blue-600 border-blue-500 shadow-blue-500/30',
      bgUnselected: 'bg-blue-50 border-blue-200 hover:border-blue-400 hover:bg-blue-100',
      dot: 'bg-blue-500',
      textSelected: 'text-white',
    };
  if (id.startsWith('S'))
    return {
      label: 'Sleeper', shortLabel: 'SL',
      color: 'from-amber-500 to-orange-600',
      bgSelected: 'bg-amber-500 border-amber-400 shadow-amber-500/30',
      bgUnselected: 'bg-amber-50 border-amber-200 hover:border-amber-400 hover:bg-amber-100',
      dot: 'bg-amber-500',
      textSelected: 'text-white',
    };
  if (id.startsWith('C') || id.startsWith('E'))
    return {
      label: 'Chair Car', shortLabel: 'CC',
      color: 'from-emerald-500 to-green-600',
      bgSelected: 'bg-emerald-600 border-emerald-500 shadow-emerald-500/30',
      bgUnselected: 'bg-emerald-50 border-emerald-200 hover:border-emerald-400 hover:bg-emerald-100',
      dot: 'bg-emerald-500',
      textSelected: 'text-white',
    };
  return {
    label: 'General', shortLabel: 'GN',
    color: 'from-slate-400 to-slate-600',
    bgSelected: 'bg-slate-600 border-slate-500 shadow-slate-500/30',
    bgUnselected: 'bg-slate-50 border-slate-200 hover:border-slate-400 hover:bg-slate-100',
    dot: 'bg-slate-400',
    textSelected: 'text-white',
  };
};

export const CoachSelector = ({ coaches, selectedCoach, onSelect }: CoachSelectorProps) => {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-1 h-5 rounded-full bg-gradient-to-b from-primary to-blue-600" />
          <h3 className="text-sm font-bold text-foreground uppercase tracking-widest">
            Select Coach
          </h3>
        </div>
        <span className="text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full font-medium">
          {coaches.length} available
        </span>
      </div>

      {/* Train diagram strip */}
      <div className="relative flex items-center gap-0 overflow-x-auto pb-2 scrollbar-thin">
        {/* Engine coach pill (non-bookable, display only) */}
        <div
          className="flex-shrink-0 flex flex-col items-center justify-center w-14 h-10 rounded-md border-2 bg-slate-700 border-slate-600 mr-0"
          title="Engine"
        >
          <span className="text-[11px] font-black leading-none text-white">ENG</span>
          <span className="text-[8px] font-medium mt-0.5 uppercase tracking-wide text-slate-300">Engine</span>
        </div>

        {/* Coach pills in a connected strip */}
        <div className="flex items-center gap-0">
          {coaches.map((coach, idx) => {
            const meta = getCoachMeta(coach);
            const isSelected = selectedCoach === coach;
            return (
              <div key={coach} className="flex items-center">
                {/* Connector */}
                {idx > 0 && (
                  <div className="w-2 h-1.5 bg-slate-300 rounded-none flex-shrink-0" />
                )}
                <button
                  onClick={() => onSelect(coach)}
                  title={`${coach} — ${meta.label}`}
                  className={cn(
                    'relative flex-shrink-0 flex flex-col items-center justify-center w-14 h-10 rounded-md border-2 transition-all duration-200 font-bold text-xs',
                    isSelected
                      ? `${meta.bgSelected} text-white shadow-lg scale-105`
                      : `${meta.bgUnselected} text-slate-700`
                  )}
                >
                  <span className={cn('text-[11px] font-black leading-none', isSelected ? 'text-white' : 'text-slate-800')}>
                    {coach}
                  </span>
                  <span className={cn('text-[8px] font-medium mt-0.5 uppercase tracking-wide', isSelected ? 'text-white/80' : 'text-slate-400')}>
                    {meta.shortLabel}
                  </span>
                  {isSelected && (
                    <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 border-r-2 border-b-2 border-current bg-inherit" />
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Rear of train */}
        <div className="flex-shrink-0 flex items-center justify-center w-6 h-10 ml-1">
          <div className="w-4 h-8 rounded-r-lg bg-gradient-to-r from-slate-300 to-slate-400 border border-slate-400/50" />
        </div>
      </div>

      {/* Selected coach detail pill */}
      {selectedCoach && (() => {
        const meta = getCoachMeta(selectedCoach);
        return (
          <div className={cn(
            'flex items-center gap-3 px-4 py-2.5 rounded-xl border-2 transition-all',
            meta.bgSelected.replace('shadow-', ''),
          )}>
            <div className={cn('w-2.5 h-2.5 rounded-full animate-pulse', meta.dot)} />
            <span className="text-sm font-bold text-white">Coach {selectedCoach}</span>
            <span className="text-xs text-white/70 ml-auto">{meta.label}</span>
          </div>
        );
      })()}
    </div>
  );
};
