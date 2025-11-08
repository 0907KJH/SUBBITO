import React from 'react';

export default function SetupVisualizer({ positions, dimensions }) {
    if (!positions || positions.length === 0) return null;

    const subSize = 1.2;
    const padding = 1.5;
    
    const xs = positions.map(p => p.x);
    const ys = positions.map(p => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    
    const dataWidth = maxX - minX || 1;
    const dataHeight = maxY - minY || 1;
    
    const viewWidth = dataWidth + padding * 2;
    const viewHeight = dataHeight + padding * 2;
    
    const centerX = (minX + maxX) / 2;
    const viewBoxMinX = centerX - viewWidth / 2;
    const viewBoxMinY = minY - padding;

    const delays = positions.map(p => p.delay);
    const minDelay = Math.min(...delays);
    const maxDelay = Math.max(...delays);
    const delayRange = maxDelay - minDelay || 1;

    const getDelayColor = (delay) => {
        const normalized = (delay - minDelay) / delayRange;
        const hue = 240 - (normalized * 240);
        return `hsl(${hue}, 80%, 60%)`;
    };

    const minSpacingX = Math.min(...positions.map((p, i) => {
        if (i === positions.length - 1) return Infinity;
        const nextWithSameY = positions.slice(i + 1).find(next => Math.abs(next.y - p.y) < 0.1);
        return nextWithSameY ? Math.abs(nextWithSameY.x - p.x) : Infinity;
    }).filter(s => s !== Infinity)) || 10;
    
    const showDelayLabels = minSpacingX > 2;

    return (
        <div className="w-full bg-slate-900 rounded-lg p-2 md:p-4 border border-slate-700" style={{ aspectRatio: '16/9' }}>
            <svg 
                viewBox={`${viewBoxMinX} ${viewBoxMinY} ${viewWidth} ${viewHeight}`} 
                className="w-full h-full"
                preserveAspectRatio="xMidYMid meet"
            >
                <line 
                    x1={centerX} 
                    y1={minY - padding * 0.5} 
                    x2={centerX} 
                    y2={maxY + padding * 0.5} 
                    stroke="rgba(255,255,255,0.05)" 
                    strokeDasharray="0.2 0.2" 
                    strokeWidth="0.03"
                />

                <defs>
                    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                        <polygon points="0 0, 10 3.5, 0 7" fill="rgba(100,255,100,0.6)" />
                    </marker>
                </defs>
                <line 
                    x1={centerX} 
                    y1={maxY + padding * 0.2} 
                    x2={centerX} 
                    y2={maxY + padding * 0.7} 
                    stroke="rgba(100,255,100,0.6)" 
                    strokeWidth="0.1" 
                    markerEnd="url(#arrowhead)"
                />

                {positions.map((sub) => (
                    <g key={sub.id}>
                        <rect 
                            x={sub.x - subSize / 2} 
                            y={sub.y - subSize / 2} 
                            width={subSize} 
                            height={subSize} 
                            fill={getDelayColor(sub.delay)}
                            stroke="rgba(255,255,255,0.9)"
                            strokeWidth="0.06"
                            rx="0.1"
                        />
                        
                        <text 
                            x={sub.x} 
                            y={sub.y - 0.15} 
                            fill="white" 
                            fontSize="0.5" 
                            fontWeight="bold"
                            textAnchor="middle"
                        >
                            {sub.id}
                        </text>
                        
                        {showDelayLabels && (
                            <text 
                                x={sub.x} 
                                y={sub.y + 0.25} 
                                fill="white" 
                                fontSize="0.35" 
                                textAnchor="middle"
                            >
                                {sub.delay.toFixed(1)}ms
                            </text>
                        )}
                        
                        {sub.polarity === -1 && (
                            <circle 
                                cx={sub.x + subSize/3} 
                                cy={sub.y - subSize/3} 
                                r="0.15" 
                                fill="red" 
                                stroke="white"
                                strokeWidth="0.04" 
                            />
                        )}
                    </g>
                ))}
                
                <text 
                    x={centerX} 
                    y={minY - padding * 0.2} 
                    fill="white" 
                    fontSize="0.5" 
                    fontWeight="bold"
                    textAnchor="middle"
                >
                    STAGE
                </text>
                
                <text 
                    x={centerX} 
                    y={maxY + padding * 0.95} 
                    fill="rgba(100,255,100,0.8)" 
                    fontSize="0.5" 
                    fontWeight="bold"
                    textAnchor="middle"
                >
                    AUDIENCE
                </text>
            </svg>
        </div>
    );
}



