import React, { useMemo } from 'react';

export default function AcousticHeatmap({ positions, config, frequency, arcAngle, panAngle }) {
  const SPEED_OF_SOUND = 343;
  const wavelength = SPEED_OF_SOUND / frequency;
  
  const subDimensions = {
    '12"': 0.40,
    '15"': 0.50,
    '18"': 0.60,
    '21"': 0.75,
    '24"': 0.90
  };
  
  const subPhysicalDimension = subDimensions[config?.taglio] || 0.60;
  
  const subPositions = useMemo(() => {
    if (!positions || positions.length === 0 || !config) return [];
    
    const subs = [];
    const isStackCardioid = config.setup_primario === 'stack_cardioid';
    const hasArc = config.setup_primario === 'arc' || config.setup_secondario === 'arc';
    const acousticOffset = config?.considera_centro_acustico ? (((parseFloat(config?.offset_centro_acustico) || 0)) / 100) : 0;
    
    if (isStackCardioid && positions.length > 0 && positions[0].modules) {
      const DV = (parseFloat(config.profondita_sub_cardioid) / 100) || subPhysicalDimension;
      
      // Per stack cardioid, OGNI MODULO Ã¨ una sorgente separata per la fisica
      positions.forEach(stack => {
        if (stack.modules && Array.isArray(stack.modules)) {
          stack.modules.forEach((module, moduleIdx) => {
            // Cardioid: il modulo fisicamente invertito guarda il palco ed Ã¨ posto dietro
            // (verso STAGE, Y negativa) alla distanza DV. Gli altri moduli sono frontali
            // impilati verso l'audience (Y piÃ¹ alta, cioÃ¨ meno negativa / piÃ¹ positiva).
            // Convenzione: STAGE in alto (Y negativo), AUDIENCE in basso (Y positivo).
            let moduleY;
            if (module.fisicamente_invertito) {
              // Modulo girato verso il palco: sta dietro di DV e ha delay cardioide
              moduleY = stack.y - DV;
            } else {
              // Modulo frontale piÃ¹ vicino al pubblico Ã¨ a Y = stack.y,
              // i successivi, se presenti, proseguono in avanti a passi di +DV
              const frontIndex = moduleIdx - 1; // 0 per il primo frontale, 1 per il secondo, ...
              moduleY = stack.y + Math.max(0, frontIndex) * DV;
            }
            // Applica offset centro acustico: frontali -a (verso STAGE), girati +a (verso AUDIENCE)
            if (acousticOffset > 0) {
              moduleY = module.fisicamente_invertito ? (moduleY + acousticOffset) : (moduleY - acousticOffset);
            }
            
            // Separa delay base da delay Arc per permettere aggiornamento dinamico
            const baseDelay = module.delay || 0;
            
            subs.push({
              x: stack.x,
              y: moduleY,
              baseDelay: baseDelay,
              delay: baseDelay, // VerrÃ  aggiornato con Arc se necessario
              polarity: module.polarity || 1,
              stackX: stack.x, // Per calcolo Arc
              isStackModule: true
            });
          });
        }
      });
    } else {
      positions.forEach(p => {
        if (p && typeof p.x === 'number' && typeof p.y === 'number') {
          // Separa delay base da delay Arc per permettere aggiornamento dinamico
          // Caso specializzato: se il setup Ã¨ ARC puro, i delay in `positions` sono giÃ  "solo arc";
          // in heatmap ricalcoliamo Arc dinamicamente, quindi consideriamo baseDelay = 0 per evitare doppio conteggio.
          let baseDelay;
          if (p.arcDelay !== undefined) {
            baseDelay = (p.delay - p.arcDelay);
          } else if (config?.setup_primario === 'arc' && (config?.setup_secondario === 'nessuno' || !config?.setup_secondario)) {
            baseDelay = 0; // Evita raddoppio: ricalcoliamo Arc qui
          } else {
            baseDelay = p.delay;
          }
          
          const side = p.side || (typeof p.label === 'string' ? p.label.charAt(0).toUpperCase() : undefined);
          subs.push({
            x: p.x,
            y: p.y,
            baseDelay: baseDelay,
            delay: baseDelay, // VerrÃ  aggiornato con Arc se necessario
            polarity: p.polarity || 1,
            side
          });
        }
      });
    }
    
    // Se c'Ã¨ Arc, ricalcola i delay Arc con l'angolo corrente dello slider
    if (hasArc && arcAngle !== undefined && subs.length > 0) {
      // Raggruppa per X (ogni X unico Ã¨ uno stack/colonna)
      const uniqueX = [...new Set(subs.map(s => s.x))];
      const minX = Math.min(...uniqueX);
      const maxX = Math.max(...uniqueX);
      const arcWidth = maxX - minX;
      const centerX = (minX + maxX) / 2;
      
      const angleRad = (arcAngle * Math.PI) / 180;
      let radius;
      if (arcAngle === 0) {
        radius = Infinity;
      } else {
        radius = arcWidth / (2 * Math.sin(angleRad / 2));
        if (isNaN(radius) || !isFinite(radius)) {
          radius = arcWidth / (angleRad || 0.0001);
        }
      }
      
      // Calcola delay Arc per ogni X unica
      const arcDelayByX = {};
      let minDistanceFromFocus = Infinity;
      
      uniqueX.forEach(x => {
        const relX = x - centerX;
        let distanceFromFocus = 0;
        if (arcAngle === 0) {
          distanceFromFocus = 0;
        } else if (isFinite(radius)) {
          distanceFromFocus = Math.sqrt(Math.pow(relX, 2) + Math.pow(radius, 2));
        }
        arcDelayByX[x] = distanceFromFocus;
        minDistanceFromFocus = Math.min(minDistanceFromFocus, distanceFromFocus);
      });
      
      // Applica delay Arc a tutti i sub con la stessa X
      subs.forEach(sub => {
        let arcDelay = 0;
        if (arcAngle !== 0 && isFinite(radius)) {
          arcDelay = ((arcDelayByX[sub.x] - minDistanceFromFocus) / SPEED_OF_SOUND) * 1000;
        }
        arcDelay = Math.max(0, arcDelay);
        
        // Delay totale = delay base + delay Arc
        sub.delay = sub.baseDelay + arcDelay;
      });
    }
    
    // Applica PAN fisico per L-R (rotazione gruppi per lato attorno al sub piÃ¹ vicino al palco)
    const isLR = config?.setup_primario === 'l_r';
    const panDeg = typeof panAngle === 'number' ? panAngle : (config?.gradi_pan || 0);
    if (isLR && subs.length > 0 && panDeg !== 0) {
      const angleLeft = (panDeg * Math.PI) / 180;   // L +Î±
      const angleRight = (-panDeg * Math.PI) / 180; // R âˆ’Î±

      const leftSubs = subs.filter(s => s.side === 'L');
      const rightSubs = subs.filter(s => s.side === 'R');

      const rotateGroup = (group, theta) => {
        if (group.length === 0) return [];
        // Pivot: sub con y minima (piÃ¹ vicino allo stage)
        const pivot = group.reduce((min, s) => (s.y < min.y ? s : min), group[0]);
        const px = pivot.x;
        const py = pivot.y;
        return group.map(s => {
          const dx = s.x - px;
          const dy = s.y - py;
          const cos = Math.cos(theta);
          const sin = Math.sin(theta);
          const rx = px + cos * dx - sin * dy;
          const ry = py + sin * dx + cos * dy;
          return { ...s, x: rx, y: ry };
        });
      };

      const rotatedLeft = rotateGroup(leftSubs, angleLeft);
      const rotatedRight = rotateGroup(rightSubs, angleRight);
      const others = subs.filter(s => s.side !== 'L' && s.side !== 'R');
      return [...rotatedLeft, ...rotatedRight, ...others];
    }

    return subs;
  }, [positions, config, subPhysicalDimension, arcAngle, panAngle]);

  const bounds = useMemo(() => {
    if (subPositions.length === 0) {
      // Bordi di default ragionevoli per uno stato vuoto o senza sub
      return { minX: -10, maxX: 10, minY: -5, maxY: 15 };
    }
    
    const xs = subPositions.map(s => s.x);
    const ys = subPositions.map(s => s.y);
    
    const minSubX = Math.min(...xs);
    const maxSubX = Math.max(...xs);
    const minSubY = Math.min(...ys);
    const maxSubY = Math.max(...ys);

    // Padding verticale ridotto per una visualizzazione piÃ¹ compatta
    const verticalPaddingTop = 1.5;
    const verticalPaddingBottom = 4.0;
    
    const effectiveMinY = minSubY - verticalPaddingTop;
    const effectiveMaxY = maxSubY + verticalPaddingBottom;
    const effectiveViewHeight = effectiveMaxY - effectiveMinY;

    // Rapporto d'aspetto piÃ¹ contenuto (1.0 = quadrato, valori piÃ¹ bassi = piÃ¹ alto che largo)
    const targetAspectRatio = 0.8;

    let desiredViewWidth = effectiveViewHeight * targetAspectRatio;

    // Assicurati che sia largo abbastanza per i sub + padding
    const minRequiredWidth = (maxSubX - minSubX) + 2.0;
    desiredViewWidth = Math.max(desiredViewWidth, minRequiredWidth);

    // Centra orizzontalmente
    const centerX = (minSubX + maxSubX) / 2;
    const effectiveMinX = centerX - desiredViewWidth / 2;
    const effectiveMaxX = centerX + desiredViewWidth / 2;

    return {
      minX: effectiveMinX,
      maxX: effectiveMaxX,
      minY: effectiveMinY,
      maxY: effectiveMaxY
    };
  }, [subPositions]);

  const gridSize = 100;
  const heatmapData = useMemo(() => {
    if (subPositions.length === 0) return [];
    
    const data = [];
    const { minX, maxX, minY, maxY } = bounds;
    const stepX = (maxX - minX) / gridSize;
    const stepY = (maxY - minY) / gridSize;
    
    let maxSPL = -Infinity;
    let minSPL = Infinity;
    
    // Determina segno di fase per Endfire: scegli quello che massimizza il lobo verso AUDIENCE
    const isEndfireSetup = (config?.setup_primario === 'endfire') ||
                           (config?.setup_primario === 'l_r' && config?.setup_secondario === 'endfire');
    let endfireUseMinus = false; // k*r - Ï‰Ï„
    if (isEndfireSetup) {
      const omega = 2 * Math.PI * frequency;
      const k = (2 * Math.PI) / wavelength;
      const xs = subPositions.map(s => s.x);
      const ys = subPositions.map(s => s.y);
      const minXsp = Math.min(...xs);
      const maxXsp = Math.max(...xs);
      const centerX = (minXsp + maxXsp) / 2;
      const span = Math.max(0.1, (maxXsp - minXsp));
      const leftSample = minXsp + 0.15 * span;
      const rightSample = maxXsp - 0.15 * span;
      const samplesX = [leftSample, centerX, rightSample];
      const yForward = Math.max(...ys) + 5;   // verso AUDIENCE (in basso)
      const yBackward = Math.min(...ys) - 5;  // verso STAGE (in alto)

      const evalAmp = (useMinus, x, y) => {
        let re = 0, im = 0;
        subPositions.forEach(sub => {
          const distance = Math.sqrt(Math.pow(x - sub.x, 2) + Math.pow(y - sub.y, 2));
          const amplitude = 1 / (distance + 0.1);
          const delaySeconds = (sub.delay || 0) / 1000;
          const totalPhase = useMinus ? (k * distance - omega * delaySeconds) : (k * distance + omega * delaySeconds);
          re += sub.polarity * amplitude * Math.cos(totalPhase);
          im += sub.polarity * amplitude * Math.sin(totalPhase);
        });
        return Math.sqrt(re*re + im*im);
      };

      const sumAmps = (useMinus, y) => samplesX.reduce((acc, x) => acc + evalAmp(useMinus, x, y), 0);

      const fwdMinus = sumAmps(true, yForward);
      const backMinus = sumAmps(true, yBackward);
      const fwdPlus  = sumAmps(false, yForward);
      const backPlus = sumAmps(false, yBackward);

      const scoreMinus = fwdMinus - backMinus;
      const scorePlus  = fwdPlus - backPlus;
      endfireUseMinus = scoreMinus >= scorePlus;
    }

    for (let row = 0; row < gridSize; row++) {
      const rowData = [];
      for (let col = 0; col < gridSize; col++) {
        const x = minX + col * stepX;
        const y = minY + row * stepY;
        
        let realPart = 0;
        let imagPart = 0;
        
        // Ogni modulo contribuisce individualmente alla simulazione
        subPositions.forEach(sub => {
          const distance = Math.sqrt(Math.pow(x - sub.x, 2) + Math.pow(y - sub.y, 2));
          const amplitude = 1 / (distance + 0.1);

          // Fase = k*r - Ï‰*Ï„  (ritardo elettronico = fase arretrata)
          const delaySeconds = (sub.delay || 0) / 1000;
          const k = (2 * Math.PI) / wavelength;      // numero d'onda
          const omega = 2 * Math.PI * frequency;      // pulsazione
          // Applica il segno scelto dinamicamente per Endfire
          const totalPhase = isEndfireSetup
            ? (endfireUseMinus ? (k * distance - omega * delaySeconds) : (k * distance + omega * delaySeconds))
            : (k * distance + omega * delaySeconds);

          // La polaritÃ  elettrica (-1 o +1) inverte la fase
          realPart += sub.polarity * amplitude * Math.cos(totalPhase);
          imagPart += sub.polarity * amplitude * Math.sin(totalPhase);
        });
        
        const magnitude = Math.sqrt(realPart * realPart + imagPart * imagPart);
        const spl = 20 * Math.log10(magnitude + 0.001);
        
        maxSPL = Math.max(maxSPL, spl);
        minSPL = Math.min(minSPL, spl);
        
        rowData.push({ x, y, spl });
      }
      data.push(rowData);
    }
    
    const range = maxSPL - minSPL || 1;
    data.forEach(row => {
      row.forEach(cell => {
        cell.normalizedSPL = (cell.spl - minSPL) / range;
      });
    });
    
    return data;
  }, [subPositions, bounds, wavelength]);

  if (!positions || positions.length === 0 || !config) {
    return (
      <div className="w-full h-96 flex items-center justify-center text-slate-400">
        <p>Nessun dato disponibile</p>
      </div>
    );
  }

  if (subPositions.length === 0) {
    return (
      <div className="w-full h-96 flex items-center justify-center text-slate-400">
        <p>Nessun subwoofer valido trovato</p>
      </div>
    );
  }

  const getSPLColor = (normalizedSPL) => {
    const clampedSPL = Math.max(0, Math.min(1, normalizedSPL));
    
    if (clampedSPL < 0.2) return `hsl(240, 100%, ${30 + clampedSPL * 100}%)`;
    if (clampedSPL < 0.4) return `hsl(180, 100%, ${40 + clampedSPL * 50}%)`;
    if (clampedSPL < 0.6) return `hsl(60, 100%, ${45 + clampedSPL * 30}%)`;
    if (clampedSPL < 0.8) return `hsl(30, 100%, ${50 + clampedSPL * 20}%)`;
    return `hsl(0, 100%, ${40 + clampedSPL * 20}%)`;
  };

  const { minX, maxX, minY, maxY } = bounds;
  const viewWidth = maxX - minX;
  const viewHeight = maxY - minY;
  
  const cellWidth = viewWidth / gridSize;
  const cellHeight = viewHeight / gridSize;
  
  // Per visualizzare i marker: mostra solo gli stack (X uniche) per cardioid
  const isStackCardioid = config.setup_primario === 'stack_cardioid';
  const isLR = config.setup_primario === 'l_r';
  let visualMarkers;
  if (isStackCardioid) {
    visualMarkers = positions.map((stack, idx) => ({ x: stack.x, y: stack.y, id: idx + 1 }));
  } else if (isLR) {
    // Mostra solo due marker (L/R) come rettangoli
    const uniqueX = [...new Set(positions.map(p => p.x))].sort((a, b) => a - b);
    let leftX = uniqueX[0];
    let rightX = uniqueX[1];
    if (uniqueX.length < 2) {
      // Fallback simmetrico: se manca una delle X, calcola attorno allo zero usando dimensions.width
      const half = (config?.larghezza_massima || dimensions?.width || 2) / 2;
      leftX = -half;
      rightX = half;
    }
    visualMarkers = [
      { x: leftX, y: 0, id: 'L' },
      { x: rightX, y: 0, id: 'R' }
    ];
  } else {
    visualMarkers = subPositions.map((sub, idx) => ({ x: sub.x, y: sub.y, id: idx + 1 }));
  }

  return (
    <svg 
      viewBox={`${minX} ${minY} ${viewWidth} ${viewHeight}`}
      className="w-full h-full"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Heatmap */}
      {heatmapData.map((row, rowIdx) => (
        <g key={rowIdx}>
          {row.map((cell, colIdx) => (
            <rect
              key={colIdx}
              x={cell.x}
              y={cell.y}
              width={cellWidth}
              height={cellHeight}
              fill={getSPLColor(cell.normalizedSPL)}
              opacity={0.85}
            />
          ))}
        </g>
      ))}
      
      {/* Linea Y=0 */}
      <line x1={minX} y1={0} x2={maxX} y2={0} stroke="rgba(255,255,255,0.3)" strokeWidth="0.03" strokeDasharray="0.15 0.15" />
      
      {/* Markers visivi (solo stack per cardioid) */}
      {visualMarkers.map((marker, idx) => (
        <g key={idx}>
          {isLR ? (
            <rect
              x={marker.x - 0.25}
              y={marker.y - 0.18}
              width={0.5}
              height={0.36}
              rx={0.05}
              ry={0.05}
              fill="white"
              stroke="black"
              strokeWidth="0.04"
              transform={`rotate(90 ${marker.x} ${marker.y})`}
            />
          ) : (
            <circle 
              cx={marker.x} 
              cy={marker.y} 
              r={0.2} 
              fill="white"
              stroke="black"
              strokeWidth="0.04"
            />
          )}
          <text 
            x={marker.x} 
            y={marker.y + 0.06} 
            fill="black" 
            fontSize="0.18" 
            fontWeight="bold"
            textAnchor="middle"
          >
            {marker.id}
          </text>
        </g>
      ))}
      
      {/* Labels */}
      <text 
        x={(minX + maxX) / 2} 
        y={minY + 0.5} 
        fill="white" 
        fontSize="0.5" 
        fontWeight="bold"
        textAnchor="middle"
      >
        STAGE
      </text>
      
      <text 
        x={(minX + maxX) / 2} 
        y={maxY - 0.3} 
        fill="white" 
        fontSize="0.5" 
        fontWeight="bold"
        textAnchor="middle"
      >
        AUDIENCE
      </text>
    </svg>
  );
}


