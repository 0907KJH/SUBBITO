// Utility functions per gestire il salvataggio locale delle configurazioni

const LOCAL_STORAGE_KEY = 'subbito_local_configs';

/**
 * Salva una configurazione in localStorage
 */
export const saveLocalConfig = (configData) => {
  try {
    const existingConfigs = getLocalConfigs();
    
    const newConfig = {
      ...configData,
      id: `local_${Date.now()}`, // ID univoco basato su timestamp
      created_date: new Date().toISOString(),
      isLocal: true // Flag per identificare le config locali
    };
    
    existingConfigs.push(newConfig);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(existingConfigs));
    
    return { success: true, config: newConfig };
  } catch (error) {
    console.error('Errore nel salvataggio locale:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Recupera tutte le configurazioni salvate localmente
 */
export const getLocalConfigs = () => {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!stored) return [];
    
    const configs = JSON.parse(stored);
    return Array.isArray(configs) ? configs : [];
  } catch (error) {
    console.error('Errore nel recupero delle configurazioni locali:', error);
    return [];
  }
};

/**
 * Elimina una configurazione locale
 */
export const deleteLocalConfig = (configId) => {
  try {
    const existingConfigs = getLocalConfigs();
    const filteredConfigs = existingConfigs.filter(config => config.id !== configId);
    
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filteredConfigs));
    return { success: true };
  } catch (error) {
    console.error('Errore nell\'eliminazione della configurazione locale:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Recupera una singola configurazione locale per ID
 */
export const getLocalConfigById = (configId) => {
  const configs = getLocalConfigs();
  return configs.find(config => config.id === configId);
};



