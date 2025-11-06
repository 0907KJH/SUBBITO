import React from 'react';

// Enhanced AcousticHeatmap that fills the container vertically with Stage/Audience labels
export default function AcousticHeatmap({ positions = [], config = {}, frequency = 80, arcAngle }) {
  return (
    <div className="w-full h-full flex flex-col bg-gradient-to-b from-slate-800 to-slate-900 rounded relative">
      {/* STAGE label at top */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 text-xs font-bold text-slate-400 z-10">
        STAGE
      </div>
      
      {/* Main content fills remaining space */}
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="text-center text-sm text-slate-300">
          <div className="font-semibold mb-2">Mappa acustica (placeholder)</div>
          <div>Posizioni: {positions?.length ?? 0}</div>
          <div>Freq: {frequency} Hz</div>
          {typeof arcAngle !== 'undefined' && <div>Angolo Arc: {arcAngle}°</div>}
          <div className="mt-3 text-xs text-slate-400">
            Sostituire con l'implementazione reale del componente per visualizzare SPL
          </div>
        </div>
      </div>
      
      {/* AUDIENCE label at bottom */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs font-bold text-slate-400 z-10">
        AUDIENCE
      </div>
    </div>
  );
}


