import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import AcousticHeatmap from '../components/AcousticHeatmap';
import { useTheme } from '@/components/ThemeContext';

export default function Prediction() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isDarkTheme, bgMain, bgCard, borderCard, textPrimary, textSecondary } = useTheme();
  
  // Try location.state first, then sessionStorage
  let config, results;
  if (location.state?.config && location.state?.results) {
    config = location.state.config;
    results = location.state.results;
  } else {
    const stored = sessionStorage.getItem('subbito_results');
    if (stored) {
      const parsed = JSON.parse(stored);
      config = parsed.config;
      results = parsed.results;
    }
  }
  
  const [frequency, setFrequency] = useState(config?.frequenza_crossover || 80);
  const [arcAngle, setArcAngle] = useState(config?.gradi_arc || 0);
  const [panAngle, setPanAngle] = useState(config?.gradi_pan || 0);

  // Sincronizza arcAngle con sessionStorage e Home
  useEffect(() => {
    const handleArcAngleUpdate = (event) => {
      if (event.detail && typeof event.detail.arcAngle === 'number') {
        setArcAngle(event.detail.arcAngle);
      }
    };
    const handlePanAngleUpdate = (event) => {
      if (event.detail && typeof event.detail.panAngle === 'number') {
        setPanAngle(event.detail.panAngle);
      }
    };
    
    window.addEventListener('subbito-arc-angle-changed', handleArcAngleUpdate);
    window.addEventListener('subbito-pan-angle-changed', handlePanAngleUpdate);
    
    return () => {
      window.removeEventListener('subbito-arc-angle-changed', handleArcAngleUpdate);
      window.removeEventListener('subbito-pan-angle-changed', handlePanAngleUpdate);
    };
  }, []);

  const handleArcAngleChange = (newAngle) => {
    setArcAngle(newAngle);
    
    // Aggiorna sessionStorage
    const stored = sessionStorage.getItem('subbito_results');
    if (stored) {
      const data = JSON.parse(stored);
      data.config.gradi_arc = newAngle;
      sessionStorage.setItem('subbito_results', JSON.stringify(data));
    }
    
    // Aggiorna anche la configurazione corrente nella Home
    const currentConfig = sessionStorage.getItem('subbito_current_config');
    if (currentConfig) {
      const configData = JSON.parse(currentConfig);
      configData.gradi_arc = newAngle;
      sessionStorage.setItem('subbito_current_config', JSON.stringify(configData));
    }
    
    // Notifica Home del cambiamento
    window.dispatchEvent(new CustomEvent('subbito-arc-angle-changed', { 
      detail: { arcAngle: newAngle } 
    }));
  };

  const handlePanAngleChange = (newAngle) => {
    setPanAngle(newAngle);

    // Aggiorna sessionStorage
    const stored = sessionStorage.getItem('subbito_results');
    if (stored) {
      const data = JSON.parse(stored);
      data.config.gradi_pan = newAngle;
      sessionStorage.setItem('subbito_results', JSON.stringify(data));
    }

    // Aggiorna anche la configurazione corrente nella Home
    const currentConfig = sessionStorage.getItem('subbito_current_config');
    if (currentConfig) {
      const configData = JSON.parse(currentConfig);
      configData.gradi_pan = newAngle;
      sessionStorage.setItem('subbito_current_config', JSON.stringify(configData));
    }

    // Notifica Home del cambiamento
    window.dispatchEvent(new CustomEvent('subbito-pan-angle-changed', { 
      detail: { panAngle: newAngle } 
    }));
  };

  useEffect(() => {
    if (!config || !results) {
      navigate(createPageUrl('Home'), { replace: true });
    }
  }, [config, results, navigate]);

  if (!config || !results) {
    return (
      <div className={`min-h-screen ${bgMain} flex items-center justify-center p-4 text-center`}>
        <div>
          <h1 className={`text-2xl md:text-3xl font-bold mb-2 ${textPrimary}`}>Dati Non Trovati</h1>
          <p className={`text-sm md:text-base ${textSecondary}`}>
            Torna alla pagina di configurazione.
          </p>
        </div>
      </div>
    );
  }

  const hasArc = config.setup_primario === 'arc' || config.setup_secondario === 'arc';
  const hasPan = config.setup_primario === 'l_r';

  return (
    <div className={`min-h-screen ${bgMain} p-3 md:p-6`}>
      <div className="max-w-full mx-auto">
        <div className="mb-4 md:mb-6">
          <h1 className={`text-xl md:text-3xl font-bold ${textPrimary}`}>Predizione Acustica</h1>
        </div>

        <div className="space-y-3 md:space-y-4">
          <Card className={`${bgCard} backdrop-blur-xl ${borderCard} shadow-xl`}>
            <CardContent className="p-3 md:p-4">
              <Label className={`${textSecondary} text-sm mb-2 block`}>
                Frequenza Analisi: {frequency} Hz
              </Label>
              <Slider
                value={frequency}
                onChange={(e) => setFrequency(Number(e.target.value))}
                min={20}
                max={200}
                step={5}
                className="w-full"
              />
              <div className={`flex justify-between text-xs ${textSecondary} mt-2`}>
                <span>20 Hz</span>
                <span>200 Hz</span>
              </div>
            </CardContent>
          </Card>

          {hasArc && (
            <Card className={`${bgCard} backdrop-blur-xl ${borderCard} shadow-xl`}>
              <CardContent className="p-3 md:p-4">
                <Label className={`${textSecondary} text-sm mb-2 block`}>
                  Angolo Arc: {arcAngle}°
                </Label>
                <Slider
                  value={arcAngle}
                  onChange={(e) => handleArcAngleChange(Number(e.target.value))}
                  min={0}
                  max={270}
                  step={5}
                  className="w-full"
                />
                <div className={`flex justify-between text-xs ${textSecondary} mt-2`}>
                  <span>0°</span>
                  <span>270°</span>
                </div>
              </CardContent>
            </Card>
          )}

          {hasPan && (
            <Card className={`${bgCard} backdrop-blur-xl ${borderCard} shadow-xl`}>
              <CardContent className="p-3 md:p-4">
                <Label className={`${textSecondary} text-sm mb-2 block`}>
                  PAN Fisico: {panAngle}° (L=+{panAngle}°, R=−{panAngle}°)
                </Label>
                <Slider
                  value={panAngle}
                  onChange={(e) => handlePanAngleChange(Number(e.target.value))}
                  min={-90}
                  max={90}
                  step={1}
                  className="w-full"
                />
                <div className={`flex justify-between text-xs ${textSecondary} mt-2`}>
                  <span>−90°</span>
                  <span>+90°</span>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className={`${bgCard} backdrop-blur-xl ${borderCard} shadow-xl`}>
            <CardHeader className="p-3 md:p-4 pb-2">
              <CardTitle className={`${textPrimary} text-base md:text-lg`}>Mappa SPL</CardTitle>
              <p className={`text-xs ${textSecondary}`}>Stage in alto, Audience in basso</p>
            </CardHeader>
            <CardContent className="p-2 md:p-3">
              <div className="w-full" style={{ height: '60vh', minHeight: '400px' }}>
                <AcousticHeatmap 
                  positions={results.positions}
                  config={config}
                  frequency={frequency}
                  arcAngle={hasArc ? arcAngle : undefined}
                  panAngle={hasPan ? panAngle : undefined}
                />
              </div>
            </CardContent>
          </Card>

          {/* Legenda colori rimossa su richiesta */}
        </div>
      </div>
    </div>
  );
}
