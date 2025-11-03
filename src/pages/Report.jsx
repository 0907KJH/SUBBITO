import React, { useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Printer, Settings, BarChart, Info, Table as TableIcon } from 'lucide-react';
import EnhancedSetupVisualizer from '@/components/EnhancedSetupVisualizer';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useTheme } from '@/components/ThemeContext';

const ReportValue = ({ label, value, unit, isDark }) => (
  <div className={`flex items-center justify-between p-3 ${isDark ? 'bg-slate-800/50' : 'bg-gray-100'} rounded-lg`}>
    <span className={`${isDark ? 'text-slate-300' : 'text-slate-700'} text-sm`}>{label}</span>
    <Badge className="text-base bg-blue-600 text-white">{value} <span className="text-xs ml-1 opacity-80">{unit}</span></Badge>
  </div>
);

export default function Report() {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Try location.state first, then sessionStorage
  let config, results;
  if (location.state?.config && location.state?.results) {
    // console.log('[Report] Loading from location.state');
    config = location.state.config;
    results = location.state.results;
  } else {
    // console.log('[Report] Trying sessionStorage');
    const stored = sessionStorage.getItem('subbito_results');
    if (stored) {
      const parsed = JSON.parse(stored);
      // console.log('[Report] Loaded from sessionStorage:', parsed);
      config = parsed.config;
      results = parsed.results;
    } else {
      // console.log('[Report] No data in sessionStorage');
    }
  }
  
  const { isDarkTheme, bgMain, bgCard, borderCard, textPrimary, textSecondary } = useTheme();

  // Debug effect
  useEffect(() => {
    // console.log('[Report] Config:', config);
    // console.log('[Report] Results:', results);
    if (results) {
      // console.log('[Report] Results.summary:', results.summary);
      // console.log('[Report] Results.notes:', results.notes);
      // console.log('[Report] Results.delayTable:', results.delayTable);
    }
  }, []);

  if (!config || !results) {
    return (
      <div className={`min-h-screen ${bgMain} flex items-center justify-center p-4 md:p-6 text-center`}>
        <div>
          <h1 className={`text-2xl md:text-3xl font-bold mb-2 ${textPrimary}`}>Dati non trovati</h1>
          <p className={`text-sm md:text-base ${textSecondary} mb-6`}>
            Torna alla pagina di configurazione per eseguire un calcolo.
          </p>
          <Link to={createPageUrl('Home')}>
            <Button className="bg-blue-600 hover:bg-blue-700">
              Torna alla Configurazione
            </Button>
          </Link>
        </div>
      </div>
    );
  }
  
  const getSetupLabel = (setup) => {
    const labels = {
      endfire: "Endfire",
      gradient: "Gradient",
      arc: "Arc",
      stack_cardioid: "Stack Cardioid",
      l_r: "L - R",
      nessuno: "Nessuno"
    };
    return labels[setup] || setup;
  };

  const formatDelayTableData = () => {
    if (!results.delayTable || results.delayTable.length === 0) return [];

    const isStackCardioid = config.setup_primario === 'stack_cardioid';
    const isLR = config.setup_primario === 'l_r';

    // Costruisci mappa "label originale" -> { idx, label: "n (L/R)", side }
    let lrDisplayMap = null;
    if (isLR && Array.isArray(results.positions) && results.positions.length > 0) {
      const decorated = results.positions.map(p => {
        const lbl = (p.label || '').trim();
        const m = lbl.match(/^([LR])/i);
        const side = m ? m[1].toUpperCase() : ((p.x || 0) < 0 ? 'L' : 'R');
        return { ...p, side };
      });
      decorated.sort((a, b) => {
        if (a.y !== b.y) return a.y - b.y; // piÃ¹ negativo (vicino palco) prima
        if (a.side !== b.side) return a.side === 'L' ? -1 : 1;
        return (a.x || 0) - (b.x || 0);
      });
      lrDisplayMap = new Map();
      decorated.forEach((p, idx) => {
        lrDisplayMap.set(p.label, { idx: idx + 1, label: `${idx + 1} (${p.side})`, side: p.side });
      });
    }

    const rows = results.delayTable.map((row) => {
      let subLabel = '';
      let delayValue = row.delay;
      let isInverted = false;
      let isFisicamenteInvertito = false;
      const originalSub = row.sub || '';

      // L-R: usa label unificata e ordering per profonditÃ 
      if (isLR && lrDisplayMap && lrDisplayMap.has(originalSub)) {
        subLabel = lrDisplayMap.get(originalSub).label;
      } else if (isStackCardioid) {
        const stackMatch = originalSub.match(/Stack\s+(\d+)/i);
        const moduleMatch = originalSub.match(/Modulo\s+(\d+)/i);
        const stackNum = stackMatch ? stackMatch[1] : '?';
        const moduleNum = moduleMatch ? moduleMatch[1] : '?';
        subLabel = `${stackNum}.${moduleNum}`;
      } else {
        // Fallback generico (altri setup primari)
        subLabel = originalSub;
      }

      if (typeof row.delay === 'string') {
        const finalMatch = row.delay.match(/=\s*([\d.]+\s*(?:ms|m))/);
        if (finalMatch) {
          delayValue = finalMatch[1];
        } else {
          const valueMatch = row.delay.match(/[\d.]+\s*(?:ms|m)/);
          delayValue = valueMatch ? valueMatch[0] : row.delay;
        }
      }

      isInverted = row.polarity && (row.polarity.toLowerCase().includes('invertita') || row.polarity.includes('ELETTRICA -'));
      isFisicamenteInvertito = (typeof row.fisicamente_invertito !== 'undefined')
        ? (String(row.fisicamente_invertito).toLowerCase().startsWith('s'))
        : (row.polarity && (row.polarity.toLowerCase().includes('girato') || row.polarity.includes('FISICAMENTE INVERTITO')));

      const out = {
        sub: subLabel,
        position: row.position,
        delay: delayValue,
        isInverted,
        isFisicamenteInvertito
      };
      if (isLR && lrDisplayMap && lrDisplayMap.has(originalSub)) {
        out.__displayIndex = lrDisplayMap.get(originalSub).idx;
      }
      return out;
    });

    // Per L-R ordina per indice di visualizzazione (profonditÃ )
    rows.sort((a, b) => {
      const ai = a.__displayIndex || Number.MAX_SAFE_INTEGER;
      const bi = b.__displayIndex || Number.MAX_SAFE_INTEGER;
      return ai - bi;
    });
    return rows;
  };

  const tableData = formatDelayTableData();
  
  // Calcola la spaziatura (centro-centro) orizzontale tra i sub (o stack) usando le posizioni
  const computeHorizontalSpacingMeters = () => {
    if (!results || !results.positions) return null;
    try {
      // Estrai lista di X (per stack_cardioid: x degli stack; altrimenti: x dei sub)
      const isStack = config.setup_primario === 'stack_cardioid';
      const xs = (isStack ? results.positions.map(s => s.x) : results.positions.map(p => p.x))
        .filter(x => typeof x === 'number' && !isNaN(x))
        .map(x => +x.toFixed(6));
      const uniqueSorted = Array.from(new Set(xs)).sort((a, b) => a - b);
      if (uniqueSorted.length >= 2) {
        return +(uniqueSorted[1] - uniqueSorted[0]).toFixed(2);
      }
      return null;
    } catch (e) {
      return null;
    }
  };
  const spacingMeters = computeHorizontalSpacingMeters();

  // Calcola distanza tra linee (griglia-griglia) usando le Y medie per ogni L
  const computeLineDistancesMeters = () => {
    if (!results || !results.positions) return [];
    // Per L - R non ha senso mostrare distanze griglia-griglia
    if (config.setup_primario === 'l_r') return [];
    try {
      const lineMap = new Map(); // lineNumber -> array di y
      results.positions.forEach(pos => {
        const lbl = pos.label || '';
        const m = lbl.match(/L(\d+)/);
        if (m) {
          const lnum = parseInt(m[1], 10);
          if (!lineMap.has(lnum)) lineMap.set(lnum, []);
          if (typeof pos.y === 'number') lineMap.get(lnum).push(pos.y);
        }
      });
      const lines = Array.from(lineMap.keys()).sort((a, b) => a - b);
      if (lines.length < 2) return [];
      const avgY = (arr) => (arr.reduce((s, v) => s + v, 0) / (arr.length || 1));
      const distances = [];
      for (let i = 0; i < lines.length - 1; i++) {
        const l1 = lines[i];
        const l2 = lines[i + 1];
        const y1 = avgY(lineMap.get(l1));
        const y2 = avgY(lineMap.get(l2));
        const d = Math.abs(y2 - y1);
        distances.push({ from: l1, to: l2, meters: +d.toFixed(2) });
      }
      return distances;
    } catch (e) {
      return [];
    }
  };
  const lineDistances = computeLineDistancesMeters();

  return (
    <div className={`min-h-screen ${bgMain} p-3 md:p-6`}>
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 md:mb-8">
          <div>
            <h1 className={`text-2xl md:text-4xl font-bold ${textPrimary}`}>Report di Calcolo</h1>
            <p className={`text-sm md:text-base ${textSecondary}`}>Risultati basati sulla configurazione inserita</p>
          </div>
          <Button onClick={() => window.print()} className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-sm">
            <Printer className="w-4 h-4 mr-2" />
            Stampa
          </Button>
        </div>
        
        <div className="space-y-4 md:space-y-6">

          {/* 1) Riepilogo Configurazione (prima sezione) */}
          <Card className={`${bgCard} backdrop-blur-xl ${borderCard}`}>
            <CardHeader className="p-4 md:p-6">
              <CardTitle className={`flex items-center gap-2 ${textPrimary} text-lg md:text-xl`}>
                <Settings className="w-4 h-4 md:w-5 md:h-5 text-slate-400" />
                Riepilogo Configurazione
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-4 md:p-6 text-sm">
              <div className="flex justify-between items-center">
                <span className={textSecondary}>Nome:</span> 
                <span className={`font-semibold ${textPrimary}`}>{config.nome_configurazione || "N/D"}</span>
              </div>
              <Separator className={isDarkTheme ? 'bg-slate-700' : 'bg-gray-300'}/>
              <div className="flex justify-between items-center">
                <span className={textSecondary}>Setup:</span> 
                <Badge className={`${isDarkTheme ? 'bg-slate-700' : 'bg-gray-200 text-slate-900'} text-xs`}>
                  {getSetupLabel(config.setup_primario)}{config.setup_secondario !== 'nessuno' && ` + ${getSetupLabel(config.setup_secondario)}`}
                </Badge>
              </div>
              <Separator className={isDarkTheme ? 'bg-slate-700' : 'bg-gray-300'}/>
              <div className="flex justify-between items-center">
                <span className={textSecondary}>NÂ° Sub / Taglio:</span> 
                <span className={`font-semibold ${textPrimary}`}>{config.numero_subwoofer} x {config.taglio}</span>
              </div>
              <Separator className={isDarkTheme ? 'bg-slate-700' : 'bg-gray-300'}/>
              <div className="flex justify-between items-center">
                <span className={textSecondary}>Crossover:</span> 
                <span className={`font-semibold ${textPrimary}`}>{config.frequenza_crossover} Hz</span>
              </div>
              {typeof config.gradi_pan !== 'undefined' && (
                <>
                  <Separator className={isDarkTheme ? 'bg-slate-700' : 'bg-gray-300'}/>
                  <div className="flex justify-between items-center">
                    <span className={textSecondary}>PAN Fisico:</span> 
                    <span className={`font-semibold ${textPrimary}`}>
                      {`${Number(config.gradi_pan || 0).toFixed(0)}Â° (L=+${Number(config.gradi_pan || 0).toFixed(0)}Â°, R=âˆ’${Number(config.gradi_pan || 0).toFixed(0)}Â°)`}
                    </span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {tableData.length > 0 && (
            <Card className={`${bgCard} backdrop-blur-xl ${borderCard} shadow-xl`}>
              <CardHeader className="p-4 md:p-6">
                <CardTitle className={`flex items-center gap-2 ${textPrimary} text-lg md:text-xl`}>
                  <TableIcon className="w-4 h-4 md:w-5 md:h-5 text-purple-400" />
                  Tabella Ritardi Dettagliata
                </CardTitle>
                <CardDescription className={`text-sm ${textSecondary}`}>
                  Ritardi da applicare a ciascun subwoofer
                </CardDescription>
              </CardHeader>
              <CardContent className="p-2 md:p-3">
                {/* Nascondi completamente la dicitura distanza per L - R */}
                {config.setup_primario !== 'l_r' && (
                  <div className="mb-3">
                    <div className={`uppercase tracking-wide font-semibold text-xs md:text-sm ${textSecondary}`}>
                      {config.setup_primario === 'stack_cardioid' ? 'Distanza tra gli stack (griglia-griglia)' : 'Distanza tra le linee (griglia-griglia)'}
                    </div>
                    <div className={`${textPrimary} mt-1 font-mono text-base md:text-lg font-semibold`}>
                      {lineDistances.length > 0
                        ? lineDistances.map((ld, idx) => (
                            <span key={idx} className="mr-4">L{ld.from}-L{ld.to} {ld.meters.toFixed(2)} m</span>
                          ))
                        : <span className="opacity-70">N/D</span>
                      }
                    </div>
                  </div>
                )}
                <div className="overflow-x-auto -mx-2 md:mx-0">
                  <Table>
                    <TableHeader>
                      <TableRow className={isDarkTheme ? 'border-slate-700' : 'border-gray-300'}>
                        <TableHead className={`${textSecondary} text-xs md:text-sm`}>SUB</TableHead>
                        <TableHead className={`${textSecondary} text-xs md:text-sm`}>SPAZIATURA</TableHead>
                        <TableHead className={`${textSecondary} text-xs md:text-sm`}>DELAY</TableHead>
                        <TableHead className={`${textSecondary} text-xs md:text-sm`}>FASE</TableHead>
                        <TableHead className={`${textSecondary} text-xs md:text-sm`}>NOTE</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tableData.map((row, index) => {
                        // Determina gruppo/linea per alternare sfondo: L1/L2... oppure Stack 1/2...
                        let groupIndex = 1;
                        const lMatch = (row.sub || '').match(/L(\d+)/i);
                        const lrMatch = (row.sub || '').match(/^([lr])\.(\d+)/i);
                        const parenSide = (row.sub || '').match(/\((L|R)\)/i);
                        const sMatch = (row.sub || '').match(/Stack\s+(\d+)/i);
                        if (lrMatch) groupIndex = lrMatch[1].toLowerCase() === 'l' ? 1 : 2;
                        else if (parenSide) groupIndex = parenSide[1].toUpperCase() === 'L' ? 1 : 2;
                        else if (lMatch) groupIndex = parseInt(lMatch[1], 10);
                        else if (sMatch) groupIndex = parseInt(sMatch[1], 10);
                        const odd = groupIndex % 2 === 1;
                        const bgStripe = isDarkTheme
                          ? (odd ? 'bg-slate-900/80' : 'bg-slate-800/40')
                          : (odd ? 'bg-gray-200' : 'bg-white');
                        return (
                          <TableRow key={index} className={`${bgStripe} ${isDarkTheme ? 'border-slate-700' : 'border-gray-300'}`}>
                            <TableCell className={`font-medium ${textPrimary} text-xs md:text-sm`}>{row.sub || 'N/D'}</TableCell>
                            <TableCell className={`${textSecondary} font-mono text-xs`}>{
                              typeof spacingMeters === 'number' ? `${spacingMeters.toFixed(2)} m` : 'N/D'
                            }</TableCell>
                            <TableCell className="text-blue-400 font-mono font-semibold text-xs md:text-sm">{row.delay || 'N/D'}</TableCell>
                            <TableCell className={`text-xs md:text-sm ${row.isInverted ? 'text-red-400 font-bold' : 'text-green-600 font-bold'}`}>
                              {row.isInverted ? 'Invertita' : 'Normale'}
                            </TableCell>
                            <TableCell className="text-xs md:text-sm text-yellow-500 font-semibold">
                              {row.isFisicamenteInvertito ? 'GIRATO' : ''}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 3) Schema Overview (dopo tabella) */}
          <Card className={`${bgCard} backdrop-blur-xl ${borderCard} shadow-xl`}>
            <CardHeader className="p-4 md:p-6">
              <CardTitle className={`flex items-center gap-2 ${textPrimary} text-lg md:text-xl`}>
                <BarChart className="w-4 h-4 md:w-5 md:h-5 text-blue-400" />
                Schema (Overview)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3">
              <div className="max-w-3xl mx-auto" style={{ transform: 'scale(0.85)', transformOrigin: 'top center' }}>
                <EnhancedSetupVisualizer 
                  positions={results.positions} 
                  dimensions={results.dimensions} 
                  config={config}
                  results={results}
                />
              </div>
            </CardContent>
          </Card>

          {/* 4) Note di Implementazione in fondo */}
          <Card className={`${bgCard} backdrop-blur-xl ${borderCard} shadow-xl`}>
            <CardHeader className="p-4 md:p-6">
              <CardTitle className={`flex items-center gap-2 ${textPrimary} text-lg md:text-xl`}>
                <Info className="w-4 h-4 md:w-5 md:h-5 text-yellow-400" />
                Note di Implementazione
              </CardTitle>
            </CardHeader>
            <CardContent className={`space-y-3 text-xs md:text-sm ${textSecondary} p-4 md:p-6`}>
              {results.notes && results.notes.length > 0 ? (
                results.notes.map((note, index) => (
                  <p key={index} className={note.includes('âš ï¸') ? 'text-yellow-400 font-semibold' : ''}>
                    {note}
                  </p>
                ))
              ) : (
                <p className={textSecondary}>Nessuna nota.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
