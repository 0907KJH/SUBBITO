import React, { useRef, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Download, Sparkles } from 'lucide-react';
import html2canvas from 'html2canvas';
import EnhancedSetupVisualizer from '@/components/EnhancedSetupVisualizer';
import { useTheme } from '@/components/ThemeContext';

export default function Overview() {
  const location = useLocation();
  const navigate = useNavigate();
  const visualizationRef = useRef(null);
  
  // Try location.state first, then sessionStorage
  let initialConfig, results;
  if (location.state?.config && location.state?.results) {
    initialConfig = location.state.config;
    results = location.state.results;
  } else {
    const stored = sessionStorage.getItem('subbito_results');
    if (stored) {
      const parsed = JSON.parse(stored);
      initialConfig = parsed.config;
      results = parsed.results;
    }
  }
  
  // State locale per config modificabile
  const [config, setConfig] = useState(initialConfig);
  
  const { isDarkTheme, bgMain, bgCard, borderCard, bgInput, textPrimary, textSecondary } = useTheme();

  useEffect(() => {
    if (!initialConfig || !results) {
      navigate(createPageUrl('Home'), { replace: true });
    }
  }, [initialConfig, results, navigate]);

  // Listen for arc angle updates from Home
  useEffect(() => {
    const handleArcAngleUpdate = (event) => {
      if (event.detail && typeof event.detail.arcAngle === 'number') {
        setConfig(prev => ({ ...prev, gradi_arc: event.detail.arcAngle }));
      }
    };
    
    window.addEventListener('subbito-arc-angle-changed', handleArcAngleUpdate);
    
    return () => {
      window.removeEventListener('subbito-arc-angle-changed', handleArcAngleUpdate);
    };
  }, []);

  if (!config || !results) {
    return null;
  }

  const hasArc = config.setup_primario === 'arc' || config.setup_secondario === 'arc';

  const handleArcAngleChange = (newAngle) => {
    const angle = parseFloat(newAngle);
    setConfig(prev => ({ ...prev, gradi_arc: angle }));
    
    // Aggiorna sessionStorage
    const stored = sessionStorage.getItem('subbito_results');
    if (stored) {
      const data = JSON.parse(stored);
      data.config.gradi_arc = angle;
      sessionStorage.setItem('subbito_results', JSON.stringify(data));
    }
    
    // Notifica Home del cambiamento
    window.dispatchEvent(new CustomEvent('subbito-arc-angle-changed', { 
      detail: { arcAngle: angle } 
    }));
  };

  const handleDownloadImage = async () => {
    if (visualizationRef.current) {
      try {
        const canvas = await html2canvas(visualizationRef.current, {
          backgroundColor: isDarkTheme ? '#0f172a' : '#ffffff',
          scale: 2,
        });
        const link = document.createElement('a');
        link.download = `${config.nome_configurazione || 'setup'}_visualization.png`;
        link.href = canvas.toDataURL();
        link.click();
      } catch (error) {
        console.error('Errore durante la generazione dell\'immagine:', error);
      }
    }
  };

  const handleGoToReport = () => {
    navigate(createPageUrl('Report'), { state: { config, results } });
  };

  const handleOpenPredictionPage = () => {
    navigate(createPageUrl('Prediction'), { state: { config, results } });
  };

  return (
    <div className={`min-h-screen ${bgMain} p-3 md:p-6`}>
      <div className="max-w-7xl mx-auto">
        <div className="mb-4 md:mb-6">
          <h1 className={`text-2xl md:text-4xl font-bold ${textPrimary} mb-2`}>
            Overview: {results.title}
          </h1>
          <p className={`text-sm md:text-base ${textSecondary}`}>
            Vista dall'alto - Stage in alto, Audience in basso
          </p>
        </div>

        <div ref={visualizationRef} className={`${isDarkTheme ? 'bg-slate-900' : 'bg-white'} rounded-xl p-4 md:p-8 mb-6`}>
          <EnhancedSetupVisualizer 
            positions={results.positions} 
            dimensions={results.dimensions}
            config={config}
            results={results}
          />
        </div>

        <div className="flex flex-col md:flex-row gap-3 justify-center">
          <Button
            onClick={handleGoToReport}
            className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 text-base py-6"
          >
            <FileText className="w-5 h-5" />
            Report Completo
          </Button>
          
          <Button
            onClick={handleDownloadImage}
            className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2 text-base py-6"
          >
            <Download className="w-5 h-5" />
            Scarica Immagine
          </Button>
          
          <Button
            onClick={handleOpenPredictionPage}
            className="bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-2 text-base py-6"
          >
            <Sparkles className="w-5 h-5" />
            Predizione Acustica
          </Button>
        </div>
      </div>
    </div>
  );
}
