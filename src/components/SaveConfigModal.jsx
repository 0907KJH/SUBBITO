import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X } from 'lucide-react';

// Simplified modal: only name input. Saving logic (directory pick + write) lives in onSave(name)
export default function SaveConfigModal({ isOpen, onClose, onSave }) {
  const [configName, setConfigName] = useState('');

  const handleSaveClick = () => {
    if (configName.trim() === '') {
      alert('Il nome della configurazione non puÃ² essere vuoto.');
      return;
    }
    onSave(configName);
    setConfigName('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 text-white border border-slate-700 rounded-lg max-w-md w-full shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div>
            <h2 className="text-xl font-bold text-white">Salva Configurazione</h2>
            <p className="text-sm text-slate-400 mt-1">
              Inserisci il nome del file. Ti verrÃ  chiesto dove salvare la prima volta e la cartella verrÃ  ricordata.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="configName" className="text-slate-300">
              Nome Configurazione
            </Label>
            <Input
              id="configName"
              value={configName}
              onChange={(e) => setConfigName(e.target.value)}
              placeholder="Es: Setup Arena 2024"
              className="bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500"
              autoFocus
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-slate-700">
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1 bg-slate-700 hover:bg-slate-600 text-white border-slate-600"
          >
            Annulla
          </Button>
          <Button
            onClick={handleSaveClick}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
          >
            Salva
          </Button>
        </div>
      </div>
    </div>
  );
}


