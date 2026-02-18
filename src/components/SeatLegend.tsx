const LEGEND_ITEMS = [
  {
    cls: 'seat-available',
    label: 'Available',
    dot: 'bg-emerald-400',
  },
  {
    cls: 'seat-selected',
    label: 'Selected',
    dot: 'bg-blue-500',
  },
  {
    cls: 'seat-booked',
    label: 'Booked',
    dot: 'bg-gray-300',
  },
  {
    cls: 'seat-locked',
    label: 'Locked',
    dot: 'bg-amber-400',
  },
];

export const SeatLegend = () => (
  <div className="flex flex-wrap items-center gap-3 px-4 py-3 bg-muted/40 rounded-xl border border-border/40 backdrop-blur-sm">
    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mr-1">Legend</span>
    {LEGEND_ITEMS.map(({ cls, label, dot }) => (
      <div key={label} className="flex items-center gap-2">
        {/* Mini seat swatch using the real CSS class */}
        <div className={`${cls} !w-6 !h-6 !text-[8px] !rounded-md !shadow-none pointer-events-none select-none`}>
          <span className="opacity-0">0</span>
        </div>
        <span className="text-xs font-medium text-foreground/80">{label}</span>
      </div>
    ))}
  </div>
);
