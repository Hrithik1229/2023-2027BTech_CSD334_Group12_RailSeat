import { motion } from 'framer-motion';
import { BedDouble, Briefcase, Coffee, ShieldCheck, Users, Wind } from 'lucide-react';
import React, { useState } from 'react';

interface Coach {
  id: string;
  type: string;
  icon: React.ElementType;
  description: string;
  color: string;
  glowColor: string;
}

const coaches: Coach[] = [
  { id: 'engine', type: 'Locomotive', icon: ShieldCheck, description: 'Powering your journey safely', color: 'from-slate-800 to-slate-900', glowColor: 'shadow-slate-500/50' },
  { id: 'c1', type: 'AC First Class', icon: Briefcase, description: 'Premium comfort & privacy', color: 'from-blue-600 to-indigo-700', glowColor: 'shadow-blue-500/50' },
  { id: 'c2', type: 'AC 2-Tier', icon: Wind, description: 'Spacious and cool', color: 'from-cyan-500 to-blue-600', glowColor: 'shadow-cyan-500/50' },
  { id: 'c3', type: 'Pantry Car', icon: Coffee, description: 'Fresh meals on wheels', color: 'from-orange-500 to-red-600', glowColor: 'shadow-orange-500/50' },
  { id: 'c4', type: 'Sleeper', icon: BedDouble, description: 'Restful overnight travel', color: 'from-teal-500 to-emerald-600', glowColor: 'shadow-teal-500/50' },
  { id: 'c5', type: 'General seating', icon: Users, description: 'Economical and social', color: 'from-slate-500 to-slate-600', glowColor: 'shadow-slate-400/50' },
];

export const InteractiveTrain: React.FC = () => {
  const [hoveredCoach, setHoveredCoach] = useState<string | null>(null);

  return (
    <div className="w-full py-16 flex flex-col items-center justify-center overflow-visible relative">
      <div className="absolute top-0 w-full text-center">
        <motion.div
           initial={{ opacity: 0, y: -20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ duration: 0.5, delay: 0.8 }}
        >
          <p className="text-primary font-bold tracking-widest uppercase text-sm mb-2">Interactive Fleet</p>
          <h3 className="text-2xl md:text-3xl font-display font-bold text-foreground">Hover to Explore Coaches</h3>
        </motion.div>
      </div>
      
      {/* Train Track */}
      <div className="absolute bottom-10 w-full h-2 bg-gradient-to-r from-transparent via-slate-400/50 to-transparent flex flex-row overflow-hidden">
         {/* Moving track lines overlay */}
         <motion.div 
           className="w-[200%] h-full flex" 
           animate={{ x: ['0%', '-50%'] }} 
           transition={{ ease: "linear", duration: 2, repeat: Infinity }}
         >
           {Array.from({ length: 40 }).map((_, i) => (
             <div key={i} className="w-8 h-full border-r-4 border-slate-500/40 skew-x-[-45deg] mx-2"></div>
           ))}
         </motion.div>
      </div>

      <div className="mt-20 relative flex items-end gap-2 md:gap-4 px-4 overflow-x-auto pb-16 pt-10 scrollbar-hide snap-x w-full max-w-6xl mx-auto z-10">
        <motion.div
          className="flex items-end gap-2 md:gap-4"
          initial={{ x: '100vw' }}
          animate={{ x: 0 }}
          transition={{ type: 'spring', stiffness: 40, damping: 20, delay: 0.5 }}
        >
          {coaches.map((coach, index) => {
            const isEngine = index === 0;
            const Icon = coach.icon;
            
            return (
              <motion.div
                key={coach.id}
                className="relative snap-center shrink-0 cursor-pointer"
                onHoverStart={() => setHoveredCoach(coach.id)}
                onHoverEnd={() => setHoveredCoach(null)}
                whileHover={{ scale: 1.05, y: -10 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                {/* Tooltip / Info Box */}
                <motion.div 
                  initial={{ opacity: 0, scale: 0.8, y: 20 }}
                  animate={{ 
                    opacity: hoveredCoach === coach.id ? 1 : 0, 
                    scale: hoveredCoach === coach.id ? 1 : 0.8,
                    y: hoveredCoach === coach.id ? 0 : 20
                  }}
                  className="absolute -top-24 left-1/2 -translate-x-1/2 w-48 bg-popover text-popover-foreground p-3 rounded-xl shadow-xl border border-border/50 z-20 pointer-events-none"
                >
                  <div className="font-bold text-sm mb-1">{coach.type}</div>
                  <div className="text-xs text-muted-foreground">{coach.description}</div>
                  
                  {/* Triangle pointing down */}
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-popover border-b border-r border-border/50 rotate-45"></div>
                </motion.div>

                {/* Coach Body */}
                <div 
                  className={`
                    relative 
                    ${isEngine ? 'w-32 md:w-40 rounded-r-3xl rounded-l-md' : 'w-24 md:w-32 rounded-md'} 
                    h-20 md:h-24 
                    bg-gradient-to-br ${coach.color} 
                    shadow-lg ${hoveredCoach === coach.id ? coach.glowColor : 'shadow-black/20'} 
                    border-b-4 border-slate-900 
                    flex items-center justify-center
                    transition-shadow duration-300
                    overflow-hidden
                  `}
                >
                  {/* Engine specific styling like a windshield */}
                  {isEngine && (
                     <div className="absolute right-2 top-2 w-8 h-8 bg-black/40 rounded-tr-xl border-t border-r border-white/20"></div>
                  )}

                  {/* Windows for passenger coaches */}
                  {!isEngine && (
                    <div className="absolute top-4 w-full px-2 flex justify-around">
                       <div className="w-6 h-6 bg-black/40 rounded-sm border-t border-white/10"></div>
                       <div className="w-6 h-6 bg-black/40 rounded-sm border-t border-white/10"></div>
                       <div className="w-6 h-6 bg-black/40 rounded-sm border-t border-white/10"></div>
                    </div>
                  )}

                  <Icon className={`w-8 h-8 text-white/90 ${isEngine ? 'mr-4' : 'mt-4'} z-10 drop-shadow-md`} />
                  
                  {/* Subtle reflection overlay */}
                  <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent pointer-events-none"></div>
                </div>

                {/* Wheels */}
                <div className="absolute -bottom-3 w-full px-4 flex justify-between">
                   <motion.div 
                     className="w-6 h-6 bg-slate-800 rounded-full border-2 border-slate-400 flex items-center justify-center shadow-inner"
                     animate={{ rotate: 360 }}
                     transition={{ ease: "linear", duration: 1, repeat: Infinity }}
                   >
                     <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
                   </motion.div>
                   <motion.div 
                     className="w-6 h-6 bg-slate-800 rounded-full border-2 border-slate-400 flex items-center justify-center shadow-inner"
                     animate={{ rotate: 360 }}
                     transition={{ ease: "linear", duration: 1, repeat: Infinity }}
                   >
                     <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
                   </motion.div>
                </div>

                {/* Connection between coaches */}
                {!isEngine && (
                  <div className="absolute top-1/2 -left-3 md:-left-4 w-3 md:w-4 h-2 bg-slate-700 -translate-y-1/2 rounded-full z-0"></div>
                )}
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </div>
  );
};
