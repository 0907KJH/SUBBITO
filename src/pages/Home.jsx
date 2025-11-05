import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Radio,
  Settings,
  Maximize2,
  Calculator,
  Save,
  Check,
  Info
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useTheme } from "@/components/ThemeContext";
import SaveConfigModal from "@/components/SaveConfigModal";
import { isFsAccessSupported, saveJsonWithSavePicker } from "@/utils/fsAccess";
import { calculateSubwooferSetup } from "@/utils/acousticCalculations";

export default function Home() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const [showSuccess, setShowSuccess] = useState(false);
    // Dopo il calcolo riuscito, vai automaticamente a Overview
    useEffect(() => {
      if (showSuccess) {
        // Usa il costruttore di URL per rispettare il routing centrale
        navigate(createPageUrl('Overview'));
      }
    }, [showSuccess, navigate]);
  const [errors, setErrors] = useState([]);
  const [showSaveModal, setShowSaveModal] = useState(false);
  // Traccia l'ultimo cambio di campo (per debug/telemetria UI)
  const [lastChange, setLastChange] = useState(null);
  
  const { isDarkTheme, bgMain, bgCard, borderCard, bgInput, textPrimary, textSecondary, bgSection, bgSectionAlt, bgBadge } = useTheme();

  // Stato di configurazione con caricamento da sessionStorage
  const [config, setConfig] = useState(() => {
    // Prova a caricare la configurazione salvata
    const saved = sessionStorage.getItem('subbito_current_config');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // console.log('[Home] Loaded config from sessionStorage:', parsed);
        return parsed;
      } catch (e) {
        console.error('[Home] Error loading saved config:', e);
      }
    }
    // console.log('[Home] Using default config');
    // Configurazione di default
    return {
      numero_subwoofer: "",
      taglio: '18"',
      frequenza_crossover: 80,
      frequenza_target_cancellazione: 80,
      distanza_fisica_gradient: "",
      setup_primario: "",
      setup_secondario: "nessuno",
      numero_linee: 2,
      gradi_arc: 90,
      gradi_pan: 0,
      numero_sub_arc: 4,
      numero_stack_cardioid: 2,
      profondita_sub_cardioid: "",
      larghezza_massima: 15,
      considera_centro_acustico: false,
      offset_centro_acustico: 0,
      unita_ritardo: "ms",
      note: ""
    };
  });

  // Salva la configurazione ogni volta che cambia
  useEffect(() => {
    // console.log('[Home] Saving config to sessionStorage:', config);
    sessionStorage.setItem('subbito_current_config', JSON.stringify(config));
  }, [config]);

  // Log non invasivo dell'ultimo cambio (evita ReferenceError se usato nei callback)
  useEffect(() => {
    if (lastChange) {
      // console.debug('[Home] Last change:', lastChange);
    }
  }, [lastChange]);

  // Listen for events from Layout buttons
  useEffect(() => {
    const handleSave = () => setShowSaveModal(true);
    const handleReset = () => {
      const defaultConfig = {
        numero_subwoofer: "",
        taglio: '18"',
        frequenza_crossover: 80,
        frequenza_target_cancellazione: 80,
        distanza_fisica_gradient: "",
        setup_primario: "",
        setup_secondario: "nessuno",
        numero_linee: 2,
        gradi_arc: 90,
        gradi_pan: 0,
        numero_sub_arc: 4,
        numero_stack_cardioid: 2,
        profondita_sub_cardioid: "",
        larghezza_massima: 15,
        considera_centro_acustico: false,
        offset_centro_acustico: 0,
        unita_ritardo: "ms",
        note: ""
      };
      setConfig(defaultConfig);
      sessionStorage.removeItem('subbito_calculation_done');
      sessionStorage.removeItem('subbito_results');
      sessionStorage.removeItem('subbito_current_config');
      setErrors([]);
      setShowSuccess(false);
    };

    // Listen for arc angle updates from Overview
    const handleArcAngleUpdate = (event) => {
      if (event.detail && typeof event.detail.arcAngle === 'number') {
        setConfig(prev => ({ ...prev, gradi_arc: event.detail.arcAngle }));
        
        // Update sessionStorage to keep consistency
        const stored = sessionStorage.getItem('subbito_results');
        if (stored) {
          const data = JSON.parse(stored);
          data.config.gradi_arc = event.detail.arcAngle;
          sessionStorage.setItem('subbito_results', JSON.stringify(data));
        }
      }
    };
    const handlePanAngleUpdate = (event) => {
      if (event.detail && typeof event.detail.panAngle === 'number') {
        setConfig(prev => ({ ...prev, gradi_pan: event.detail.panAngle }));

        // Update sessionStorage to keep consistency
        const stored = sessionStorage.getItem('subbito_results');
        if (stored) {
          const data = JSON.parse(stored);
          data.config.gradi_pan = event.detail.panAngle;
          sessionStorage.setItem('subbito_results', JSON.stringify(data));
        }
      }
    };
    
    window.addEventListener('subbito-save-config', handleSave);
    window.addEventListener('subbito-reset-config', handleReset);
    window.addEventListener('subbito-arc-angle-changed', handleArcAngleUpdate);
    window.addEventListener('subbito-pan-angle-changed', handlePanAngleUpdate);
    
    return () => {
      window.removeEventListener('subbito-save-config', handleSave);
      window.removeEventListener('subbito-reset-config', handleReset);
      window.removeEventListener('subbito-arc-angle-changed', handleArcAngleUpdate);
      window.removeEventListener('subbito-pan-angle-changed', handlePanAngleUpdate);
    };
  }, []);

  const handleCalculate = () => {
    setErrors([]);
    
    // Validazione base
    if (!config.setup_primario) {
      setErrors(prev => [...prev, "âŒ Seleziona un setup principale prima di calcolare"]);
      return;
    }
    
    const numSubs = parseInt(config.numero_subwoofer);
    if (isNaN(numSubs) || numSubs < 1) {
      setErrors(prev => [...prev, "âŒ Inserisci un numero valido di subwoofer (minimo 1)"]);
      return;
    }

    // Validazione per ENDFIRE
    if (config.setup_primario === 'endfire') {
      const numLinee = parseInt(config.numero_linee);
      
      if (isNaN(numLinee) || numLinee < 2) {
        setErrors(prev => [...prev, "âŒ Endfire: numero di linee deve essere almeno 2"]);
        return;
      }
      
      if (numSubs % numLinee !== 0) {
        const subsPerLine = Math.floor(numSubs / numLinee);
        const validOptions = [];
        for (let lines = 2; lines <= numSubs; lines++) {
          if (numSubs % lines === 0) {
            validOptions.push(`${lines} linee (${numSubs / lines} sub per linea)`);
          }
        }
        setErrors(prev => [...prev, 
          `âŒ Endfire: ${numSubs} subwoofer non sono divisibili per ${numLinee} linee`,
          `ðŸ’¡ Opzioni valide con ${numSubs} sub:`,
          ...validOptions.slice(0, 5) // Mostra max 5 opzioni
        ]);
        return;
      }
    }

    // Validazione per GRADIENT
    if (config.setup_primario === 'gradient') {
      if (numSubs % 2 !== 0) {
        setErrors(prev => [...prev, 
          `âŒ Gradient: richiede un numero PARI di subwoofer`,
          `ðŸ’¡ Hai ${numSubs} sub. Usa ${numSubs - 1} o ${numSubs + 1} sub.`
        ]);
        return;
      }
      
      const distFisica = parseFloat(config.distanza_fisica_gradient);
      if (isNaN(distFisica) || distFisica <= 0 || config.distanza_fisica_gradient === "") {
        setErrors(prev => [...prev, "âŒ Gradient: specifica la distanza fisica Front-Rear in centimetri"]);
        return;
      }
      
      // Verifica che non superi Î»/2
      const wavelength = 343 / (config.frequenza_crossover || 80);
      const maxDistCm = Math.round((wavelength / 2) * 100);
      if (distFisica > maxDistCm) {
        setErrors(prev => [...prev, 
          `âŒ Gradient: distanza fisica troppo grande`,
          `ðŸ’¡ Massimo consentito: ${maxDistCm} cm (Î»/2 @ ${config.frequenza_crossover} Hz)`,
          `ðŸ’¡ Hai inserito: ${distFisica} cm`
        ]);
        return;
      }
    }

    // Validazione per L - R
    if (config.setup_primario === 'l_r') {
      if (numSubs % 2 !== 0) {
        setErrors(prev => [...prev,
          `âŒ L - R: richiede un numero PARI di subwoofer`,
          `ðŸ’¡ Hai ${numSubs} sub. Usa ${numSubs - 1} o ${numSubs + 1} sub.`
        ]);
        return;
      }

      // Validazioni specifiche quando Ã¨ selezionato un setup secondario in L-R
      const sec = config.setup_secondario || 'nessuno';
      // ENDFIRE secondario: almeno 2 per lato (>=4 totali) e freq valida
      if (sec === 'endfire') {
        if (numSubs < 4) {
          setErrors(prev => [...prev,
            `âŒ L - R + Endfire: servono almeno 4 sub totali (min 2 per lato)`,
            `ðŸ’¡ Hai ${numSubs} sub. Aumenta a 4 o piÃ¹.`
          ]);
          return;
        }
        const fTarget = parseFloat(config.frequenza_target_cancellazione);
        if (isNaN(fTarget) || fTarget < 20 || fTarget > 200) {
          setErrors(prev => [...prev,
            `âŒ Endfire secondario: specifica la Frequenza Target tra 20 e 200 Hz`,
            `ðŸ’¡ Valore attuale: ${config.frequenza_target_cancellazione || 'n.d.'}`
          ]);
          return;
        }
      }

      // GRADIENT secondario: LIMITATO a 4 sub totali (1 coppia F/R per lato)
      if (sec === 'gradient') {
        if (numSubs !== 4) {
          setErrors(prev => [...prev,
            `âŒ L - R + Gradient: supportiamo SOLO 4 sub totali (1 coppia per lato)`,
            `ðŸ’¡ Hai ${numSubs} sub. Imposta esattamente 4 sub per usare Gradient come secondario in Lâ€‘R.`
          ]);
          return;
        }
        const distFisica = parseFloat(config.distanza_fisica_gradient);
        if (isNaN(distFisica) || distFisica <= 0 || config.distanza_fisica_gradient === "") {
          setErrors(prev => [...prev, `âŒ Gradient secondario: specifica la distanza fisica F/R in centimetri`]);
          return;
        }
        const wavelength = 343 / (config.frequenza_crossover || 80);
        const maxDistCm = Math.round((wavelength / 2) * 100);
        if (distFisica > maxDistCm) {
          setErrors(prev => [...prev,
            `âŒ Gradient secondario: distanza fisica troppo grande` ,
            `ðŸ’¡ Massimo consentito: ${maxDistCm} cm (Î»/2 @ ${config.frequenza_crossover} Hz)`,
            `ðŸ’¡ Hai inserito: ${distFisica} cm`
          ]);
          return;
        }
      }

      // STACK CARDIOID secondario: N totale pari, 4 â‰¤ N â‰¤ 6, max 3 per lato, profonditÃ  sub richiesta
      if (sec === 'stack_cardioid') {
        if (numSubs < 4) {
          setErrors(prev => [...prev,
            `âŒ L - R + Stack Cardioid: servono almeno 4 sub totali (2 per lato)`,
            `ðŸ’¡ Hai ${numSubs} sub. Aumenta a 4 o piÃ¹.`
          ]);
          return;
        }
        if (numSubs > 6) {
          setErrors(prev => [...prev,
            `âŒ L - R + Stack Cardioid: massimo 6 sub totali (max 3 per lato)`,
            `ðŸ’¡ Hai ${numSubs} sub. Riduci a 6 o meno.`
          ]);
          return;
        }
        const perLato = numSubs / 2;
        if (perLato > 3) {
          setErrors(prev => [...prev,
            `âŒ L - R + Stack Cardioid: massimo 3 sub per lato`,
            `ðŸ’¡ Hai ${perLato} per lato. Riduci il totale a 6 o meno.`
          ]);
          return;
        }
        const profSub = parseFloat(config.profondita_sub_cardioid);
        if (isNaN(profSub) || profSub <= 0 || config.profondita_sub_cardioid === "") {
          setErrors(prev => [...prev,
            `âŒ Stack Cardioid secondario: specifica la profonditÃ  fisica del sub in centimetri`,
            `ðŸ’¡ Esempio: per un sub 18" usa ~60 cm`
          ]);
          return;
        }
      }
    }

    // Validazione per STACK CARDIOID
    if (config.setup_primario === 'stack_cardioid') {
      const numModuli = parseInt(config.numero_stack_cardioid);
      const profSub = parseFloat(config.profondita_sub_cardioid);
      
      if (isNaN(numModuli) || numModuli < 2) {
  setErrors(prev => [...prev, "❌ Stack Cardioid: numero di moduli per stack deve essere almeno 2"]);
        return;
      }
      
      if (isNaN(profSub) || profSub <= 0 || config.profondita_sub_cardioid === "") {
        setErrors(prev => [...prev, 
          "❌ Stack Cardioid: specifica la profondità fisica del sub in centimetri",
          "💡 Esempio: per un sub 18\" usa circa 60 cm"
        ]);
        return;
      }
      
      if (numSubs % numModuli !== 0) {
        const validStacks = [];
        for (let modules = 2; modules <= Math.min(numSubs, 6); modules++) {
          if (numSubs % modules === 0) {
            validStacks.push(`${modules} moduli (${numSubs / modules} stack)`);
          }
        }
        setErrors(prev => [...prev, 
          `❌ Stack Cardioid: ${numSubs} subwoofer non sono divisibili per ${numModuli} moduli`,
          `💡 Opzioni valide con ${numSubs} sub:`,
          ...validStacks
        ]);
        return;
      }
      
      if (numSubs < numModuli) {
        setErrors(prev => [...prev, 
          `❌ Stack Cardioid: servono almeno ${numModuli} sub per fare ${numModuli} moduli per stack`,
          `💡 Hai solo ${numSubs} sub. Riduci il numero di moduli o aggiungi sub.`
        ]);
        return;
      }
    }

    // Validazione per ARC
    if (config.setup_primario === 'arc' || config.setup_secondario === 'arc') {
      const arcAngle = parseFloat(config.gradi_arc);
      if (isNaN(arcAngle) || arcAngle < 0 || arcAngle > 270) {
        setErrors(prev => [...prev, 
          "❌ Arc: angolo deve essere tra 0° e 270°",
          `💡 Hai inserito: ${config.gradi_arc}°`
        ]);
        return;
      }
    }

    // Validazione larghezza massima
    if (parseFloat(config.larghezza_massima) <= 0) {
  setErrors(prev => [...prev, "❌ Larghezza massima deve essere maggiore di 0 metri"]);
      return;
    }

    // Validazione frequenza
    if (parseFloat(config.frequenza_crossover) <= 0) {
  setErrors(prev => [...prev, "❌ Frequenza di crossover deve essere maggiore di 0 Hz"]);
      return;
    }

    // Calcola i risultati usando gli algoritmi acustici
    try {
      const results = calculateSubwooferSetup(config);
      // console.log('[Home] Calculation results:', results);
      
      // Salva in sessionStorage per permettere navigazione
      sessionStorage.setItem('subbito_calculation_done', 'true');
      sessionStorage.setItem('subbito_results', JSON.stringify({ config, results }));
      
      // Trigger storage event per aggiornare il Layout
      window.dispatchEvent(new Event('storage'));
      
      setShowSuccess(true);
      
      // Nascondi messaggio di successo dopo 3 secondi
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error('[Home] Calculation error:', error);
  setErrors(prev => [...prev, `❌ Errore nel calcolo: ${error.message}`]);
    }
  };

  // Helper to handle both native event handlers and direct value callbacks (from Select)
  const setField = (field) => (valOrEvent) => {
    const value = valOrEvent && valOrEvent.target ? valOrEvent.target.value : valOrEvent;
    // console.log('[Home] field change:', field, value);
    setConfig(prev => ({ ...prev, [field]: value }));
    
    // Se Ã¨ gradi_arc, aggiorna anche sessionStorage e notifica Overview
    if (field === 'gradi_arc') {
      const stored = sessionStorage.getItem('subbito_results');
      if (stored) {
        const data = JSON.parse(stored);
        data.config.gradi_arc = parseFloat(value);
        sessionStorage.setItem('subbito_results', JSON.stringify(data));
        
        // Notifica Overview del cambiamento
        window.dispatchEvent(new CustomEvent('subbito-arc-angle-changed', { 
          detail: { arcAngle: parseFloat(value) } 
        }));
      }
    }
    if (field === 'gradi_pan') {
      const stored = sessionStorage.getItem('subbito_results');
      if (stored) {
        const data = JSON.parse(stored);
        data.config.gradi_pan = parseFloat(value);
        sessionStorage.setItem('subbito_results', JSON.stringify(data));

        // Notifica altre pagine del cambiamento
        window.dispatchEvent(new CustomEvent('subbito-pan-angle-changed', {
          detail: { panAngle: parseFloat(value) }
        }));
      }
    }
  };

  const setFieldWithDebug = setField; // Alias for compatibility

  // Imposta il setup primario con reset coerente del secondario
  const setSetupPrimario = (value) => {
    setConfig(prev => {
      let nextSecondario = prev.setup_secondario;
      // Se passo a L-R e il secondario era ARC (non consentito in L-R), resetta
      if (value === 'l_r' && nextSecondario === 'arc') {
        nextSecondario = 'nessuno';
      }
      // Se esco da L-R, i secondari specifici di L-R vanno resettati
      if (value !== 'l_r' && (nextSecondario === 'endfire' || nextSecondario === 'gradient' || nextSecondario === 'stack_cardioid')) {
        nextSecondario = 'nessuno';
      }
      // Se scelgo ARC come primario, nessun secondario
      if (value === 'arc') {
        nextSecondario = 'nessuno';
      }
      return { ...prev, setup_primario: value, setup_secondario: nextSecondario };
    });
    setLastChange({ field: 'setup_primario', value, ts: Date.now() });
  };

  return (
    <div className={`min-h-screen ${bgMain} ${textPrimary}`}>
      <div className="container mx-auto pt-2 pb-6 md:py-6">
        <h1 className="text-3xl font-bold mb-4 text-center md:text-left">CONFIGURAZIONE</h1>
        <Card className={`mb-6 ${bgCard} ${borderCard}`}>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Numero subwoofer e taglio */}
              <div className="space-y-2">
                <Label htmlFor="numero_subwoofer">Numero di Subwoofer</Label>
                <Input
                  id="numero_subwoofer"
                  type="number"
                  value={config.numero_subwoofer}
                  onChange={setFieldWithDebug('numero_subwoofer')}
                  placeholder="Es: 4"
                  className={bgInput}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="taglio">Taglio Subwoofer</Label>
                <Select value={config.taglio} onChange={setFieldWithDebug('taglio')}>
                  <SelectTrigger className={bgInput}>
                    <SelectValue placeholder="Seleziona il taglio" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='12"'>12"</SelectItem>
                    <SelectItem value='15"'>15"</SelectItem>
                    <SelectItem value='18"'>18"</SelectItem>
                    <SelectItem value='21"'>21"</SelectItem>
                    <SelectItem value='24"'>24"</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Frequenze */}
              <div className="space-y-2">
                <Label htmlFor="frequenza_crossover">Frequenza di Crossover (Hz)</Label>
                <Input
                  id="frequenza_crossover"
                  type="number"
                  value={config.frequenza_crossover}
                  onChange={setFieldWithDebug('frequenza_crossover')}
                  placeholder="Es: 80"
                  className={bgInput}
                />
              </div>

              {/* Larghezza Massima subito sotto la frequenza di crossover */}
              <div className="space-y-2">
                <Label htmlFor="larghezza_massima">Larghezza Massima (m)</Label>
                <Input
                  id="larghezza_massima"
                  type="number"
                  value={config.larghezza_massima}
                  onChange={setFieldWithDebug('larghezza_massima')}
                  placeholder="Es: 15"
                  className={bgInput}
                />
              </div>

              {/* Setup primario (solo quando NON è attivo un box dedicato) */}
              {!(config.setup_primario === 'endfire' || config.setup_primario === 'gradient' || config.setup_primario === 'stack_cardioid' || config.setup_primario === 'arc') && (
                <div className="space-y-2">
                  <Label htmlFor="setup_primario">Setup Primario</Label>
                  <Select value={config.setup_primario} onChange={setSetupPrimario}>
                    <SelectTrigger className={bgInput}>
                      <SelectValue placeholder="Seleziona il setup" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="endfire">Endfire</SelectItem>
                      <SelectItem value="gradient">Gradient</SelectItem>
                      <SelectItem value="arc">Arc Array</SelectItem>
                      <SelectItem value="stack_cardioid">Stack Cardioid</SelectItem>
                      <SelectItem value="l_r">L - R</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              {/* Il select del Setup Secondario viene mostrato DOPO il box primario (se non è Arc) */}

                  {/* Parametri Endfire secondario */}
                {config.setup_primario === 'endfire' && (
                <div className="space-y-3 p-4 border border-green-500/30 rounded-lg bg-green-500/5">
                  {/* Setup Primario INSCRITTO nel box quando Endfire è attivo */}
                  <div className="space-y-2">
                    <Label htmlFor="setup_primario" className="text-green-400">Setup Primario</Label>
                    <Select 
                      value={config.setup_primario} 
                      onChange={setSetupPrimario}
                    >
                      <SelectTrigger className={bgInput}>
                        <SelectValue placeholder="Seleziona il setup" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="endfire">Endfire</SelectItem>
                        <SelectItem value="gradient">Gradient</SelectItem>
                        <SelectItem value="arc">Arc Array</SelectItem>
                        <SelectItem value="stack_cardioid">Stack Cardioid</SelectItem>
                        <SelectItem value="l_r">L - R</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Input
                      id="frequenza_target_cancellazione"
                      type="number"
                      value={config.frequenza_target_cancellazione}
                      onChange={setFieldWithDebug('frequenza_target_cancellazione')}
                      placeholder="Es: 80"
                      min="20"
                      max="200"
                      className={bgInput}
                    />
                    <div className="relative pt-2 pb-1">
                      <input
                        type="range"
                        min="20"
                        max="200"
                        value={config.frequenza_target_cancellazione || 80}
                        onChange={(e) => setFieldWithDebug('frequenza_target_cancellazione')(e.target.value)}
                        className="w-full h-2 bg-green-700 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                    <div className="flex justify-between text-xs text-green-400">
                      <span>20 Hz</span>
                      <span className="text-green-400">{config.frequenza_target_cancellazione} Hz</span>
                      <span>200 Hz</span>
                    </div>
                  </div>
                  <p className="text-xs text-green-400">
                    Frequenza ottimale per cancellazione posteriore
                  </p>

                  {/* Numero di linee INSCRITTO nel box Endfire */}
                  <div className="my-2">
                    <Separator className="opacity-30" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="numero_linee" className="text-green-400">Numero di Linee</Label>
                    <Input
                      id="numero_linee"
                      type="number"
                      value={config.numero_linee}
                      onChange={setFieldWithDebug('numero_linee')}
                      min="2"
                      className={bgInput}
                    />
                  </div>
                </div>
                )}

              {/* Controlli specifici per setup */}
              {/* Numero di linee Ã¨ stato spostato all'interno del box Endfire */}

              {config.setup_primario === 'gradient' && (
                <>
                  <div className="space-y-3 p-4 border border-green-500/30 rounded-lg bg-green-500/5">
                    {/* Setup Primario INSCRITTO nel box quando Gradient Ã¨ attivo */}
                    <div className="space-y-2">
                      <Label htmlFor="setup_primario" className="text-green-400">Setup Primario</Label>
                      <Select 
                        value={config.setup_primario} 
                        onChange={setSetupPrimario}
                      >
                        <SelectTrigger className={bgInput}>
                          <SelectValue placeholder="Seleziona il setup" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="endfire">Endfire</SelectItem>
                          <SelectItem value="gradient">Gradient</SelectItem>
                          <SelectItem value="arc">Arc Array</SelectItem>
                          <SelectItem value="stack_cardioid">Stack Cardioid</SelectItem>
                          <SelectItem value="l_r">L - R</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Label htmlFor="distanza_fisica_gradient" className="text-green-400">
                      Distanza Fisica tra Griglie (cm)
                    </Label>
                    <div className="space-y-2">
                      <Input
                        id="distanza_fisica_gradient"
                        type="number"
                        value={config.distanza_fisica_gradient}
                        onChange={setFieldWithDebug('distanza_fisica_gradient')}
                        placeholder="Es: 50"
                        min="0"
                        max={(() => {
                          const wavelength = 343 / (config.frequenza_crossover || 80);
                          return Math.round((wavelength / 2) * 100); // Î»/2 in cm
                        })()}
                        className={bgInput}
                      />
                      <div className="relative pt-2 pb-1">
                        <input
                          type="range"
                          min="0"
                          max={(() => {
                            const wavelength = 343 / (config.frequenza_crossover || 80);
                            return Math.round((wavelength / 2) * 100);
                          })()}
                          value={config.distanza_fisica_gradient || 0}
                          onChange={(e) => setFieldWithDebug('distanza_fisica_gradient')(e.target.value)}
                          className="w-full h-2 bg-green-700 rounded-lg appearance-none cursor-pointer"
                        />
                        {/* Marker Î»/4 */}
                        <div 
                          className="absolute top-0 w-0.5 h-4 bg-red-500"
                          style={{ 
                            left: `${(25 / 50) * 100}%`, // Î»/4 Ã¨ al 50% tra 0 e Î»/2
                            transform: 'translateX(-50%)'
                          }}
                          title="Î»/4 - Ottimale"
                        />
                      </div>
                      <div className="flex justify-between text-xs text-green-400">
                        <span>0 cm</span>
                        <span className="text-green-400">
                          Î»/4 = {Math.round((343 / (config.frequenza_crossover || 80) / 4) * 100)} cm (ottimale)
                        </span>
                        <span>
                          Î»/2 = {Math.round((343 / (config.frequenza_crossover || 80) / 2) * 100)} cm (max)
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-green-400">
                      Distanza desiderata tra il frontale di L1 e L2
                    </p>
                  </div>
                </>
              )}

              {config.setup_primario === 'arc' && (
                <>
                  <div className="space-y-3 p-4 border border-green-500/30 rounded-lg bg-green-500/5">
                    {/* Setup Primario INSCRITTO nel box quando Arc Ã¨ attivo */}
                    <div className="space-y-2">
                      <Label htmlFor="setup_primario" className="text-green-400">Setup Primario</Label>
                      <Select 
                        value={config.setup_primario} 
                        onChange={setSetupPrimario}
                      >
                        <SelectTrigger className={bgInput}>
                          <SelectValue placeholder="Seleziona il setup" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="endfire">Endfire</SelectItem>
                          <SelectItem value="gradient">Gradient</SelectItem>
                          <SelectItem value="arc">Arc Array</SelectItem>
                          <SelectItem value="stack_cardioid">Stack Cardioid</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Label htmlFor="gradi_arc" className="text-green-400">Angolo Arc Array: {config.gradi_arc}°</Label>
                    <div className="space-y-2">
                      <Input
                        id="gradi_arc"
                        type="number"
                        value={config.gradi_arc}
                        onChange={setFieldWithDebug('gradi_arc')}
                        min="0"
                        max="270"
                        className={bgInput}
                      />
                      <div className="relative pt-2 pb-1">
                        <input
                          type="range"
                          min="0"
                          max="270"
                          value={config.gradi_arc || 90}
                          onChange={(e) => setFieldWithDebug('gradi_arc')(e.target.value)}
                          className="w-full h-2 bg-green-700 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                      <div className="flex justify-between text-xs text-green-400">
                        <span>0°</span>
                        <span className="text-green-400">90° (raccomandato)</span>
                        <span>270° (max)</span>
                      </div>
                    </div>
                    <p className="text-xs text-green-400">
                      Angolo di apertura dell'arco - modificabile anche da Overview. L'Arc usa automaticamente tutti i sub disponibili rispettando Î»/4 max e la larghezza disponibile.
                    </p>
                  </div>
                </>
              )}

              {config.setup_primario === 'stack_cardioid' && (
                <div className="space-y-3 p-4 border border-green-500/30 rounded-lg bg-green-500/5">
                  {/* Setup Primario INSCRITTO nel box quando Stack Cardioid Ã¨ attivo */}
                  <div className="space-y-2">
                    <Label htmlFor="setup_primario" className="text-green-400">Setup Primario</Label>
                    <Select 
                      value={config.setup_primario} 
                      onChange={(value) => {
                        setConfig(prev => ({ 
                          ...prev, 
                          setup_primario: value,
                          setup_secondario: value === 'arc' ? 'nessuno' : prev.setup_secondario
                        }));
                        setLastChange({ field: 'setup_primario', value, ts: Date.now() });
                      }}
                    >
                      <SelectTrigger className={bgInput}>
                        <SelectValue placeholder="Seleziona il setup" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="endfire">Endfire</SelectItem>
                        <SelectItem value="gradient">Gradient</SelectItem>
                        <SelectItem value="arc">Arc Array</SelectItem>
                        <SelectItem value="stack_cardioid">Stack Cardioid</SelectItem>
                        <SelectItem value="l_r">L - R</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="numero_stack" className="text-green-400">Sub per Stack</Label>
                    <Input
                      id="numero_stack"
                      type="number"
                      value={config.numero_stack_cardioid}
                      onChange={setFieldWithDebug('numero_stack_cardioid')}
                      min="2"
                      className={bgInput}
                    />
                  </div>
                  <div className="my-2">
                    <Separator className="opacity-30" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="profondita_sub" className="text-green-400">Profondità Sub (cm)</Label>
                    <Input
                      id="profondita_sub"
                      type="number"
                      value={config.profondita_sub_cardioid}
                      onChange={setFieldWithDebug('profondita_sub_cardioid')}
                      placeholder="Profondità fisica del sub"
                      className={bgInput}
                    />
                    <p className="text-xs text-green-400">Valore fisico (cabinet) usato per la disposizione dei moduli.</p>
                  </div>
                </div>
              )}

              {/* Select Setup Secondario posizionato dopo il box primario quando NON Ã¨ Arc */}
              {/* Select Setup Secondario (generico) - NON mostrare quando Primario Ã¨ L-R */}
              {config.setup_primario !== 'l_r' && config.setup_secondario !== 'arc' && (
                <div className="space-y-2 mt-2">
                  <Label htmlFor="setup_secondario">Setup Secondario</Label>
                  <Select 
                    value={config.setup_secondario} 
                    onChange={setFieldWithDebug('setup_secondario')}
                    disabled={config.setup_primario === 'arc' || !config.setup_primario}
                  >
                    <SelectTrigger className={`${bgInput} disabled:opacity-50`}>
                      <SelectValue placeholder="Setup aggiuntivo (opzionale)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nessuno">Nessuno</SelectItem>
                      <SelectItem value="arc">+ Arc Elettronico</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Controlli per Arc Secondario */}
              {config.setup_secondario === 'arc' && (
                <div className="space-y-3 p-4 border border-green-500/30 rounded-lg bg-green-500/5">
                  {/* Il menu a tendina viene INSCRITTO nel box verde quando attivo */}
                  <div className="space-y-2">
                    <Label htmlFor="setup_secondario" className="text-green-400">Setup Secondario</Label>
                    <Select 
                      value={config.setup_secondario} 
                      onChange={setFieldWithDebug('setup_secondario')}
                    >
                      <SelectTrigger className={bgInput}>
                        <SelectValue placeholder="Setup aggiuntivo (opzionale)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="nessuno">Nessuno</SelectItem>
                        <SelectItem value="arc">+ Arc Elettronico</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Label htmlFor="gradi_arc_sec" className="text-green-400">Angolo Arc Secondario: {config.gradi_arc}°</Label>
                  <div className="space-y-2">
                    <Input
                      id="gradi_arc_sec"
                      type="number"
                      value={config.gradi_arc}
                      onChange={setFieldWithDebug('gradi_arc')}
                      min="0"
                      max="270"
                      className={bgInput}
                    />
                    <div className="relative pt-2 pb-1">
                      <input
                        type="range"
                        min="0"
                        max="270"
                        value={config.gradi_arc || 90}
                        onChange={(e) => setFieldWithDebug('gradi_arc')(e.target.value)}
                        className="w-full h-2 bg-green-700 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                    <div className="flex justify-between text-xs text-green-400">
                      <span>0°</span>
                      <span className="text-green-400">90° (raccomandato)</span>
                      <span>270° (max)</span>
                    </div>
                  </div>
                  <p className="text-xs text-green-400">
                    Arc elettronico - modificabile anche da Overview
                  </p>
                </div>
              )}

              {/* --- ModalitÃ  L-R: Secondario personalizzato (nessuno | endfire | gradient | stack_cardioid) --- */}
              {config.setup_primario === 'l_r' && (
                <>
                  {/* Se nessuno Ã¨ selezionato, mostra solo il select (fuori dal box) */}
                  {config.setup_secondario === 'nessuno' && (
                    <div className="space-y-2 mt-2">
                      <Label htmlFor="setup_secondario_lr">Setup Secondario</Label>
                      <Select 
                        value={config.setup_secondario}
                        onChange={(value) => setConfig(prev => ({ ...prev, setup_secondario: value }))}
                      >
                        <SelectTrigger className={bgInput}>
                          <SelectValue placeholder="Seleziona il setup secondario" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="nessuno">Nessuno</SelectItem>
                          <SelectItem value="endfire">Endfire</SelectItem>
                          <SelectItem value="gradient">Gradient</SelectItem>
                          <SelectItem value="stack_cardioid">Stack Cardioid</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Box verde per ENDIFRE secondario */}
                  {config.setup_secondario === 'endfire' && (
                    <div className="space-y-3 p-4 border border-green-500/30 rounded-lg bg-green-500/5 mt-2">
                      {/* Select INSCRITTO nel box quando attivo */}
                      <div className="space-y-2">
                        <Label htmlFor="setup_secondario_lr" className="text-green-400">Setup Secondario</Label>
                        <Select 
                          value={config.setup_secondario}
                          onChange={(value) => setConfig(prev => ({ ...prev, setup_secondario: value }))}
                        >
                          <SelectTrigger className={bgInput}>
                            <SelectValue placeholder="Seleziona il setup secondario" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="nessuno">Nessuno</SelectItem>
                            <SelectItem value="endfire">Endfire</SelectItem>
                            <SelectItem value="gradient">Gradient</SelectItem>
                            <SelectItem value="stack_cardioid">Stack Cardioid</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Label htmlFor="frequenza_target_cancellazione_lr" className="text-green-400">
                        Frequenza Target Cancellazione (Hz)
                      </Label>
                      <div className="space-y-2">
                        <Input
                          id="frequenza_target_cancellazione_lr"
                          type="number"
                          value={config.frequenza_target_cancellazione}
                          onChange={setFieldWithDebug('frequenza_target_cancellazione')}
                          min="20"
                          max="200"
                          className={bgInput}
                        />
                        <div className="relative pt-2 pb-1">
                          <input
                            type="range"
                            min="20"
                            max="200"
                            value={config.frequenza_target_cancellazione || 80}
                            onChange={(e) => setFieldWithDebug('frequenza_target_cancellazione')(e.target.value)}
                            className="w-full h-2 bg-green-700 rounded-lg appearance-none cursor-pointer"
                          />
                        </div>
                        <div className="flex justify-between text-xs text-green-400">
                          <span>20 Hz</span>
                          <span className="text-green-400">{config.frequenza_target_cancellazione} Hz</span>
                          <span>200 Hz</span>
                        </div>
                      </div>

                      {/* PAN per secondario */}
                      <div className="mt-3 space-y-2">
                        <Label htmlFor="gradi_pan_endfire" className="text-green-400">PAN (°)</Label>
                        <Input
                          id="gradi_pan_endfire"
                          type="number"
                          value={config.gradi_pan ?? 0}
                          onChange={setFieldWithDebug('gradi_pan')}
                          min="-90"
                          max="90"
                          className={bgInput}
                        />
                        <div className="relative pt-2 pb-1">
                          <input
                            type="range"
                            min="-90"
                            max="90"
                            value={Number.isFinite(config.gradi_pan) ? config.gradi_pan : 0}
                            onChange={(e) => setFieldWithDebug('gradi_pan')(e.target.value)}
                            className="w-full h-2 bg-green-700 rounded-lg appearance-none cursor-pointer"
                          />
                        </div>
                        <div className="flex justify-between text-xs text-green-400">
                          <span>-90°</span>
                          <span>0°</span>
                          <span>+90°</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Box verde per GRADIENT secondario */}
                  {config.setup_secondario === 'gradient' && (
                    <div className="space-y-3 p-4 border border-green-500/30 rounded-lg bg-green-500/5 mt-2">
                      {/* Select INSCRITTO nel box quando attivo */}
                      <div className="space-y-2">
                        <Label htmlFor="setup_secondario_lr" className="text-green-400">Setup Secondario</Label>
                        <Select 
                          value={config.setup_secondario}
                          onChange={(value) => setConfig(prev => ({ ...prev, setup_secondario: value }))}
                        >
                          <SelectTrigger className={bgInput}>
                            <SelectValue placeholder="Seleziona il setup secondario" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="nessuno">Nessuno</SelectItem>
                            <SelectItem value="endfire">Endfire</SelectItem>
                            <SelectItem value="gradient">Gradient</SelectItem>
                            <SelectItem value="stack_cardioid">Stack Cardioid</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Label htmlFor="distanza_fisica_gradient_lr" className="text-green-400">
                        Distanza Fisica tra Griglie (cm)
                      </Label>
                      <div className="space-y-2">
                        <Input
                          id="distanza_fisica_gradient_lr"
                          type="number"
                          value={config.distanza_fisica_gradient}
                          onChange={setFieldWithDebug('distanza_fisica_gradient')}
                          min="0"
                          max={(() => {
                            const wavelength = 343 / (config.frequenza_crossover || 80);
                            return Math.round((wavelength / 2) * 100);
                          })()}
                          className={bgInput}
                        />
                        <div className="relative pt-2 pb-1">
                          <input
                            type="range"
                            min="0"
                            max={(() => {
                              const wavelength = 343 / (config.frequenza_crossover || 80);
                              return Math.round((wavelength / 2) * 100);
                            })()}
                            value={config.distanza_fisica_gradient || 0}
                            onChange={(e) => setFieldWithDebug('distanza_fisica_gradient')(e.target.value)}
                            className="w-full h-2 bg-green-700 rounded-lg appearance-none cursor-pointer"
                          />
                        </div>
                        <div className="flex justify-between text-xs text-green-400">
                          <span>0 cm</span>
                          <span>Î»/4 = {Math.round((343 / (config.frequenza_crossover || 80) / 4) * 100)} cm</span>
                          <span>Î»/2 = {Math.round((343 / (config.frequenza_crossover || 80) / 2) * 100)} cm</span>
                        </div>
                      </div>

                      {/* PAN per secondario */}
                      <div className="mt-3 space-y-2">
                        <Label htmlFor="gradi_pan_gradient" className="text-green-400">PAN (°)</Label>
                        <Input
                          id="gradi_pan_gradient"
                          type="number"
                          value={config.gradi_pan ?? 0}
                          onChange={setFieldWithDebug('gradi_pan')}
                          min="-90"
                          max="90"
                          className={bgInput}
                        />
                        <div className="relative pt-2 pb-1">
                          <input
                            type="range"
                            min="-90"
                            max="90"
                            value={Number.isFinite(config.gradi_pan) ? config.gradi_pan : 0}
                            onChange={(e) => setFieldWithDebug('gradi_pan')(e.target.value)}
                            className="w-full h-2 bg-green-700 rounded-lg appearance-none cursor-pointer"
                          />
                        </div>
                        <div className="flex justify-between text-xs text-green-400">
                          <span>-90°</span>
                          <span>0°</span>
                          <span>+90°</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Box verde per STACK CARDIOID secondario */}
                  {config.setup_secondario === 'stack_cardioid' && (
                    <div className="space-y-3 p-4 border border-green-500/30 rounded-lg bg-green-500/5 mt-2">
                      {/* Select INSCRITTO nel box quando attivo */}
                      <div className="space-y-2">
                        <Label htmlFor="setup_secondario_lr" className="text-green-400">Setup Secondario</Label>
                        <Select 
                          value={config.setup_secondario}
                          onChange={(value) => setConfig(prev => ({ ...prev, setup_secondario: value }))}
                        >
                          <SelectTrigger className={bgInput}>
                            <SelectValue placeholder="Seleziona il setup secondario" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="nessuno">Nessuno</SelectItem>
                            <SelectItem value="endfire">Endfire</SelectItem>
                            <SelectItem value="gradient">Gradient</SelectItem>
                            <SelectItem value="stack_cardioid">Stack Cardioid</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Label htmlFor="profondita_sub_lr" className="text-green-400">Profondità Sub (cm)</Label>
                      <div className="space-y-2">
                        <Input
                          id="profondita_sub_lr"
                          type="number"
                          value={config.profondita_sub_cardioid}
                          onChange={setFieldWithDebug('profondita_sub_cardioid')}
                          placeholder="Profondità fisica del sub"
                          className={bgInput}
                        />
                        <p className="text-xs text-green-400">Usato per calcolare il delay cardioide DV/c del modulo girato.</p>
                      </div>

                      {/* PAN per secondario */}
                      <div className="mt-3 space-y-2">
                        <Label htmlFor="gradi_pan_stack" className="text-green-400">PAN (°)</Label>
                        <Input
                          id="gradi_pan_stack"
                          type="number"
                          value={config.gradi_pan ?? 0}
                          onChange={setFieldWithDebug('gradi_pan')}
                          min="-90"
                          max="90"
                          className={bgInput}
                        />
                        <div className="relative pt-2 pb-1">
                          <input
                            type="range"
                            min="-90"
                            max="90"
                            value={Number.isFinite(config.gradi_pan) ? config.gradi_pan : 0}
                            onChange={(e) => setFieldWithDebug('gradi_pan')(e.target.value)}
                            className="w-full h-2 bg-green-700 rounded-lg appearance-none cursor-pointer"
                          />
                        </div>
                        <div className="flex justify-between text-xs text-green-400">
                          <span>-90°</span>
                          <span>0°</span>
                          <span>+90°</span>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Controlli sempre visibili */}

              <div className="space-y-2">
                <Label htmlFor="unita_ritardo">Unità di Misura Ritardo</Label>
                <Select value={config.unita_ritardo} onChange={setFieldWithDebug('unita_ritardo')}>
                  <SelectTrigger className={bgInput}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ms">Millisecondi (ms)</SelectItem>
                    <SelectItem value="m">Metri (m)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Centro Acustico */}
              {config.considera_centro_acustico && (
                <div className="space-y-2 p-4 border border-green-500/30 rounded-lg bg-green-500/5">
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      id="centro_acustico"
                      type="checkbox"
                      checked={config.considera_centro_acustico}
                      onChange={(e) => setConfig({...config, considera_centro_acustico: e.target.checked})}
                      className="w-4 h-4 rounded text-green-600 focus:ring-green-500"
                    />
                    <Label htmlFor="centro_acustico" className="cursor-pointer">
                      Considera Centro Acustico
                    </Label>
                  </div>
                  <Label htmlFor="offset">Offset Centro Acustico (cm)</Label>
                  <div className="space-y-2">
                    <Input
                      id="offset"
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      value={config.offset_centro_acustico || ""}
                      onChange={(e) => setConfig({...config, offset_centro_acustico: parseFloat(e.target.value) || 0})}
                      className={bgInput}
                      placeholder="Es: 20"
                    />
                    <div className="relative pt-2 pb-1">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={config.offset_centro_acustico || 0}
                        onChange={(e) => setConfig({...config, offset_centro_acustico: parseFloat(e.target.value)})}
                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>0 cm</span>
                      <span className="text-green-400">
                        {config.offset_centro_acustico || 0} cm
                      </span>
                      <span>100 cm</span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400">
                    Distanza del centro acustico dal frontale
                  </p>
                </div>
              )}

              {/* Checkbox Centro Acustico - Visibile solo se NON attivo */}
              {!config.considera_centro_acustico && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      id="centro_acustico_off"
                      type="checkbox"
                      checked={config.considera_centro_acustico}
                      onChange={(e) => setConfig({...config, considera_centro_acustico: e.target.checked})}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <Label htmlFor="centro_acustico_off" className="cursor-pointer">
                      Considera Centro Acustico
                    </Label>
                  </div>
                </div>
              )}

              {/* Note */}
              <div className="col-span-full space-y-2">
                <Label htmlFor="note">Note</Label>
                <Textarea
                  id="note"
                  value={config.note}
                  onChange={setFieldWithDebug('note')}
                  placeholder="Note aggiuntive sulla configurazione..."
                  className={bgInput}
                />
              </div>
            </div>

            {/* Actions - Solo CALCOLA */}
            <div className="flex justify-center mt-6">
              <button
                onClick={handleCalculate}
                className="w-full max-w-xs py-4 px-6 rounded-lg flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 text-white transition-all font-semibold text-sm uppercase"
              >
                <Calculator className="w-5 h-5" />
                CALCOLA
              </button>
            </div>
            
            {/* Error messages */}
            {errors.length > 0 && (
              <div className="mt-4">
                {errors.map((error, idx) => (
                  <Alert key={idx} className="mb-2 border-red-500 bg-red-50 dark:bg-red-900/20">
                    <AlertDescription className="text-red-700 dark:text-red-300">{error}</AlertDescription>
                  </Alert>
                ))}
              </div>
            )}
            
            {/* Success message */}
            {showSuccess && (
              <Alert className="mt-4 border-green-500 bg-green-50 dark:bg-green-900/20">
                <Check className="h-4 w-4 text-green-700 dark:text-green-300" />
                <AlertDescription className="text-green-700 dark:text-green-300">
                  âœ… Calcolo completato! Ora puoi navigare a Overview, Predizione o Report.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
        
        {/* Save Config Modal */}
        <SaveConfigModal
          isOpen={showSaveModal}
          onClose={() => setShowSaveModal(false)}
          onSave={async (configName) => {
            try {
              const configToSave = {
                ...config,
                nome_configurazione: configName
              };
              const res = await saveJsonWithSavePicker(configName, configToSave);
              if (res.success) {
                alert(`âœ… Salvataggio completato`);
                setShowSaveModal(false);
              } else {
                if (!res.canceled) alert(`âŒ Errore: ${res.error || 'Operazione annullata'}`);
              }
            } catch (e) {
              alert(`âŒ Errore inatteso: ${e?.message || e}`);
            }
          }}
        />
      </div>
    </div>
  );
}
