// Acoustic calculation algorithms for subwoofer positioning and delay

const SPEED_OF_SOUND = 343; // m/s

const subDimensions = {
  '12"': 0.40,
  '15"': 0.50,
  '18"': 0.60,
  '21"': 0.75,
  '24"': 0.90
};

export const calculateSubwooferSetup = (config) => {
  const {
    numero_subwoofer,
    taglio,
    frequenza_crossover,
    frequenza_target_cancellazione,
    setup_primario,
    setup_secondario,
    numero_linee,
    larghezza_massima,
    gradi_arc,
    numero_sub_arc,
    numero_stack_cardioid,
    profondita_sub_cardioid,
    distanza_fisica_gradient,
    unita_ritardo,
    considera_centro_acustico,
    offset_centro_acustico,
    nome_configurazione
  } = config;

  const numSubs = parseInt(numero_subwoofer);
  const subPhysicalDimension = subDimensions[taglio] || 0.60;
  const wavelength = SPEED_OF_SOUND / frequenza_crossover;
  const maxAcousticSpacing = wavelength / 4;
  const minPhysicalDimension = subPhysicalDimension;
  // Centro acustico: offset (in metri) se abilitato
  const acousticOffset = considera_centro_acustico ? ((parseFloat(offset_centro_acustico) || 0) / 100) : 0;

  const finalResults = {
    title: "",
    notes: [],
    positions: [],
    dimensions: { width: 0, depth: 0 },
    summary: [],
    delayTable: []
  };

  const formatDelay = (delayMs) => {
    if (unita_ritardo === "ms") {
      return `${delayMs.toFixed(2)} ms`;
    } else {
      const delayMeters = (delayMs / 1000) * SPEED_OF_SOUND;
      return `${delayMeters.toFixed(2)} m`;
    }
  };

  // ===== ENDFIRE =====
  const calculateEndfire = (numSubs, freq, numLines) => {
    const targetWavelength = SPEED_OF_SOUND / frequenza_target_cancellazione;
    const optimalSpacing = targetWavelength / 4;
    
    const depthSpacing = optimalSpacing;
    const depthDelay = (depthSpacing / SPEED_OF_SOUND) * 1000;
    
    const subsPerLine = Math.floor(numSubs / numLines);
    const availableSpacing = subsPerLine > 1 ? larghezza_massima / (subsPerLine - 1) : 0;
    let longitudinalSpacing = Math.min(availableSpacing, maxAcousticSpacing);
    
    if (longitudinalSpacing < minPhysicalDimension) {
      longitudinalSpacing = minPhysicalDimension;
      const neededWidth = (subsPerLine - 1) * minPhysicalDimension;
      finalResults.notes.push(`âš ï¸ SOVRAPPOSIZIONE FISICA: Con sub ${taglio} (larghezza ${minPhysicalDimension.toFixed(2)}m), i ${subsPerLine} sub per linea necessitano di minimo ${neededWidth.toFixed(2)}m. Spazio disponibile: ${larghezza_massima.toFixed(2)}m.`);
    }
    
    const gridToGridDepth = depthSpacing - subPhysicalDimension;
    const actualWidth = subsPerLine > 1 ? (subsPerLine - 1) * longitudinalSpacing : 0;
    const actualDepth = (numLines - 1) * depthSpacing;

    return { 
      depthSpacing,
      gridToGridDepth: Math.max(0, gridToGridDepth),
      longitudinalSpacing,
      depthDelay,
      subsPerLine,
      numLines,
      depth: actualDepth,
      width: actualWidth
    };
  };

  // ===== GRADIENT =====
  const calculateGradient = (numSubs, freq) => {
    const physicalSubDepth = subPhysicalDimension;
    const userProvidedPhysicalDistanceCm = parseFloat(distanza_fisica_gradient);
    const d_fisico_actual = userProvidedPhysicalDistanceCm / 100; // distanza FISICA tra i coni
    
    // CORREZIONE: delay calcolato SOLO sulla distanza fisica, non su depthSpacing
    // Secondo EV Guide: "delay value must always be adjusted to match the spacing between loudspeaker cones"
    const fr_delay = (d_fisico_actual / SPEED_OF_SOUND) * 1000;
    
    // depthSpacing Ã¨ la distanza totale per il posizionamento (include profonditÃ  sub)
    const depthSpacing = d_fisico_actual + physicalSubDepth;
    
    const numPairs = Math.floor(numSubs / 2);
    const pairsPerLine = numPairs;
    const availableSpacing = pairsPerLine > 1 ? larghezza_massima / (pairsPerLine - 1) : 0;
    let longitudinalSpacing = Math.min(availableSpacing, maxAcousticSpacing);
    
    if (longitudinalSpacing < minPhysicalDimension) {
      longitudinalSpacing = minPhysicalDimension;
      const neededWidth = (pairsPerLine - 1) * minPhysicalDimension;
      finalResults.notes.push(`âš ï¸ SOVRAPPOSIZIONE FISICA: Con sub ${taglio}, le ${pairsPerLine} coppie necessitano di minimo ${neededWidth.toFixed(2)}m.`);
    }
    
    const actualWidth = pairsPerLine > 1 ? (pairsPerLine - 1) * longitudinalSpacing : 0;
    const actualDepth = depthSpacing;

    return { 
      depthSpacing,
      d_fisico: d_fisico_actual,
      longitudinalSpacing,
      fr_delay,
      numPairs,
      pairsPerLine,
      numLines: 2,
      depth: actualDepth,
      width: actualWidth
    };
  };

  // ===== STACK CARDIOID =====
  const calculateStackCardioid = (totalSubs, numModulesPerStack, profondita_input, freq) => {
    const DV = parseFloat(profondita_input) / 100;
    // Se consideriamo il centro acustico a metri 'acousticOffset' dietro la griglia,
    // la distanza effettiva tra i CONI del modulo frontale e del modulo fisicamente girato Ã¨ DV - 2a
    const DV_eff = Math.max(DV - 2 * acousticOffset, 0);
    const delay_cardioid = (DV_eff / SPEED_OF_SOUND) * 1000;
    const numStacks = Math.floor(totalSubs / numModulesPerStack);
    const availableSpacing = numStacks > 1 ? larghezza_massima / (numStacks - 1) : 0;
    let horizontalSpacing = Math.min(availableSpacing, maxAcousticSpacing);
    
    if (horizontalSpacing < minPhysicalDimension && numStacks > 1) {
      horizontalSpacing = minPhysicalDimension;
    }
    
    const totalWidth = numStacks > 1 ? (numStacks - 1) * horizontalSpacing : 0;
    const positions = [];
    let stackGlobalId = 1;

    for (let stackIdx = 0; stackIdx < numStacks; stackIdx++) {
      const stack_x = numStacks > 1 ? -totalWidth / 2 + stackIdx * horizontalSpacing : 0;
      const stackModules = [];
      
      for (let moduleIdx = 1; moduleIdx <= numModulesPerStack; moduleIdx++) {
        const isPhysicallyInverted = moduleIdx === 1;
        const polarity = moduleIdx === 1 ? -1 : 1;
        const delay = isPhysicallyInverted ? delay_cardioid : 0;
        
        stackModules.push({
          moduleIndex: moduleIdx,
          delay: delay,
          polarity: polarity,
          fisicamente_invertito: isPhysicallyInverted,
          arcDelay: 0
        });
      }
      
      positions.push({
        id: stackGlobalId++,
        stackIndex: stackIdx + 1,
        x: stack_x,
        y: 0,
        modules: stackModules,
        label: `S${stackIdx + 1}`
      });
    }
    
    const attenuazioneRetro = 6 + 6 * (numModulesPerStack - 2);
    
    return {
      positions,
      numStacks,
      numModulesPerStack,
      horizontalSpacing,
      delay_cardioid,
      attenuazioneRetro: Math.max(6, attenuazioneRetro),
      depth: (numModulesPerStack - 1) * DV,
      width: totalWidth + (numStacks > 0 ? subPhysicalDimension : 0),
      DV: DV,
      DV_eff: DV_eff
    };
  };

  // ===== ARC =====
  const calculateElectronicArc = (numSubs, totalAngle, maxWidth) => {
    if (numSubs < 2) {
      return {
        spacing: 0,
        delays: numSubs === 1 ? [0] : [],
        positions: numSubs === 1 ? [{ id: 1, x: 0, y: 0, delay: 0, polarity: 1, label: '1' }] : [],
        radius: Infinity,
        maxDelay: 0,
        actualWidth: 0
      };
    }

    const maxAllowedByWidth = maxWidth / (numSubs - 1);
    let spacing = Math.min(maxAcousticSpacing, maxAllowedByWidth);

    if (spacing < minPhysicalDimension) {
      spacing = minPhysicalDimension;
    }
    
    const actualWidth = (numSubs - 1) * spacing;
    const angleRad = (totalAngle * Math.PI) / 180;
    let radius = totalAngle === 0 ? Infinity : actualWidth / (2 * Math.sin(angleRad / 2));
    
    if (isNaN(radius) || !isFinite(radius)) {
      radius = actualWidth / (angleRad || 0.0001);
    }
    
    const delays = [];
    const positions = [];
    let minDistanceFromFocus = Infinity;
    const tempDistances = [];
    
    for (let i = 0; i < numSubs; i++) {
      const x = -actualWidth / 2 + i * spacing;
      const distanceFromFocus = totalAngle === 0 ? 0 : Math.sqrt(Math.pow(x, 2) + Math.pow(radius, 2));
      tempDistances.push({ x, distanceFromFocus });
      minDistanceFromFocus = Math.min(minDistanceFromFocus, distanceFromFocus);
    }
    
    tempDistances.forEach((item, i) => {
      const delay = Math.max(0, ((item.distanceFromFocus - minDistanceFromFocus) / SPEED_OF_SOUND) * 1000);
      delays.push(delay);
      positions.push({
        id: i + 1,
        x: item.x,
        y: 0,
        delay,
        polarity: 1,
        label: `${i + 1}`
      });
    });
    
    return { 
      spacing, 
      delays, 
      positions, 
      radius: isFinite(radius) ? radius : Infinity,
      maxDelay: numSubs > 0 ? Math.max(...delays) : 0,
      actualWidth
    };
  };

  // ===== MAIN CALCULATION LOGIC =====
  
  // ENDFIRE + ARC
  if (setup_primario === 'endfire' && setup_secondario === 'arc') {
    finalResults.title = `Endfire ${numero_linee} Linee + Arc`;
    const endfireCalc = calculateEndfire(numSubs, frequenza_crossover, numero_linee);
    const arcAngle = parseFloat(gradi_arc) || 90;
    
    // Prima crea le posizioni Endfire
    let subGlobalId = 1;
    for (let lineIdx = 0; lineIdx < endfireCalc.numLines; lineIdx++) {
      for (let subIdx = 0; subIdx < endfireCalc.subsPerLine; subIdx++) {
        const x = -endfireCalc.width / 2 + subIdx * endfireCalc.longitudinalSpacing;
  // Linee allineate lungo Y verso PALCO (negativo): L1 front a y=0, le successive verso STAGE = valori negativi
  const y = -lineIdx * endfireCalc.depthSpacing;
  // Convenzione pratica: piÃ¹ delay alle linee frontali, 0 alla piÃ¹ arretrata
  const endfireDelay = (endfireCalc.numLines - 1 - lineIdx) * endfireCalc.depthDelay;
        
        // Numerazione progressiva per linea: linea1 prende 1-subsPerLine, linea2 prende (subsPerLine+1)-(subsPerLine*2), ecc.
        const subNumber = lineIdx * endfireCalc.subsPerLine + subIdx + 1;
        
        finalResults.positions.push({
          id: subGlobalId++,
          x,
          y,
          delay: endfireDelay,
          polarity: 1,
          label: `${subNumber} L${lineIdx + 1}`
        });
      }
    }
    
    // Poi calcola e aggiungi i delay Arc
    const arcCalc = calculateElectronicArc(endfireCalc.subsPerLine, arcAngle, endfireCalc.width);
    
    // Applica i delay Arc a ogni linea
    for (let lineIdx = 0; lineIdx < endfireCalc.numLines; lineIdx++) {
      for (let subIdx = 0; subIdx < endfireCalc.subsPerLine; subIdx++) {
        const posIdx = lineIdx * endfireCalc.subsPerLine + subIdx;
        const arcDelay = arcCalc.delays[subIdx] || 0;
        finalResults.positions[posIdx].delay += arcDelay; // somma delay Arc al delay Endfire
        finalResults.positions[posIdx].arcDelay = arcDelay;
      }
    }
    
    finalResults.dimensions = { width: endfireCalc.width, depth: endfireCalc.depth };
    finalResults.summary.push(`Endfire: ${endfireCalc.numLines} linee, delay ${formatDelay(endfireCalc.depthDelay)}`);
  finalResults.summary.push(`Arc: ${arcAngle}°, raggio ${isFinite(arcCalc.radius) ? arcCalc.radius.toFixed(2) + 'm' : '∞'}`);
    finalResults.summary.push(`Delay Arc massimo: ${formatDelay(arcCalc.maxDelay)}`);
  }
  
  // L - R + GRADIENT (secondario): coppie F/R ripetute per lato lungo Y
  else if (setup_primario === 'l_r' && setup_secondario === 'gradient') {
    finalResults.title = `L - R + Gradient (coppie per lato)`;
    const perSide = Math.floor(numSubs / 2); // 2 sub per lato quando totale=4
    const pairsPerSideRaw = Math.floor(perSide / 2);
    // Limite richiesto: solo 1 coppia per lato (4 sub totali). Se dati incoerenti, clamp e avvisa.
    const pairsPerSide = Math.min(1, pairsPerSideRaw);
    const halfWidth = (parseFloat(larghezza_massima) || 0) / 2;
    const xLeft = -halfWidth;
    const xRight = halfWidth;

    // Parametri gradient
    const d_fisico_actual = (parseFloat(distanza_fisica_gradient) || 0) / 100; // m
    const fr_delay_ms = (d_fisico_actual / SPEED_OF_SOUND) * 1000; // delay per il rear
    const depthSpacing = d_fisico_actual + (subDimensions[taglio] || 0.60); // distanza tra front di una coppia e front della successiva

    let subGlobalId = 1;
    // Lato sinistro: per ogni coppia k, FRONT a y = -k*depthSpacing, REAR a y = -k*depthSpacing - d_fisico
    for (let k = 0; k < pairsPerSide; k++) {
      const yFront = -k * depthSpacing;
      const yRear = yFront - d_fisico_actual;
      // FRONT (normale, senza delay)
      finalResults.positions.push({
        id: subGlobalId++,
        x: xLeft,
        y: yFront,
        delay: 0,
        polarity: 1,
        label: `L${2*k + 1}`
      });
      // REAR (invertito, con delay d_fisico/c)
      finalResults.positions.push({
        id: subGlobalId++,
        x: xLeft,
        y: yRear,
        delay: fr_delay_ms,
        polarity: -1,
        label: `L${2*k + 2}`
      });
    }

    // Lato destro: speculare
    for (let k = 0; k < pairsPerSide; k++) {
      const yFront = -k * depthSpacing;
      const yRear = yFront - d_fisico_actual;
      // FRONT
      finalResults.positions.push({
        id: subGlobalId++,
        x: xRight,
        y: yFront,
        delay: 0,
        polarity: 1,
        label: `R${2*k + 1}`
      });
      // REAR
      finalResults.positions.push({
        id: subGlobalId++,
        x: xRight,
        y: yRear,
        delay: fr_delay_ms,
        polarity: -1,
        label: `R${2*k + 2}`
      });
    }

    // Se l'input porta a piÃ¹ di 1 coppia per lato, avvisa che useremo solo la prima.
    if (pairsPerSideRaw > 1) {
      finalResults.notes.push(`â„¹ï¸ L - R + Gradient supporta una sola coppia per lato: considerate solo le prime 2 coppie totali (4 sub).`);
    }

    // Dimensioni complessive
    const depth = (pairsPerSide > 0) ? ( (pairsPerSide - 1) * depthSpacing + d_fisico_actual ) : 0;
    finalResults.dimensions = { width: (parseFloat(larghezza_massima) || 0), depth };
    finalResults.summary.push(`Distanza L-R: ${(parseFloat(larghezza_massima) || 0).toFixed(2)} m`);
    finalResults.summary.push(`Gradient per lato: ${pairsPerSide} coppie (front+rear), passo coppie ${depthSpacing.toFixed(2)} m`);
    finalResults.summary.push(`Rear invertito con delay: ${(fr_delay_ms).toFixed(2)} ms`);
  }
  
  // L - R + STACK CARDIOID (secondario): stack cardioidi per lato
  else if (setup_primario === 'l_r' && setup_secondario === 'stack_cardioid') {
    finalResults.title = `L - R + Stack Cardioid (per lato)`;
    if (numSubs % 2 !== 0) {
      finalResults.notes.push(`âš ï¸ L - R + Stack Cardioid richiede un numero PARI di sub. Hai ${numSubs}.`);
    }
    const perSideModules = Math.floor(numSubs / 2); // 2 o 3
    const halfWidth = (parseFloat(larghezza_massima) || 0) / 2;
    const xLeft = -halfWidth;
    const xRight = halfWidth;

  const DV = (parseFloat(profondita_sub_cardioid) || 60) / 100; // m
  const DV_eff = Math.max(DV - 2 * acousticOffset, 0);
  const delay_cardioid_ms = (DV_eff / SPEED_OF_SOUND) * 1000;

    let subGlobalId = 1;
    // Funzione ausiliaria: genera array di offset Y per uno stack da n moduli
    const stackY = (n) => {
      if (n === 1) return [0];
      if (n === 2) return [0, -DV]; // front a 0, rear verso palco
      // n === 3: distribuisci simmetricamente attorno a 0 per miglior lettura
      return [0, -DV, DV];
    };

    const yOffsets = stackY(perSideModules);

    // Lato sinistro
    yOffsets.forEach((y, idx) => {
      const isRear = (idx === 1 && perSideModules >= 2); // tratta il secondo come rear
      finalResults.positions.push({
        id: subGlobalId++,
        x: xLeft,
        y,
        delay: isRear ? delay_cardioid_ms : 0,
        polarity: isRear ? -1 : 1,
        fisicamente_invertito: isRear,
        label: `L${idx + 1}`
      });
    });

    // Lato destro
    yOffsets.forEach((y, idx) => {
      const isRear = (idx === 1 && perSideModules >= 2);
      finalResults.positions.push({
        id: subGlobalId++,
        x: xRight,
        y,
        delay: isRear ? delay_cardioid_ms : 0,
        polarity: isRear ? -1 : 1,
        fisicamente_invertito: isRear,
        label: `R${idx + 1}`
      });
    });

    // Applica l'offset del centro acustico ai POSIZIONAMENTI (solo dove le Y derivano dalla geometria del cabinet)
    if (acousticOffset > 0) {
      finalResults.positions = finalResults.positions.map(p => {
        // Modulo frontale: centro acustico a -a (verso STAGE). Modulo girato: +a
        const isInverted = !!p.fisicamente_invertito;
        const yAdj = isInverted ? (p.y + acousticOffset) : (p.y - acousticOffset);
        return { ...p, y: yAdj };
      });
    }

    // Dimensioni complessive: larghezza L-R e profonditÃ  dello stack (circa DV se >=2)
    const depth = perSideModules >= 2 ? (DV * (perSideModules - 1)) : 0;
    finalResults.dimensions = { width: (parseFloat(larghezza_massima) || 0), depth };
    finalResults.summary.push(`Distanza L-R: ${(parseFloat(larghezza_massima) || 0).toFixed(2)} m`);
    finalResults.summary.push(`Stack per lato: ${perSideModules} moduli (rear invertito con delay ${formatDelay(delay_cardioid_ms)})`);
    if (acousticOffset > 0) {
      finalResults.summary.push(`Centro acustico considerato: ${offset_centro_acustico} cm (DV effettivo = ${(DV_eff).toFixed(2)} m)`);
    }
  }
  
  // GRADIENT + ARC
  else if (setup_primario === 'gradient' && setup_secondario === 'arc') {
    finalResults.title = `Gradient + Arc`;
    const gradientCalc = calculateGradient(numSubs, frequenza_crossover);
    const arcAngle = parseFloat(gradi_arc) || 90;
    
    // Prima crea le posizioni Gradient
    let subGlobalId = 1;
    
    // Prima tutti i sub della L1 (rear, verso PALCO = Y negativo) - con delay e inversione
    for (let pairIdx = 0; pairIdx < gradientCalc.numPairs; pairIdx++) {
      const x = -gradientCalc.width / 2 + pairIdx * gradientCalc.longitudinalSpacing;
      const subNumberL1 = pairIdx + 1;
      
      finalResults.positions.push({
        id: subGlobalId++,
        x,
        // ATTENZIONE: per il modello acustico usiamo la distanza tra i CONI (d_fisico)
        // Non la distanza "fisica totale" tra casse, che include la profonditÃ  del cabinet.
        y: -gradientCalc.d_fisico,
        delay: gradientCalc.fr_delay,
        polarity: -1,
        label: `${subNumberL1} L1`,
        line: 1
      });
    }
    
  // Poi tutti i sub della L2 (front, verso PUBBLICO = Y zero) - normali senza delay
    for (let pairIdx = 0; pairIdx < gradientCalc.numPairs; pairIdx++) {
      const x = -gradientCalc.width / 2 + pairIdx * gradientCalc.longitudinalSpacing;
      const subNumberL2 = gradientCalc.numPairs + pairIdx + 1;
      
      finalResults.positions.push({
        id: subGlobalId++,
        x,
        y: 0,
        delay: 0,
        polarity: 1,
        label: `${subNumberL2} L2`,
        line: 2
      });
    }
    
  // Poi calcola e aggiungi i delay Arc
    const arcCalc = calculateElectronicArc(gradientCalc.numPairs, arcAngle, gradientCalc.width);
    
    // Applica i delay Arc - adesso l'ordine Ã¨: prima tutti L1, poi tutti L2
    for (let pairIdx = 0; pairIdx < gradientCalc.numPairs; pairIdx++) {
      const arcDelay = arcCalc.delays[pairIdx] || 0;
      // L1 (primi numPairs elementi)
      finalResults.positions[pairIdx].delay += arcDelay;
      finalResults.positions[pairIdx].arcDelay = arcDelay;
      // L2 (successivi numPairs elementi)
      finalResults.positions[gradientCalc.numPairs + pairIdx].delay += arcDelay;
      finalResults.positions[gradientCalc.numPairs + pairIdx].arcDelay = arcDelay;
    }
    
    finalResults.dimensions = { width: gradientCalc.width, depth: gradientCalc.depth };
    finalResults.summary.push(`Gradient: ${gradientCalc.numPairs} coppie, delay F-R ${formatDelay(gradientCalc.fr_delay)}`);
  finalResults.summary.push(`Arc: ${arcAngle}°, raggio ${isFinite(arcCalc.radius) ? arcCalc.radius.toFixed(2) + 'm' : '∞'}`);
    finalResults.summary.push(`Delay Arc massimo: ${formatDelay(arcCalc.maxDelay)}`);
  }
  
  // STACK CARDIOID + ARC
  else if (setup_primario === 'stack_cardioid' && setup_secondario === 'arc') {
    const numModules = parseInt(numero_stack_cardioid) || 3;
    const arcAngle = parseFloat(gradi_arc) || 90;
    finalResults.title = `Stack Cardioid (${numModules} moduli) + Arc`;
    const cardioidCalc = calculateStackCardioid(numSubs, numModules, profondita_sub_cardioid, frequenza_crossover);
    
    // Prima crea le posizioni Stack Cardioid
  finalResults.positions = cardioidCalc.positions;
    
    // Poi calcola e aggiungi i delay Arc
    const arcCalc = calculateElectronicArc(cardioidCalc.numStacks, arcAngle, cardioidCalc.width);
    
    // Applica i delay Arc a ogni stack
    finalResults.positions.forEach((stack, stackIdx) => {
      const arcDelay = arcCalc.delays[stackIdx] || 0;
      // Aggiungi arcDelay a ogni modulo dello stack
      stack.modules.forEach(module => {
        module.arcDelay = arcDelay;
        // Il delay totale del modulo sarÃ : delay_cardioid + arcDelay
      });
    });
    
    finalResults.dimensions = { width: cardioidCalc.width, depth: cardioidCalc.depth };
    finalResults.summary.push(`Stack Cardioid: ${cardioidCalc.numStacks} stack, ${numModules} moduli/stack`);
    finalResults.summary.push(`Delay cardioide: ${formatDelay(cardioidCalc.delay_cardioid)}`);
  finalResults.summary.push(`Arc: ${arcAngle}°, raggio ${isFinite(arcCalc.radius) ? arcCalc.radius.toFixed(2) + 'm' : '∞'}`);
    finalResults.summary.push(`Delay Arc massimo: ${formatDelay(arcCalc.maxDelay)}`);
    if (acousticOffset > 0) {
      finalResults.summary.push(`Centro acustico considerato: ${offset_centro_acustico} cm (DV effettivo = ${(cardioidCalc.DV_eff).toFixed(2)} m)`);
    }
  }
  
  // ENDFIRE (solo)
  else if (setup_primario === 'endfire' && setup_secondario === 'nessuno') {
    finalResults.title = `Endfire ${numero_linee} Linee`;
    const calc = calculateEndfire(numSubs, frequenza_crossover, numero_linee);
    
    let subGlobalId = 1;
    for (let lineIdx = 0; lineIdx < calc.numLines; lineIdx++) {
      for (let subIdx = 0; subIdx < calc.subsPerLine; subIdx++) {
        const x = -calc.width / 2 + subIdx * calc.longitudinalSpacing;
  // Linee verso STAGE in negativo; front a 0
  const y = -lineIdx * calc.depthSpacing;
  // Convenzione pratica: piÃ¹ delay alla front, 0 alla piÃ¹ arretrata
  const delay = (calc.numLines - 1 - lineIdx) * calc.depthDelay;
        
        // Numerazione progressiva per linea
        const subNumber = lineIdx * calc.subsPerLine + subIdx + 1;
        
        finalResults.positions.push({
          id: subGlobalId++,
          x,
          y,
          delay,
          polarity: 1,
          label: `${subNumber} L${lineIdx + 1}`
        });
      }
    }
    
    finalResults.dimensions = { width: calc.width, depth: calc.depth };
    finalResults.summary.push(`Spaziatura longitudinale: ${calc.longitudinalSpacing.toFixed(2)} m`);
    finalResults.summary.push(`ProfonditÃ  tra linee: ${calc.depthSpacing.toFixed(2)} m`);
    finalResults.summary.push(`Delay tra linee: ${formatDelay(calc.depthDelay)}`);
  }
  
  // GRADIENT (solo)
  else if (setup_primario === 'gradient' && setup_secondario === 'nessuno') {
    finalResults.title = `Gradient (2 Linee)`;
    const calc = calculateGradient(numSubs, frequenza_crossover);
    
    let subGlobalId = 1;
    
    // Prima tutti i sub della L1 (rear, verso PALCO = Y negativo) - con delay e inversione
    for (let pairIdx = 0; pairIdx < calc.numPairs; pairIdx++) {
      const x = -calc.width / 2 + pairIdx * calc.longitudinalSpacing;
      const subNumberL1 = pairIdx + 1;
      
      finalResults.positions.push({
        id: subGlobalId++,
        x,
        // Per il modello acustico usiamo la distanza tra i CONI (d_fisico)
        y: -calc.d_fisico,
        delay: calc.fr_delay,
        polarity: -1,
        label: `${subNumberL1} L1`,
        line: 1
      });
    }
    
    // Poi tutti i sub della L2 (front, verso PUBBLICO = Y zero) - normali senza delay
    for (let pairIdx = 0; pairIdx < calc.numPairs; pairIdx++) {
      const x = -calc.width / 2 + pairIdx * calc.longitudinalSpacing;
      const subNumberL2 = calc.numPairs + pairIdx + 1;
      
      finalResults.positions.push({
        id: subGlobalId++,
        x,
        y: 0,
        delay: 0,
        polarity: 1,
        label: `${subNumberL2} L2`,
        line: 2
      });
    }
    
    finalResults.dimensions = { width: calc.width, depth: calc.depth };
    finalResults.summary.push(`Coppie: ${calc.numPairs}`);
    finalResults.summary.push(`Spaziatura longitudinale: ${calc.longitudinalSpacing.toFixed(2)} m`);
    finalResults.summary.push(`Distanza fisica F-R: ${calc.d_fisico.toFixed(2)} m`);
    finalResults.summary.push(`Delay F-R: ${formatDelay(calc.fr_delay)}`);
  }
  
  // STACK CARDIOID (solo)
  else if (setup_primario === 'stack_cardioid' && setup_secondario === 'nessuno') {
    const numModules = parseInt(numero_stack_cardioid) || 3;
    // // // console.log('[acousticCalculations] Stack Cardioid:', { numSubs, numModules, profondita_sub_cardioid });
    finalResults.title = `Stack Cardioid (${numModules} moduli/stack)`;
    const calc = calculateStackCardioid(numSubs, numModules, profondita_sub_cardioid, frequenza_crossover);
    
    // // // console.log('[acousticCalculations] Stack Cardioid result:', calc);
    finalResults.positions = calc.positions;
    finalResults.dimensions = { width: calc.width, depth: calc.depth };
    finalResults.summary.push(`Numero stack: ${calc.numStacks}`);
    finalResults.summary.push(`Moduli per stack: ${calc.numModulesPerStack}`);
    finalResults.summary.push(`Spacing orizzontale: ${calc.horizontalSpacing.toFixed(2)} m`);
    finalResults.summary.push(`Delay cardioide: ${formatDelay(calc.delay_cardioid)}`);
    finalResults.summary.push(`Attenuazione posteriore: ~${calc.attenuazioneRetro.toFixed(0)} dB`);
    if (acousticOffset > 0) {
      finalResults.summary.push(`Centro acustico considerato: ${offset_centro_acustico} cm (DV effettivo = ${(calc.DV_eff).toFixed(2)} m)`);
    }
  }
  
  // L - R (solo)
  else if (setup_primario === 'l_r' && setup_secondario === 'nessuno') {
    finalResults.title = `L - R`;
    // Requisito: numero pari di sub
    if (numSubs % 2 !== 0) {
      finalResults.notes.push(`âš ï¸ L - R richiede un numero PARI di sub. Hai ${numSubs}.`);
    }
    const perSide = Math.floor(numSubs / 2);
    const halfWidth = (parseFloat(larghezza_massima) || 0) / 2;
    const xLeft = -halfWidth;
    const xRight = halfWidth;

  // Ignora vincolo Î»/4: usa larghezza_massima come distanza L-R.
  // Stack verticali: nella vista dall'alto coincidono nello stesso punto (stesso X,Y)
  const stepY = 0; // non spostare lungo Y in pianta
    let subGlobalId = 1;

    // Costruisci i sub del lato sinistro
    for (let i = 0; i < perSide; i++) {
      finalResults.positions.push({
        id: subGlobalId++,
        x: xLeft,
        y: 0,
        delay: 0,
        polarity: 1,
        label: `L${i + 1}`
      });
    }
    // Costruisci i sub del lato destro
    for (let i = 0; i < perSide; i++) {
      finalResults.positions.push({
        id: subGlobalId++,
        x: xRight,
        y: 0,
        delay: 0,
        polarity: 1,
        label: `R${i + 1}`
      });
    }

    // Dimensioni complessive
  const depth = 0;
    finalResults.dimensions = { width: (parseFloat(larghezza_massima) || 0), depth };
    finalResults.summary.push(`Distanza L-R: ${(parseFloat(larghezza_massima) || 0).toFixed(2)} m`);
    if (perSide > 1) {
      finalResults.summary.push(`Stack verticali: ${perSide} moduli per lato (passo ${stepY.toFixed(2)} m)`);
    } else {
      finalResults.summary.push(`Un modulo per lato`);
    }
  }
  
  // ARC ONLY
  else if (setup_primario === 'arc' && setup_secondario === 'nessuno') {
    // Usa sempre tutti i sub disponibili; la spaziatura verrÃ  limitata a Î»/4 e alla larghezza disponibile
    const arcSubs = numSubs;
    const arcAngle = parseFloat(gradi_arc) || 90;
  finalResults.title = `Arc Elettronico (${arcAngle}°)`;
    const calc = calculateElectronicArc(arcSubs, arcAngle, larghezza_massima);
    
    finalResults.positions = calc.positions;
    finalResults.dimensions = { width: calc.actualWidth, depth: 0 };
  finalResults.summary.push(`Angolo: ${arcAngle}°`);
    finalResults.summary.push(`Raggio: ${isFinite(calc.radius) ? calc.radius.toFixed(2) + ' m' : 'âˆž'}`);
    finalResults.summary.push(`Spaziatura: ${calc.spacing.toFixed(2)} m`);
    finalResults.summary.push(`Delay massimo: ${formatDelay(calc.maxDelay)}`);
  }
  
  // L - R + ENDFIRE (secondario): una colonna Endfire per lato lungo Y
  else if (setup_primario === 'l_r' && setup_secondario === 'endfire') {
    finalResults.title = `L - R + Endfire (colonne per lato)`;
    // Assunzioni: array lungo Y, verso pubblico = Y positivo; posizioniamo il fronte a y=0
    // Colonna: N/2 moduli per lato; spaziatura ottimale d = Î»_target/4; Î”t = d/c progressivo per modulo (piÃ¹ arretrato = piÃ¹ delay)
    const perSide = Math.floor(numSubs / 2);
    const halfWidth = (parseFloat(larghezza_massima) || 0) / 2;
    const xLeft = -halfWidth;
    const xRight = halfWidth;

    const targetWavelength = SPEED_OF_SOUND / (parseFloat(frequenza_target_cancellazione) || frequenza_crossover || 80);
    const d_opt = targetWavelength / 4; // metri
    const deltaT_ms = (d_opt / SPEED_OF_SOUND) * 1000; // ms per passo

    let subGlobalId = 1;
    // Lato Left: i=0 front (y=0), i cresce andando verso palco (y negativa)
    // Endfire (convenzionale): piÃ¹ delay ai moduli frontali, 0 al rear
    for (let i = 0; i < perSide; i++) {
      const y = -i * d_opt;
      const delay = (perSide - 1 - i) * deltaT_ms; // front maggiore, rear 0
      finalResults.positions.push({
        id: subGlobalId++,
        x: xLeft,
        y,
        delay,
        polarity: 1,
        label: `L${i + 1}`
      });
    }
    // Lato Right: speculare
    for (let i = 0; i < perSide; i++) {
      const y = -i * d_opt;
      const delay = (perSide - 1 - i) * deltaT_ms; // front maggiore, rear 0
      finalResults.positions.push({
        id: subGlobalId++,
        x: xRight,
        y,
        delay,
        polarity: 1,
        label: `R${i + 1}`
      });
    }

    // Dimensioni complessive (larghezza L-R e profonditÃ  della colonna)
    const depth = (perSide - 1) * d_opt;
    finalResults.dimensions = { width: (parseFloat(larghezza_massima) || 0), depth };
    finalResults.summary.push(`Distanza L-R: ${(parseFloat(larghezza_massima) || 0).toFixed(2)} m`);
    finalResults.summary.push(`Colonna Endfire per lato: ${perSide} moduli, passo ${d_opt.toFixed(2)} m`);
    finalResults.summary.push(`Î”t progressivo: ${formatDelay(deltaT_ms)} per modulo`);
  }
  
  // DEFAULT: Simple line
  else {
    finalResults.title = `Setup Semplice`;
    finalResults.notes.push(`Setup "${setup_primario}" + "${setup_secondario}" non ancora implementato.`);
    
    const spacing = Math.min(larghezza_massima / (numSubs - 1 || 1), maxAcousticSpacing);
    for (let i = 0; i < numSubs; i++) {
      finalResults.positions.push({
        id: i + 1,
        x: -larghezza_massima / 2 + i * spacing,
        y: 0,
        delay: 0,
        polarity: 1,
        label: `${i + 1}`
      });
    }
    finalResults.dimensions = { width: larghezza_massima, depth: 0 };
  }

  // Generate delay table
  // Per Stack Cardioid, ogni modulo Ã¨ una voce separata nella delay table
  if (setup_primario === 'stack_cardioid') {
    finalResults.delayTable = [];
    finalResults.positions.forEach(stack => {
      if (stack.modules) {
        stack.modules.forEach(module => {
          const totalDelay = (module.delay || 0) + (module.arcDelay || 0);
          finalResults.delayTable.push({
            sub: `Stack ${stack.stackIndex} - Modulo ${module.moduleIndex}`,
            delay: formatDelay(totalDelay),
            delayBase: module.delay ? formatDelay(module.delay) : '-',
            delayArc: module.arcDelay ? formatDelay(module.arcDelay) : '-',
            polarity: module.polarity === -1 ? 'Invertita' : 'Normale',
            fisicamente_invertito: module.fisicamente_invertito ? 'SÃ¬' : 'No'
          });
        });
      }
    });
  } else {
    // Per tutti gli altri setup
    finalResults.delayTable = finalResults.positions.map(pos => {
      const totalDelay = pos.delay || 0;
      const baseDelay = pos.arcDelay ? (totalDelay - pos.arcDelay) : totalDelay;
      
      return {
        sub: pos.label || `Sub ${pos.id}`,
        delay: formatDelay(totalDelay),
        ...(pos.arcDelay ? {
          delayBase: formatDelay(baseDelay),
          delayArc: formatDelay(pos.arcDelay)
        } : {}),
        polarity: pos.polarity === -1 ? 'Invertita' : 'Normale',
        ...(typeof pos.fisicamente_invertito !== 'undefined' ? {
          fisicamente_invertito: pos.fisicamente_invertito ? 'SÃ¬' : 'No'
        } : {})
      };
    });
  }

  return finalResults;
};



