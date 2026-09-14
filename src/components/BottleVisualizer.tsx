import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { RotateCw, Pause, Droplets, Sparkles, CheckCircle2 } from 'lucide-react';

interface BottleVisualizerProps {
  selectedSides: number;
  designUrl?: string;
  designUrls?: string[];
  className?: string;
  interactive?: boolean;
  focusedSide?: number | null;
}

export const BottleVisualizer: React.FC<BottleVisualizerProps> = ({
  selectedSides,
  designUrl,
  designUrls,
  className,
  interactive = true,
  focusedSide,
}) => {
  const [isRotating, setIsRotating] = useState(true);
  const [activeFace, setActiveFace] = useState<number | null>(null);

  // Sync with external focusedSide if supplied
  useEffect(() => {
    if (focusedSide !== undefined && focusedSide !== null) {
      setActiveFace(focusedSide);
      setIsRotating(false);
    }
  }, [focusedSide]);

  // Face rotation Y angles in degrees
  const faceAngles: Record<number, number> = {
    1: 0,    // Front
    2: -90,  // Right
    3: -180, // Back
    4: -270, // Left
  };

  const getSideImage = (sideIndex: number): string | undefined => {
    if (designUrls && designUrls.length > 0) {
      return designUrls[sideIndex - 1] || undefined;
    }
    return designUrl;
  };

  const handleSelectSide = (sideNum: number) => {
    setIsRotating(false);
    setActiveFace(sideNum);
  };

  const handleTogglePlay = () => {
    if (activeFace !== null) {
      setActiveFace(null);
      setIsRotating(true);
    } else {
      setIsRotating(!isRotating);
    }
  };

  const currentRotation = activeFace !== null ? faceAngles[activeFace] : undefined;

  return (
    <div className={cn("flex flex-col items-center select-none w-full", className)}>
      {/* 3D Scene Container */}
      <div className="relative w-full max-w-sm h-80 flex items-center justify-center perspective-1100 py-2">
        {/* Soft Ambient Contact Shadow Under Bottle */}
        <div className="absolute bottom-3 w-40 h-8 bg-blue-950/20 rounded-full blur-lg transform scale-y-50" />

        {/* 3D Rotating Square Water Bottle */}
        <motion.div
          className="relative w-36 h-60 preserve-3d cursor-grab active:cursor-grabbing"
          animate={
            activeFace !== null
              ? { rotateX: -10, rotateY: currentRotation }
              : isRotating
              ? { rotateX: -10, rotateY: [0, 360] }
              : { rotateX: -10 }
          }
          transition={
            activeFace !== null
              ? { type: "spring", stiffness: 120, damping: 18 }
              : isRotating
              ? { rotateY: { duration: 12, repeat: Infinity, ease: "linear" }, rotateX: { duration: 0.3 } }
              : { duration: 0.3 }
          }
        >
          {/* ========================================================= */}
          {/* BOTTLE CAP & NECK ASSEMBLY (Sits at top of square body)   */}
          {/* ========================================================= */}
          <div className="absolute -top-11 left-1/2 -translate-x-1/2 w-14 h-11 preserve-3d pointer-events-none z-20">
            {/* Cylindrical Bottle Neck Collar (Clear Glass / PET) */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-9 h-3 rounded-full bg-gradient-to-r from-sky-200/90 via-white/95 to-sky-300/80 border border-sky-300 shadow-sm" />

            {/* Tamper-evident Security Ring */}
            <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 w-11 h-1.5 rounded-full bg-blue-700 border-t border-blue-400 shadow-xs" />

            {/* Sports / Screw Cap Cylindrical Body with Grip Ridges */}
            <div className="absolute top-1 left-1/2 -translate-x-1/2 w-11 h-6.5 rounded-t-lg bg-gradient-to-r from-blue-700 via-blue-500 to-blue-800 shadow-md border border-blue-400/60 overflow-hidden flex items-center justify-between px-0.5">
              {/* Vertical Cap Ribs / Grip Grooves */}
              <div className="w-full h-full flex justify-between opacity-40">
                <span className="w-0.5 h-full bg-blue-950" />
                <span className="w-0.5 h-full bg-blue-300" />
                <span className="w-0.5 h-full bg-blue-950" />
                <span className="w-0.5 h-full bg-blue-300" />
                <span className="w-0.5 h-full bg-blue-950" />
                <span className="w-0.5 h-full bg-blue-300" />
                <span className="w-0.5 h-full bg-blue-950" />
              </div>
            </div>

            {/* Cap Top Circular Disk (Flat disc rotated to face top) */}
            <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-11 h-3 rounded-full bg-gradient-to-b from-blue-400 to-blue-700 border border-blue-300 shadow-inner" />
          </div>

          {/* ========================================================= */}
          {/* SIDE 1 - FRONT FACE                                       */}
          {/* ========================================================= */}
          <div
            className={cn(
              "absolute inset-0 rounded-2xl overflow-hidden flex flex-col justify-between p-2.5 transform translate-z-18 transition-all duration-300 backface-visible shadow-lg border-2",
              selectedSides >= 1
                ? "border-blue-400 bg-white ring-1 ring-blue-300/40"
                : "border-sky-200/60 bg-gradient-to-b from-sky-100/60 via-sky-200/40 to-blue-300/40 backdrop-blur-[2px]"
            )}
          >
            {/* Vertical glass specular shine line on left edge */}
            <div className="absolute top-0 left-1.5 w-1.5 h-full bg-gradient-to-b from-white/80 via-white/30 to-transparent pointer-events-none rounded-full" />

            {/* Subtle water meniscus fill inside bottle */}
            <div className="absolute bottom-0 inset-x-0 h-4/5 bg-gradient-to-t from-sky-500/15 via-sky-400/5 to-transparent pointer-events-none -z-0" />

            {/* Top Bottle Header Tag */}
            <div className="relative z-10 w-full flex justify-between items-center text-[9px] font-extrabold">
              <span className={cn(
                "px-2 py-0.5 rounded-md text-[8px] font-black tracking-wider uppercase flex items-center gap-1",
                selectedSides >= 1 ? "bg-blue-600 text-white" : "bg-sky-100 text-sky-700"
              )}>
                <Droplets className="w-2.5 h-2.5" /> Side 1 (Front)
              </span>
              <span className="text-slate-400 text-[8px] font-bold">500ml</span>
            </div>

            {/* Center Label Panel (Advertiser Design or Water Showcase) */}
            <div className="relative z-10 w-full flex-1 my-2 flex flex-col items-center justify-center rounded-xl bg-white/95 border border-slate-200 shadow-xs p-2 overflow-hidden">
              {getSideImage(1) && selectedSides >= 1 ? (
                <img
                  src={getSideImage(1)}
                  alt="Front Side 1 Design"
                  className="max-w-full max-h-full object-contain rounded-lg"
                  referrerPolicy="no-referrer"
                />
              ) : selectedSides >= 1 ? (
                <div className="text-center space-y-1.5">
                  <div className="w-9 h-9 mx-auto bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center shadow-xs">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-blue-700 tracking-tight leading-tight">YOUR BRAND</p>
                    <p className="text-[9px] text-blue-500 font-semibold">Primary Label Face</p>
                  </div>
                  <div className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 rounded text-[7px] font-bold text-blue-700">
                    <CheckCircle2 className="w-2.5 h-2.5" /> Custom Printed
                  </div>
                </div>
              ) : (
                <div className="text-center space-y-1 text-slate-400">
                  <Droplets className="w-6 h-6 mx-auto text-sky-400/60 animate-pulse" />
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-tight">Pure Spring Water</p>
                  <p className="text-[7px] text-slate-400">Unbooked Ad Face</p>
                </div>
              )}
            </div>

            {/* Bottom Bottle Footer */}
            <div className="relative z-10 w-full flex items-center justify-between text-[7px] font-bold text-slate-400 pt-0.5">
              <span>Alkaline pH 7.5</span>
              <span>100% Recyclable</span>
            </div>
          </div>

          {/* ========================================================= */}
          {/* SIDE 2 - RIGHT FACE                                       */}
          {/* ========================================================= */}
          <div
            className={cn(
              "absolute inset-0 rounded-2xl overflow-hidden flex flex-col justify-between p-2.5 transform rotate-y-90-z-18 transition-all duration-300 backface-visible shadow-lg border-2",
              selectedSides >= 2
                ? "border-blue-400 bg-white ring-1 ring-blue-300/40"
                : "border-sky-200/60 bg-gradient-to-b from-sky-100/60 via-sky-200/40 to-blue-300/40 backdrop-blur-[2px]"
            )}
          >
            <div className="absolute top-0 left-1.5 w-1.5 h-full bg-gradient-to-b from-white/80 via-white/30 to-transparent pointer-events-none rounded-full" />
            <div className="absolute bottom-0 inset-x-0 h-4/5 bg-gradient-to-t from-sky-500/15 via-sky-400/5 to-transparent pointer-events-none -z-0" />

            <div className="relative z-10 w-full flex justify-between items-center text-[9px] font-extrabold">
              <span className={cn(
                "px-2 py-0.5 rounded-md text-[8px] font-black tracking-wider uppercase",
                selectedSides >= 2 ? "bg-blue-600 text-white" : "bg-sky-100 text-sky-700"
              )}>
                Side 2 (Right)
              </span>
              <span className="text-slate-400 text-[8px] font-bold">QR / Story</span>
            </div>

            <div className="relative z-10 w-full flex-1 my-2 flex flex-col items-center justify-center rounded-xl bg-white/95 border border-slate-200 shadow-xs p-2 overflow-hidden">
              {selectedSides >= 2 ? (
                getSideImage(2) ? (
                  <img
                    src={getSideImage(2)}
                    alt="Right Side 2 Design"
                    className="max-w-full max-h-full object-contain rounded-lg"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="text-center space-y-1.5">
                    <div className="w-8 h-8 mx-auto border-2 border-blue-500 rounded-lg flex items-center justify-center text-blue-600 font-mono text-[9px] font-black">
                      [QR]
                    </div>
                    <p className="text-xs font-black text-blue-700">QR CODE & PROMO</p>
                    <p className="text-[8px] text-blue-500 font-medium">Scan to redeem or learn more</p>
                  </div>
                )
              ) : (
                <div className="text-center space-y-1 text-slate-400">
                  <p className="text-[9px] font-bold text-slate-500 uppercase">Natural Electrolytes</p>
                  <p className="text-[7px] text-slate-400">Spring Water Profile</p>
                </div>
              )}
            </div>

            <div className="relative z-10 w-full text-center text-[7px] font-bold text-slate-400">
              Zero Calories • Sodium Free
            </div>
          </div>

          {/* ========================================================= */}
          {/* SIDE 3 - BACK FACE                                        */}
          {/* ========================================================= */}
          <div
            className={cn(
              "absolute inset-0 rounded-2xl overflow-hidden flex flex-col justify-between p-2.5 transform rotate-y-180-z-18 transition-all duration-300 backface-visible shadow-lg border-2",
              selectedSides >= 3
                ? "border-blue-400 bg-white ring-1 ring-blue-300/40"
                : "border-sky-200/60 bg-gradient-to-b from-sky-100/60 via-sky-200/40 to-blue-300/40 backdrop-blur-[2px]"
            )}
          >
            <div className="absolute top-0 left-1.5 w-1.5 h-full bg-gradient-to-b from-white/80 via-white/30 to-transparent pointer-events-none rounded-full" />
            <div className="absolute bottom-0 inset-x-0 h-4/5 bg-gradient-to-t from-sky-500/15 via-sky-400/5 to-transparent pointer-events-none -z-0" />

            <div className="relative z-10 w-full flex justify-between items-center text-[9px] font-extrabold">
              <span className={cn(
                "px-2 py-0.5 rounded-md text-[8px] font-black tracking-wider uppercase",
                selectedSides >= 3 ? "bg-blue-600 text-white" : "bg-sky-100 text-sky-700"
              )}>
                Side 3 (Back)
              </span>
              <span className="text-slate-400 text-[8px] font-bold">Nutrition</span>
            </div>

            <div className="relative z-10 w-full flex-1 my-2 flex flex-col items-center justify-center rounded-xl bg-white/95 border border-slate-200 shadow-xs p-2 overflow-hidden">
              {selectedSides >= 3 ? (
                getSideImage(3) ? (
                  <img
                    src={getSideImage(3)}
                    alt="Back Side 3 Design"
                    className="max-w-full max-h-full object-contain rounded-lg"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="text-center space-y-1">
                    <p className="text-xs font-black text-blue-700">BRAND STORY</p>
                    <p className="text-[8px] text-blue-500 font-medium">Secondary message & social handle</p>
                    <span className="inline-block text-[7px] text-blue-600 font-mono mt-1">@YourHandle</span>
                  </div>
                )
              ) : (
                <div className="text-center space-y-1 text-slate-400">
                  <p className="text-[9px] font-bold text-slate-500 uppercase">Mineral Analysis</p>
                  <p className="text-[7px] text-slate-400">Calcium 24mg • Magnesium 12mg</p>
                </div>
              )}
            </div>

            <div className="relative z-10 w-full text-center text-[7px] font-bold text-slate-400">
              Bottled at Source • BPA Free
            </div>
          </div>

          {/* ========================================================= */}
          {/* SIDE 4 - LEFT FACE                                        */}
          {/* ========================================================= */}
          <div
            className={cn(
              "absolute inset-0 rounded-2xl overflow-hidden flex flex-col justify-between p-2.5 transform -rotate-y-90-z-18 transition-all duration-300 backface-visible shadow-lg border-2",
              selectedSides >= 4
                ? "border-blue-400 bg-white ring-1 ring-blue-300/40"
                : "border-sky-200/60 bg-gradient-to-b from-sky-100/60 via-sky-200/40 to-blue-300/40 backdrop-blur-[2px]"
            )}
          >
            <div className="absolute top-0 left-1.5 w-1.5 h-full bg-gradient-to-b from-white/80 via-white/30 to-transparent pointer-events-none rounded-full" />
            <div className="absolute bottom-0 inset-x-0 h-4/5 bg-gradient-to-t from-sky-500/15 via-sky-400/5 to-transparent pointer-events-none -z-0" />

            <div className="relative z-10 w-full flex justify-between items-center text-[9px] font-extrabold">
              <span className={cn(
                "px-2 py-0.5 rounded-md text-[8px] font-black tracking-wider uppercase",
                selectedSides >= 4 ? "bg-blue-600 text-white" : "bg-sky-100 text-sky-700"
              )}>
                Side 4 (Left)
              </span>
              <span className="text-slate-400 text-[8px] font-bold">360° Wrap</span>
            </div>

            <div className="relative z-10 w-full flex-1 my-2 flex flex-col items-center justify-center rounded-xl bg-white/95 border border-slate-200 shadow-xs p-2 overflow-hidden">
              {selectedSides >= 4 ? (
                getSideImage(4) ? (
                  <img
                    src={getSideImage(4)}
                    alt="Left Side 4 Design"
                    className="max-w-full max-h-full object-contain rounded-lg"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="text-center space-y-1">
                    <p className="text-xs font-black text-blue-700">FULL 360° WRAP</p>
                    <p className="text-[8px] text-blue-500 font-medium">All 4 Square Bottle Faces Active</p>
                    <span className="inline-block px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded text-[7px] font-black">
                      Max Impact
                    </span>
                  </div>
                )
              ) : (
                <div className="text-center space-y-1 text-slate-400">
                  <p className="text-[9px] font-bold text-slate-500 uppercase">Eco Packaging</p>
                  <p className="text-[7px] text-slate-400">100% Recyclable Bottle</p>
                </div>
              )}
            </div>

            <div className="relative z-10 w-full text-center text-[7px] font-bold text-slate-400">
              AquaAds Certified Sustainable
            </div>
          </div>
        </motion.div>
      </div>

      {/* Interactive Controls */}
      {interactive && (
        <div className="w-full mt-3 flex flex-col items-center gap-3">
          {/* Quick-Face Selector Buttons */}
          <div className="grid grid-cols-4 gap-1.5 w-full max-w-xs">
            {[1, 2, 3, 4].map((sideNum) => {
              const isSelected = activeFace === sideNum;
              const isCovered = selectedSides >= sideNum;
              return (
                <button
                  key={sideNum}
                  type="button"
                  onClick={() => handleSelectSide(sideNum)}
                  className={cn(
                    "py-1.5 px-1 rounded-xl text-xs font-bold flex flex-col items-center transition-all",
                    isSelected
                      ? "bg-blue-600 text-white shadow-md shadow-blue-200 scale-105"
                      : isCovered
                      ? "bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200"
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200 border border-slate-200"
                  )}
                >
                  <span className="text-[10px] tracking-tight">Side {sideNum}</span>
                  <span className="text-[8px] font-normal opacity-85">
                    {sideNum === 1 ? 'Front' : sideNum === 2 ? 'Right' : sideNum === 3 ? 'Back' : 'Left'}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Auto Spin Toggle and Status */}
          <div className="flex items-center justify-between w-full max-w-xs px-2 text-xs text-slate-500">
            <div className="flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <span>{selectedSides} of 4 Sides Branded</span>
            </div>
            <button
              type="button"
              onClick={handleTogglePlay}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 hover:bg-slate-200 rounded-full font-bold text-slate-700 transition-colors"
            >
              {isRotating && activeFace === null ? (
                <>
                  <Pause className="w-3 h-3 text-slate-600" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <RotateCw className="w-3 h-3 text-blue-600" />
                  <span>360° Spin</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* 3D Transform Styles */}
      <style>{`
        .perspective-1100 { perspective: 1100px; }
        .preserve-3d { transform-style: preserve-3d; }
        .translate-z-18 { transform: translateZ(4.5rem); }
        .rotate-y-90-z-18 { transform: rotateY(90deg) translateZ(4.5rem); }
        .rotate-y-180-z-18 { transform: rotateY(180deg) translateZ(4.5rem); }
        .-rotate-y-90-z-18 { transform: rotateY(-90deg) translateZ(4.5rem); }
        .rotate-x-90 { transform: rotateX(90deg); }
        .-rotate-x-90 { transform: rotateX(-90deg); }
        .translate-z-30 { transform: translateZ(7.5rem); }
        .backface-visible { backface-visibility: visible; }
      `}</style>
    </div>
  );
};
