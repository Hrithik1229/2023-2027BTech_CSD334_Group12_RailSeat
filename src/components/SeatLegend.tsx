const LegendItem = ({ 
  color, 
  label, 
  borderColor 
}: { 
  color: string; 
  label: string; 
  borderColor: string;
}) => (
  <div className="flex items-center gap-2">
    <div 
      className={`w-6 h-6 rounded-md border-2 ${color} ${borderColor}`}
    />
    <span className="text-sm text-muted-foreground">{label}</span>
  </div>
);

export const SeatLegend = () => {
  return (
    <div className="flex flex-wrap gap-4 p-4 bg-muted/50 rounded-lg">
      <LegendItem 
        color="bg-emerald-100" 
        borderColor="border-emerald-400"
        label="Available" 
      />
      <LegendItem 
        color="bg-blue-500" 
        borderColor="border-blue-600"
        label="Selected" 
      />
      <LegendItem 
        color="bg-gray-200" 
        borderColor="border-gray-300"
        label="Booked" 
      />
      <LegendItem 
        color="bg-amber-100" 
        borderColor="border-amber-400"
        label="Locked" 
      />
    </div>
  );
};
