import React, { useEffect, useMemo, useState } from 'react';
import { isFsAccessSupported, chooseConfigDirectory, getOrRestoreLastDirectory, listJsonFiles, readJsonFromFileHandle, openJsonWithPicker } from '@/utils/fsAccess';
import { useNavigate } from 'react-router-dom';

export default function SavedConfigs() {
  const navigate = useNavigate();
  const [supported, setSupported] = useState(false);
  const [dirHandle, setDirHandle] = useState(null);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setSupported(isFsAccessSupported());
    // Try restore last directory automatically
    (async () => {
      const last = await getOrRestoreLastDirectory();
      if (last) {
        setDirHandle(last);
        setLoading(true);
        const jsons = await listJsonFiles(last);
        setFiles(jsons);
        setLoading(false);
      }
    })();
  }, []);

  const handleChooseFolder = async () => {
    setError('');
    setLoading(true);
    const handle = await chooseConfigDirectory();
    if (!handle) {
      setLoading(false);
      return; // user canceled
    }
    setDirHandle(handle);
    const jsons = await listJsonFiles(handle);
    setFiles(jsons);
    setLoading(false);
  };

  const handleLoadFile = async (fileHandle) => {
    const res = await readJsonFromFileHandle(fileHandle);
    if (res?.error) {
      setError(res.error);
      return;
    }
    try {
      // Store as current config and navigate to Home
      sessionStorage.setItem('subbito_current_config', JSON.stringify(res.data));
      sessionStorage.removeItem('subbito_results');
      sessionStorage.setItem('subbito_calculation_done', 'false');
      // Notify listeners (e.g., Layout)
      window.dispatchEvent(new Event('storage'));
      navigate('/');
    } catch (e) {
      setError(e?.message || 'Errore nel caricamento della configurazione');
    }
  };

  const headerNote = useMemo(() => {
    if (!supported) return 'Il tuo browser non supporta la scelta della cartella (File System Access API). Usa un browser Chromium (Chrome/Edge).';
    if (!dirHandle) return 'Scegli una cartella con i file .json di configurazione. La scelta verrÃ  ricordata.';
    return 'Cartella configurazioni pronta. Seleziona un file per caricarlo.';
  }, [supported, dirHandle]);

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl md:text-3xl font-bold mb-2">Apri Configurazioni</h1>
      <p className="text-sm text-gray-400 mb-6">{headerNote}</p>

      {supported && (
        <div className="flex gap-3 mb-6">
          <button
            onClick={handleChooseFolder}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold"
          >
            {dirHandle ? 'Cambia cartella' : 'Scegli cartella'}
          </button>
          <button
            onClick={async () => {
              const res = await openJsonWithPicker();
              if (res?.canceled) return;
              if (res?.error) { setError(res.error); return; }
              try {
                sessionStorage.setItem('subbito_current_config', JSON.stringify(res.data));
                sessionStorage.removeItem('subbito_results');
                sessionStorage.setItem('subbito_calculation_done', 'false');
                window.dispatchEvent(new Event('storage'));
                navigate('/');
              } catch (e) {
                setError(e?.message || 'Errore nel caricamento della configurazione');
              }
            }}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
          >
            Apri file...
          </button>
        </div>
      )}

      {loading && <p className="text-gray-300">Caricamentoâ€¦</p>}
      {error && <p className="text-red-400 font-semibold mb-4">{error}</p>}

      {files.length > 0 ? (
        <div className="rounded-lg border border-slate-700 overflow-hidden">
          <div className="grid grid-cols-12 bg-slate-800 text-gray-300 text-xs font-semibold px-3 py-2">
            <div className="col-span-8">File</div>
            <div className="col-span-4 text-right">Azione</div>
          </div>
          {files.map((fh, idx) => (
            <div key={idx} className={`grid grid-cols-12 items-center px-3 py-2 ${idx % 2 ? 'bg-slate-900/60' : 'bg-slate-900/30'}`}>
              <div className="col-span-8 truncate text-sm">{fh.name}</div>
              <div className="col-span-4 text-right">
                <button
                  onClick={() => handleLoadFile(fh)}
                  className="px-3 py-1 rounded-md bg-green-600 hover:bg-green-700 text-white text-sm font-semibold"
                >Carica</button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        supported && dirHandle && !loading && (
          <p className="text-gray-300">Nessun file .json trovato in questa cartella.</p>
        )
      )}

      {!supported && (
        <div className="mt-4 text-sm text-gray-300">
          Purtroppo non Ã¨ possibile ricordare la cartella senza il supporto nativo. Prova con Chrome o Edge.
        </div>
      )}
    </div>
  );
}


