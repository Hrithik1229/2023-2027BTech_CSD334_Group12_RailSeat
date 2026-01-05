const LegendItem = ({ 
  gradientFrom, 
  gradientTo,
  label, 
  borderColor,
  glow
}: { 
  gradientFrom: string;
  gradientTo: string;
  label: string; 
  borderColor: string;
  glow?: string;
}) => (
  <div className="flex items-center gap-2.5">
    <div 
      className={`w-8 h-8 rounded-lg border-2 shadow-sm flex items-center justify-center ${borderColor} ${glow || ''}`}
      style={{ background: `linear-gradient(145deg, ${gradientFrom}, ${gradientTo})` }}
    >
      <span className="text-[10px] font-bold text-gray-500/50">00</span>
    </div>
    <span className="text-sm font-medium text-foreground">{label}</span>
  </div>
);

export const SeatLegend = () => {
  return (
    <div className="flex flex-wrap gap-6 p-4 bg-gradient-to-r from-muted/60 via-muted/40 to-muted/60 rounded-xl border border-border/50">
      <LegendItem 
        gradientFrom="hsl(142 70% 92%)" 
        gradientTo="hsl(142 60% 85%)"
        borderColor="border-emerald-400/80"
        label="Available" 
      />
      <LegendItem 
        gradientFrom="hsl(210 90% 55%)" 
        gradientTo="hsl(210 85% 45%)"
        borderColor="border-blue-500"
        label="Selected"
        glow="shadow-md shadow-blue-400/30"
      />
      <LegendItem 
        gradientFrom="hsl(215 10% 88%)" 
        gradientTo="hsl(215 10% 82%)"
        borderColor="border-gray-300"
        label="Booked" 
      />
      <LegendItem 
        gradientFrom="hsl(38 90% 90%)" 
        gradientTo="hsl(38 80% 82%)"
        borderColor="border-amber-400/80"
        label="Locked" 
      />
    </div>
  );
};
