import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface BottleVisualizerProps {
  selectedSides: number;
  designUrl?: string;
}

export const BottleVisualizer: React.FC<BottleVisualizerProps> = ({ selectedSides, designUrl }) => {
  return (
    <div className="relative w-48 h-64 mx-auto perspective-1000">
      <motion.div
        className="relative w-full h-full preserve-3d"
        animate={{ rotateY: [0, 360] }}
        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
      >
        {/* Front */}
        <div className={cn(
          "absolute inset-0 bg-white border-2 border-slate-200 flex items-center justify-center transform translate-z-24",
          selectedSides >= 1 ? "bg-blue-50 border-blue-400" : ""
        )}>
          {selectedSides >= 1 && (
            <div className="w-full h-full p-4 flex flex-col items-center justify-center text-center">
              {designUrl ? (
                <img src={designUrl} alt="Ad" className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />
              ) : (
                <span className="text-xs font-bold text-blue-600">SIDE 1</span>
              )}
            </div>
          )}
        </div>

        {/* Right */}
        <div className={cn(
          "absolute inset-0 bg-white border-2 border-slate-200 flex items-center justify-center transform rotate-y-90 translate-z-24",
          selectedSides >= 2 ? "bg-blue-50 border-blue-400" : ""
        )}>
          {selectedSides >= 2 && <span className="text-xs font-bold text-blue-600">SIDE 2</span>}
        </div>

        {/* Back */}
        <div className={cn(
          "absolute inset-0 bg-white border-2 border-slate-200 flex items-center justify-center transform rotate-y-180 translate-z-24",
          selectedSides >= 3 ? "bg-blue-50 border-blue-400" : ""
        )}>
          {selectedSides >= 3 && <span className="text-xs font-bold text-blue-600">SIDE 3</span>}
        </div>

        {/* Left */}
        <div className={cn(
          "absolute inset-0 bg-white border-2 border-slate-200 flex items-center justify-center transform -rotate-y-90 translate-z-24",
          selectedSides >= 4 ? "bg-blue-50 border-blue-400" : ""
        )}>
          {selectedSides >= 4 && <span className="text-xs font-bold text-blue-600">SIDE 4</span>}
        </div>

        {/* Top (Cap) */}
        <div className="absolute top-0 left-1/4 w-1/2 h-8 bg-slate-300 transform -rotate-x-90 translate-y--4 translate-z-0"></div>
      </motion.div>

      <style>{`
        .perspective-1000 { perspective: 1000px; }
        .preserve-3d { transform-style: preserve-3d; }
        .translate-z-24 { transform: translateZ(6rem); }
        .rotate-y-90 { transform: rotateY(90deg); }
        .rotate-y-180 { transform: rotateY(180deg); }
        .-rotate-y-90 { transform: rotateY(-90deg); }
        .-rotate-x-90 { transform: rotateX(90deg); }
        .translate-y--4 { transform: translateY(-2rem); }
      `}</style>
    </div>
  );
};
