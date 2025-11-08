import React from 'react';

// Small placeholder for the AcousticHeatmap used in Prediction page.
// In the original project this would render a complex canvas/SVG heatmap.
export default function AcousticHeatmap({ positions = [], config = {}, frequency = 80, arcAngle }) {
  return (
    <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-slate-800 to-slate-900 rounded">
      <div className="text-center px-4 py-6 text-sm text-slate-300">
        <div className="font-semibold mb-2">Mappa acustica (placeholder)</div>
        <div>Posizioni: {positions?.length ?? 0}</div>
        <div>Freq: {frequency} Hz</div>
  {typeof arcAngle !== 'undefined' && <div>Angolo Arc: {arcAngle}°</div>}
        <div className="mt-3 text-xs text-slate-400">Sostituire con l'implementazione reale del componente per visualizzare SPL</div>
      </div>
    </div>
  );
}



