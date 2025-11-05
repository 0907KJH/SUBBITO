import React from 'react';
import { useTheme } from '@/components/ThemeContext';

export default function EnhancedSetupVisualizer({ positions, dimensions, config, results }) {
    const { isDarkTheme } = useTheme();
  
    if (!positions || positions.length === 0) return null;

    const subSize = 0.5;
    const fixedSpacing = 1.2;
    const lineSpacing = 1.5;
    const padding = 0.8;
  
    const isStackCardioid = config.setup_primario === 'stack_cardioid';
    const isLR = config.setup_primario === 'l_r';
  
    // Colori dinamici per tema
    const textColor = isDarkTheme ? 'white' : '#1e293b';
    const lineColor = isDarkTheme ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
    const cardBg = isDarkTheme ? 'bg-slate-800/50' : 'bg-gray-100';
    const cardBorder = isDarkTheme ? 'border-slate-700' : 'border-gray-300';
    const cardTextPrimary = isDarkTheme ? 'text-slate-400' : 'text-slate-600';
    const cardTextValue = isDarkTheme ? 'text-green-400' : 'text-green-600';
  
    // ===== Stack Cardioid (ripristinato) =====
    if (isStackCardioid) {
        const maxDisplayX = (positions.length - 1) * fixedSpacing;
    
        let maxModuleDisplayY = 0;
        if (positions.length > 0 && positions[0].modules) {
            const numModules = positions[0].modules.length;
            const lastModuleIdx = numModules - 1;
            const baseModuleYForLastModule = 0.6 + lastModuleIdx * 0.7;
            const maxCumulativeExtraSpace = lastModuleIdx > 0 ? lastModuleIdx * 0.5 : 0; 
            maxModuleDisplayY = baseModuleYForLastModule + maxCumulativeExtraSpace + 0.50; 
        }

        const viewWidth = maxDisplayX + padding * 2;
    // Aggiungi margine extra in basso per evitare clipping dei testi durante resize
    const bottomExtra = 0.35;
    const viewHeight = 0.5 + 0.5 + maxModuleDisplayY + bottomExtra;
    
        const viewBoxMinX = -padding;
        const viewBoxMinY = -0.5;
    
        return (
            <div className="w-full space-y-4">
                <svg 
                    viewBox={`${viewBoxMinX} ${viewBoxMinY} ${viewWidth} ${viewHeight}`} 
                    className="w-full"
                    style={{ height: '400px', maxHeight: '50vh' }}
                    preserveAspectRatio="xMidYMid meet"
                >
                    <defs>
                        <pattern id="grid" width="0.5" height="0.5" patternUnits="userSpaceOnUse">
                            <path d="M 0.5 0 L 0 0 0 0.5" fill="none" stroke={lineColor} strokeWidth="0.01"/>
                        </pattern>
                    </defs>
                    <rect x={viewBoxMinX} y={viewBoxMinY} width={viewWidth} height={viewHeight} fill="url(#grid)" />

                    {positions.map((stack, stackIdx) => {
                        const displayX = stackIdx * fixedSpacing;
                        const displayY = 0;
            
                        return (
                            <g key={stack.id}>
                                {stackIdx === 0 && (
                                    <text 
                                        x={-0.4} 
                                        y={displayY} 
                                        fill={textColor}
                                        fontSize="0.35" 
                                        fontWeight="bold"
                                        textAnchor="end"
                                        dominantBaseline="middle"
                                    >
                                        L1
                                    </text>
                                )}
                
                                <circle 
                                    cx={displayX} 
                                    cy={displayY} 
                                    r={subSize / 2} 
                                    fill="rgb(100, 116, 139)"
                                    stroke={textColor}
                                    strokeWidth="0.04"
                                />
                
                                {stack.modules && stack.modules.some(m => m.polarity === -1) && (
                                    <circle 
                                        cx={displayX + subSize/3} 
                                        cy={displayY - subSize/3} 
                                        r="0.12" 
                                        fill="red" 
                                        stroke={textColor}
                                        strokeWidth="0.03" 
                                    />
                                )}
                
                                {stack.modules && stack.modules.map((module, moduleIdx) => {
                                    let extraSpace = 0;
                                    for (let i = 0; i < moduleIdx; i++) {
                                        if (stack.modules[i].fisicamente_invertito === true) {
                                            extraSpace += 0.5;
                                        }
                                    }
                  
                                    const yOffset = displayY + 0.6 + moduleIdx * 0.7 + extraSpace;
                                    const moduleLabel = module.polarity === -1 ? "rev" : "norm";
                                    const delayText = config.unita_ritardo === "ms" 
                                        ? `${module.delay.toFixed(1)}ms` 
                                        : `${((module.delay / 1000) * 343).toFixed(2)}m`;
                                    const isReversed = module.fisicamente_invertito === true;
                  
                                    return (
                                        <g key={moduleIdx}>
                                            <text 
                                                x={displayX} 
                                                y={yOffset} 
                                                fill={isReversed ? "rgb(59, 130, 246)" : textColor}
                                                fontSize="0.25" 
                                                fontWeight="bold"
                                                textAnchor="middle"
                                            >
                                                {module.moduleIndex} {moduleLabel}
                                            </text>
                                            {isReversed && (
                                                <text 
                                                    x={displayX} 
                                                    y={yOffset + 0.25}
                                                    fill="rgb(59, 130, 246)" 
                                                    fontSize="0.18" 
                                                    fontWeight="bold"
                                                    textAnchor="middle"
                                                >
                                                    GIRATO
                                                </text>
                                            )}
                                            <text 
                                                x={displayX} 
                                                y={yOffset + (isReversed ? 0.50 : 0.30)}
                                                fill={module.delay > 0 ? "rgb(59, 130, 246)" : textColor} 
                                                fontSize="0.22" 
                                                textAnchor="middle"
                                            >
                                                {delayText}
                                            </text>
                                        </g>
                                    );
                                })}
                            </g>
                        );
                    })}
                </svg>
        
                <div className={`grid grid-cols-2 gap-4 p-4 ${cardBg} rounded-lg border ${cardBorder}`}>
                    <div className="space-y-1">
                        <p className={`text-xs ${cardTextPrimary}`}>Numero Stack</p>
                        <p className={`text-xl font-bold ${cardTextValue}`}>{positions.length}</p>
                    </div>
                    <div className="space-y-1">
                        <p className={`text-xs ${cardTextPrimary}`}>Moduli per Stack</p>
                        <p className={`text-xl font-bold ${isDarkTheme ? 'text-purple-400' : 'text-purple-600'}`}>{positions[0]?.modules?.length || 0}</p>
                    </div>
                    <div className="space-y-1">
                        <p className={`text-xs ${cardTextPrimary}`}>Spacing Orizzontale</p>
                        <p className={`text-xl font-bold ${isDarkTheme ? 'text-blue-400' : 'text-blue-600'}`}>
                            {positions.length > 1 
                                ? `${(positions[1].x - positions[0].x).toFixed(2)} m` 
                                : 'N/A'}
                        </p>
                    </div>
                    <div className="space-y-1">
                        <p className={`text-xs ${cardTextPrimary}`}>Profondità Sub</p>
                        <p className={`text-xl font-bold ${isDarkTheme ? 'text-yellow-400' : 'text-yellow-600'}`}>{config.profondita_sub_cardioid || 60} cm</p>
                    </div>
                    <div className="space-y-1">
                        <p className={`text-xs ${cardTextPrimary}`}>Delay Cardioide</p>
                        <p className={`text-xl font-bold ${isDarkTheme ? 'text-red-400' : 'text-red-600'}`}>
                            {positions[0]?.modules?.[0]?.delay 
                                ? (config.unita_ritardo === "ms" 
                                        ? `${positions[0].modules[0].delay.toFixed(1)} ms` 
                                        : `${((positions[0].modules[0].delay / 1000) * 343).toFixed(2)} m`)
                                : 'N/A'}
                        </p>
                    </div>
                </div>
            </div>
        );
    }
    
    // ===== L - R: visual stile 2-linee con rettangoli colorati =====
    if (isLR) {
    const actualWidth = Math.max(0.5, Number(dimensions?.width || 0) || Number(config?.larghezza_massima || 0) || 2);
    // Visual LR: separazione orizzontale piÃ¹ stretta (~ -1/3)
    const visualSep = 3.5; // distanza visiva tra L e R (unità SVG)

        const leftCount = positions.filter(p => p.x < 0).length || positions.length / 2;
        const rightCount = positions.filter(p => p.x > 0).length || positions.length / 2;

        // PAN corrente (usato anche per calcolare margini extra del viewBox)
        const panDeg = Number(config?.gradi_pan ?? 0) || 0;

    const rectW = 0.7; // base prima della rotazione
    const rectH = 0.45;
    const leftX = -visualSep / 2;
    const rightX = visualSep / 2;
        const rectY = 0;

        // Prepara ordinamento per profonditÃ  e label unificate n (L/R)
        const decorated = positions.map(p => {
            const lbl = (p.label || '').trim();
            const m = lbl.match(/^([LR])/i);
            const side = m ? m[1].toUpperCase() : ((p.x || 0) < 0 ? 'L' : 'R');
            return { ...p, side };
        });
        decorated.sort((a, b) => {
            if (a.y !== b.y) return a.y - b.y; // piÃ¹ negativo (STAGE) prima
            if (a.side !== b.side) return a.side === 'L' ? -1 : 1; // L prima di R
            return (a.x || 0) - (b.x || 0);
        });
        // Numerazione richiesta: tutti gli L in progressione (dallo STAGE verso AUDIENCE), poi prosegue con gli R
        const leftSorted = decorated.filter(p => p.side === 'L').slice().sort((a,b)=>a.y-b.y);
        const rightSorted = decorated.filter(p => p.side === 'R').slice().sort((a,b)=>a.y-b.y);
        const displayMap = new Map();
        leftSorted.forEach((p, i) => displayMap.set(p.label, { idx: i + 1, side: 'L' }));
        rightSorted.forEach((p, i) => displayMap.set(p.label, { idx: leftSorted.length + i + 1, side: 'R' }));

        // Mappa Y fisico -> Y display
        const allY = positions.map(p => p.y);
        const minY = Math.min(...allY, 0);
        const maxY = Math.max(...allY, 0);
        const span = (maxY - minY) || 1;
    // Spazio verticale tra le linee (profonditÃ ): stringi di ~1/3
    const dispTop = -0.8;    // meno margine vicino a STAGE
    const dispBottom = 1.6;  // meno margine verso AUDIENCE
        const mapY = (y) => dispTop + (y - minY) / span * (dispBottom - dispTop);

    // PAN fisico (solo geometria, i testi restano orizzontali)
        const angleLeft = panDeg;   // L +Î±
        const angleRight = -panDeg; // R âˆ’Î±

    const leftPositions = leftSorted;
    const rightPositions = rightSorted;
        const leftPivotY = leftPositions.length ? Math.min(...leftPositions.map(p => p.y || 0)) : 0;
        const rightPivotY = rightPositions.length ? Math.min(...rightPositions.map(p => p.y || 0)) : 0;
    const leftPivotDispY = mapY(leftPivotY);
    const rightPivotDispY = mapY(rightPivotY);

    // Dimensioni dinamiche del viewBox: aggiungi margine orizzontale extra proporzionale al PAN
    const spanDisp = (dispBottom - dispTop);
    const panRad = Math.abs(panDeg) * Math.PI / 180;
    // Aggiungi margine orizzontale sufficiente anche per le etichette esterne quando il PAN Ã¨ verso l'esterno
    const labelMargin = (config.setup_secondario === 'stack_cardioid') ? 0.4 : 1.0; // etichette esterne: un po' di margine
    const extraX = Math.sin(panRad) * spanDisp + labelMargin + 0.6; // margine di sicurezza
    let viewWidth = visualSep + padding * 2 + extraX * 2;
    let viewHeight = 4.8 + padding; // altezza base con margine
    // Zoom in generale per rendere piÃ¹ grande l'area disegnata (senza alterare la distanza reale mostrata)
    const zoomFactor = config.setup_secondario === 'stack_cardioid' ? 0.72 : 0.65; // <1 => zoom-in (piÃ¹ piccolo = piÃ¹ grande)
    viewWidth *= zoomFactor;
    viewHeight *= zoomFactor;
    // Abbassa la scritta "AUDIENCE" di ~3 cm equivalenti nel nostro spazio SVG:
    // approssimiamo con uno spostamento D nel viewBox e aumentiamo l'altezza di 2D
    // per mantenere visibile il testo senza clipping in basso.
    const audienceShift = 0.70; // D (unità viewBox) ~ 3cm + 4cm aggiuntivi
    viewHeight += 2 * audienceShift;
    const viewBoxMinX = -viewWidth / 2;
    const viewBoxMinY = -viewHeight / 2;

        // Colori lato-specifici
        const leftFill = isDarkTheme ? '#3b82f6' : '#60a5fa';    // blue
        const rightFill = isDarkTheme ? '#d946ef' : '#f472b6';   // fuchsia/pink

        // Prepara liste per visualizzazione 'a discesa' (stack e nessuno)
        const isStack = config.setup_secondario === 'stack_cardioid';
        const useFixedLists = isStack || config.setup_secondario === 'nessuno';
        let leftList = [];
        let rightList = [];
        let leftHasInvert = false;
        let rightHasInvert = false;
        if (useFixedLists) {
            leftHasInvert = leftPositions.some(p => p.polarity === -1);
            rightHasInvert = rightPositions.some(p => p.polarity === -1);
            leftList = leftPositions
                .slice()
                .sort((a,b)=>a.y-b.y)
                .map((p, i) => {
                    const info = displayMap.get(p.label) || { idx: i + 1, side: 'L' };
                    return { info, p };
                });
            rightList = rightPositions
                .slice()
                .sort((a,b)=>a.y-b.y)
                .map((p, i) => {
                    const info = displayMap.get(p.label) || { idx: i + 1, side: 'R' };
                    return { info, p };
                });
        }
    const lineStroke = isStack ? 0.04 : 0.03;
    const centralFont = isStack ? 0.40 : 0.30;
        // Calcola spaziatura tra le linee (prima vs seconda profondità)
        const yKeys = Array.from(new Set(positions
            .map(p => typeof p.y === 'number' ? +p.y.toFixed(6) : null)
            .filter(v => v !== null)))
            .sort((a,b)=>a-b);
        const lrLineSpacing = yKeys.length >= 2 ? +(Math.abs(yKeys[1] - yKeys[0]).toFixed(2)) : null;

        return (
            <div className="w-full space-y-4">
                <svg 
                    viewBox={`${viewBoxMinX} ${viewBoxMinY} ${viewWidth} ${viewHeight}`} 
                    className="w-full"
                    style={{ height: isStack ? '660px' : '600px', maxHeight: isStack ? '74vh' : '70vh' }}
                    preserveAspectRatio="xMidYMid meet"
                >
                    {/* Sfondo senza griglia per look più pulito */}
                    <rect x={viewBoxMinX} y={viewBoxMinY} width={viewWidth} height={viewHeight} fill="none" />

                    {/* (Rimosso) Nessuna linea orizzontale con misura centrale per setup L-R */}

                    {/* Scritte STAGE/AUDIENCE rimosse: la dicitura è mostrata sopra l'SVG */}

                    {/* Gruppo SINISTRA */}
                    <g transform={`rotate(${angleLeft} ${leftX} ${leftPivotDispY})`}>
                        {config.setup_secondario === 'stack_cardioid' ? (
                            (() => {
                                const cx = leftX;
                                const cy = leftPivotDispY;
                                const rectWm = 1.05;   // piÃ¹ grande per migliore leggibilitÃ 
                                const rectHm = 0.56;
                                return (
                                    <g>
                                        <g transform={`rotate(90 ${cx} ${cy})`}>
                                            <rect x={cx - rectWm/2} y={cy - rectHm/2} width={rectWm} height={rectHm} rx={0.12} ry={0.12}
                                                  fill={leftFill} stroke={textColor} strokeWidth="0.05" />
                                            {leftHasInvert && (
                                                <circle cx={cx - rectWm/2 + 0.1} cy={cy - rectHm/2 + 0.1} r={0.06} fill="red" stroke={textColor} strokeWidth="0.02" />
                                            )}
                                        </g>
                                    </g>
                                );
                            })()
                        ) : (
                            leftPositions.map((p, i) => {
                                const info = displayMap.get(p.label) || { idx: i + 1, side: 'L' };
                                const cx = leftX;
                                const cy = mapY(p.y || 0);
                                const rectWm = 0.62;
                                const rectHm = 0.36;
                                // Etichette esterne: per L a DESTRA del sub
                                const dxOut = 0.6;
                                const labelX = cx + dxOut;
                                const labelY = cy + 0.22;
                                const delayY = labelY + 0.34;
                                return (
                                    <g key={`L-${i}`}>
                                        <g transform={`rotate(90 ${cx} ${cy})`}>
                                            <rect x={cx - rectWm/2} y={cy - rectHm/2} width={rectWm} height={rectHm} rx={0.12} ry={0.12}
                                                  fill={leftFill} stroke={textColor} strokeWidth="0.05" />
                                            {p.polarity === -1 && (
                                                <circle cx={cx - rectWm/2 + 0.1} cy={cy - rectHm/2 + 0.1} r={0.06} fill="red" stroke={textColor} strokeWidth="0.02" />
                                            )}
                                        </g>
                                        {/* Per 'nessuno', evita testi vicino ai moduli per non sovrapporre; usa liste fisse sotto */}
                                        {config.setup_secondario !== 'nessuno' && (
                                            <>
                                                <text x={labelX} y={labelY} fill={textColor} fontSize="0.30" fontWeight="bold" textAnchor="middle" transform={`rotate(${-angleLeft} ${labelX} ${labelY})`}>
                                                    {`${info.side}${info.idx}`}
                                                </text>
                                                <text x={labelX} y={delayY} fill={textColor} fontSize="0.26" textAnchor="middle" transform={`rotate(${-angleLeft} ${labelX} ${delayY})`}>
                                                    {config.unita_ritardo === 'ms' ? `${(p.delay||0).toFixed(0)}ms` : `${(((p.delay||0)/1000)*343).toFixed(2)}m`}
                                                </text>
                                            </>
                                        )}
                                    </g>
                                );
                            })
                        )}
                    </g>

                    {/* Liste SINISTRA fisse: non seguono il PAN (stack e nessuno) */}
                    {useFixedLists && (() => {
                        const cx = leftX;
                        const cy = leftPivotDispY;
                        const baseY = cy + 1.05;
                        const groupH = 0.90;
                        const delayOff = 0.48;
                        return (
                            <g>
                                {leftList.map(({info,p}, idx) => (
                                    <g key={`LL-static-${idx}`}>
                                        <text x={cx} y={baseY + idx*groupH} fill={textColor} fontSize="0.34" fontWeight="bold" textAnchor="middle">
                                            {`${info.side}${info.idx}`}
                                        </text>
                                        <text x={cx} y={baseY + delayOff + idx*groupH} fill={textColor} fontSize="0.28" textAnchor="middle">
                                            {config.unita_ritardo === 'ms' ? `${(p.delay||0).toFixed(0)}ms` : `${(((p.delay||0)/1000)*343).toFixed(2)}m`}
                                        </text>
                                    </g>
                                ))}
                            </g>
                        );
                    })()}

                    {/* Gruppo DESTRA */}
                    <g transform={`rotate(${angleRight} ${rightX} ${rightPivotDispY})`}>
                        {config.setup_secondario === 'stack_cardioid' ? (
                            (() => {
                                const cx = rightX;
                                const cy = rightPivotDispY;
                                const rectWm = 1.05;
                                const rectHm = 0.56;
                                return (
                                    <g>
                                        <g transform={`rotate(90 ${cx} ${cy})`}>
                                            <rect x={cx - rectWm/2} y={cy - rectHm/2} width={rectWm} height={rectHm} rx={0.12} ry={0.12}
                                                  fill={rightFill} stroke={textColor} strokeWidth="0.05" />
                                            {rightHasInvert && (
                                                <circle cx={cx - rectWm/2 + 0.1} cy={cy - rectHm/2 + 0.1} r={0.06} fill="red" stroke={textColor} strokeWidth="0.02" />
                                            )}
                                        </g>
                                    </g>
                                );
                            })()
                        ) : (
                            rightPositions.map((p, i) => {
                                const info = displayMap.get(p.label) || { idx: i + 1, side: 'R' };
                                const cx = rightX;
                                const cy = mapY(p.y || 0);
                                const rectWm = 0.62; // moduli piÃ¹ grandi
                                const rectHm = 0.36;
                                // Etichette esterne: per R a SINISTRA del sub
                                const dxOut = 0.6;
                                const labelX = cx - dxOut;
                                const labelY = cy + 0.22;
                                const delayY = labelY + 0.34;
                                return (
                                    <g key={`R-${i}`}>
                                        {/* Ruota il modulo di 90Â° per allinearlo al primario */}
                                        <g transform={`rotate(90 ${cx} ${cy})`}>
                                            <rect x={cx - rectWm/2} y={cy - rectHm/2} width={rectWm} height={rectHm} rx={0.12} ry={0.12}
                                                  fill={rightFill} stroke={textColor} strokeWidth="0.05" />
                                            {p.polarity === -1 && (
                                                <circle cx={cx - rectWm/2 + 0.1} cy={cy - rectHm/2 + 0.1} r={0.06} fill="red" stroke={textColor} strokeWidth="0.02" />
                                            )}
                                        </g>
                                        {/* Per 'nessuno', evita testi vicino ai moduli per non sovrapporre; usa liste fisse sotto */}
                                        {config.setup_secondario !== 'nessuno' && (
                                            <>
                                                <text x={labelX} y={labelY} fill={textColor} fontSize="0.30" fontWeight="bold" textAnchor="middle" transform={`rotate(${-angleRight} ${labelX} ${labelY})`}>
                                                    {`${info.side}${info.idx}`}
                                                </text>
                                                <text x={labelX} y={delayY} fill={textColor} fontSize="0.26" textAnchor="middle" transform={`rotate(${-angleRight} ${labelX} ${delayY})`}>
                                                    {config.unita_ritardo === 'ms' ? `${(p.delay||0).toFixed(0)}ms` : `${(((p.delay||0)/1000)*343).toFixed(2)}m`}
                                                </text>
                                            </>
                                        )}
                                    </g>
                                );
                            })
                        )}
                    </g>

                    {/* Liste DESTRA fisse: non seguono il PAN (stack e nessuno) */}
                    {useFixedLists && (() => {
                        const cx = rightX;
                        const cy = rightPivotDispY;
                        const baseY = cy + 1.05;
                        const groupH = 0.90;
                        const delayOff = 0.48;
                        return (
                            <g>
                                {rightList.map(({info,p}, idx) => (
                                    <g key={`RR-static-${idx}`}>
                                        <text x={cx} y={baseY + idx*groupH} fill={textColor} fontSize="0.34" fontWeight="bold" textAnchor="middle">
                                            {`${info.side}${info.idx}`}
                                        </text>
                                        <text x={cx} y={baseY + delayOff + idx*groupH} fill={textColor} fontSize="0.28" textAnchor="middle">
                                            {config.unita_ritardo === 'ms' ? `${(p.delay||0).toFixed(0)}ms` : `${(((p.delay||0)/1000)*343).toFixed(2)}m`}
                                        </text>
                                    </g>
                                ))}
                            </g>
                        );
                    })()}
                </svg>

                <div className={`grid grid-cols-2 md:grid-cols-3 gap-4 p-4 ${cardBg} rounded-lg border ${cardBorder}`}>
                    <div className="space-y-1">
                        <p className={`text-xs ${cardTextPrimary}`}>Moduli per lato</p>
                        <p className={`text-xl font-bold ${cardTextValue}`}>{Math.max(leftCount, rightCount)}</p>
                    </div>
                    <div className="space-y-1">
                        <p className={`text-xs ${cardTextPrimary}`}>Distanza L-R (reale)</p>
                        <p className={`text-xl font-bold ${isDarkTheme ? 'text-blue-400' : 'text-blue-600'}`}>{actualWidth.toFixed(2)} m</p>
                    </div>
                    <div className="space-y-1">
                        <p className={`text-xs ${cardTextPrimary}`}>Spaziatura linee (GRIGLIA-GRIGLIA)</p>
                        <p className={`text-xl font-bold ${isDarkTheme ? 'text-yellow-400' : 'text-yellow-600'}`}>
                            {typeof lrLineSpacing === 'number' ? `L1/R3–L2/R4 ${lrLineSpacing.toFixed(2)} m` : 'N/D'}
                        </p>
                    </div>
                </div>
            </div>
        );
    }
    
    // Non-cardioid: raggruppa per linee
    const lineGroups = {};
    positions.forEach(p => {
        const yKey = p.y.toFixed(2);
        if (!lineGroups[yKey]) lineGroups[yKey] = [];
        lineGroups[yKey].push(p);
    });
    
    const sortedLines = Object.keys(lineGroups).sort((a, b) => parseFloat(a) - parseFloat(b));
    
    let longitudinalSpacing = 0;
    if (sortedLines.length > 0) {
        const firstLine = lineGroups[sortedLines[0]].sort((a, b) => a.x - b.x);
        if (firstLine.length > 1) {
            longitudinalSpacing = firstLine[1].x - firstLine[0].x;
        }
    }
    
    let depthSpacing = 0;
    if (sortedLines.length > 1) {
        const line1Y = parseFloat(sortedLines[0]);
        const line2Y = parseFloat(sortedLines[1]);
        depthSpacing = line2Y - line1Y;
    }
    
    const newPositions = [];
    sortedLines.forEach((yKey, lineIdx) => {
        const lineSubs = lineGroups[yKey].sort((a, b) => a.x - b.x);
        lineSubs.forEach((sub, subIdx) => {
            newPositions.push({
                ...sub,
                displayX: subIdx * fixedSpacing,
                displayY: lineIdx * lineSpacing,
                lineLabel: `L${lineIdx + 1}`
            });
        });
    });
    
    const maxDisplayX = Math.max(...newPositions.map(p => p.displayX));
    const maxDisplayY = Math.max(...newPositions.map(p => p.displayY));
    const minDisplayY = Math.min(...newPositions.map(p => p.displayY));
    
    const viewWidth = maxDisplayX + padding * 2;
    // Pad superiore/inferiore per evitare che i testi (soprattutto i delay in basso) vengano tagliati
    const topPad = 0.8;
    const bottomPad = 1.2;
    const viewHeight = (maxDisplayY - minDisplayY) + topPad + bottomPad + padding;
    
    const viewBoxMinX = -padding;
    const viewBoxMinY = minDisplayY - topPad;

    const delays = positions.map(p => p.delay);
    const minDelay = Math.min(...delays);
    const maxDelay = Math.max(...delays);

    return (
        <div className="w-full space-y-4">
            <svg 
                viewBox={`${viewBoxMinX} ${viewBoxMinY} ${viewWidth} ${viewHeight}`} 
                className="w-full"
                style={{ height: '400px', maxHeight: '50vh' }}
                preserveAspectRatio="xMidYMid meet"
            >
                <defs>
                    <pattern id="grid" width="0.5" height="0.5" patternUnits="userSpaceOnUse">
                        <path d="M 0.5 0 L 0 0 0 0.5" fill="none" stroke={lineColor} strokeWidth="0.01"/>
                    </pattern>
                </defs>
                <rect x={viewBoxMinX} y={viewBoxMinY} width={viewWidth} height={viewHeight} fill="url(#grid)" />

                {newPositions.map((sub) => {
                    const isMinDelay = sub.delay === minDelay;
                    const isMaxDelay = sub.delay === maxDelay;
                    const boxColor = isMinDelay ? "rgb(59, 130, 246)" : isMaxDelay ? "rgb(239, 68, 68)" : "rgb(100, 116, 139)";
                    
                    return (
                        <g key={sub.id}>
                            {sub.displayX === 0 && (
                                <text 
                                    x={-0.4} 
                                    y={sub.displayY} 
                                    fill={textColor}
                                    fontSize="0.35" 
                                    fontWeight="bold"
                                    textAnchor="end"
                                    dominantBaseline="middle"
                                >
                                    {sub.lineLabel}
                                </text>
                            )}
                            
                            <circle 
                                cx={sub.displayX} 
                                cy={sub.displayY} 
                                r={subSize / 2} 
                                fill={boxColor}
                                stroke={textColor}
                                strokeWidth="0.04"
                            />
                            
                            <text 
                                x={sub.displayX} 
                                y={sub.displayY + 0.55} 
                                fill={textColor}
                                fontSize="0.3" 
                                fontWeight="bold"
                                textAnchor="middle"
                            >
                                {sub.id}
                            </text>
                            
                            <text 
                                x={sub.displayX} 
                                y={sub.displayY + 0.85} 
                                fill={textColor}
                                fontSize="0.25" 
                                textAnchor="middle"
                            >
                                {config.unita_ritardo === "ms" 
                                    ? `${sub.delay.toFixed(1)}ms` 
                                    : `${((sub.delay / 1000) * 343).toFixed(2)}m`}
                            </text>
                            
                            {sub.polarity === -1 && (
                                <circle 
                                    cx={sub.displayX + subSize/3} 
                                    cy={sub.displayY - subSize/3} 
                                    r="0.12" 
                                    fill="red" 
                                    stroke={textColor}
                                    strokeWidth="0.03" 
                                />
                            )}
                        </g>
                    );
                })}
            </svg>
            
            <div className={`grid grid-cols-2 gap-4 p-4 ${cardBg} rounded-lg border ${cardBorder}`}>
                {longitudinalSpacing > 0 && (
                    <div className="space-y-1">
                        <p className={`text-xs ${cardTextPrimary}`}>Spacing Longitudinale</p>
                        <p className={`text-xl font-bold ${cardTextValue}`}>{longitudinalSpacing.toFixed(2)} m</p>
                    </div>
                )}
                {depthSpacing > 0 && (
                    <div className="space-y-1">
                        <p className={`text-xs ${cardTextPrimary}`}>Profondità tra Linee</p>
                        <p className={`text-xl font-bold ${isDarkTheme ? 'text-red-400' : 'text-red-600'}`}>{depthSpacing.toFixed(2)} m</p>
                    </div>
                )}
                <div className="space-y-1">
                    <p className={`text-xs ${cardTextPrimary}`}>Ritardo Minimo</p>
                    <p className={`text-xl font-bold ${isDarkTheme ? 'text-blue-400' : 'text-blue-600'}`}>
                        {config.unita_ritardo === "ms" ? `${minDelay.toFixed(1)} ms` : `${((minDelay / 1000) * 343).toFixed(2)} m`}
                    </p>
                </div>
                <div className="space-y-1">
                    <p className={`text-xs ${cardTextPrimary}`}>Ritardo Massimo</p>
                    <p className={`text-xl font-bold ${isDarkTheme ? 'text-red-400' : 'text-red-600'}`}>
                        {config.unita_ritardo === "ms" ? `${maxDelay.toFixed(1)} ms` : `${((maxDelay / 1000) * 343).toFixed(2)} m`}
                    </p>
                </div>
            </div>
        </div>
    );
}


