// Stub del client base44 che simula le chiamate API
export const base44 = {
  entities: {
    SubwooferConfig: {
      list: async () => {
        // Simula il recupero della lista delle configurazioni
        return [];
      },
      create: async (config) => {
        // Simula il salvataggio di una nuova configurazione
        // // // console.log('Saving config:', config);
        return { id: Date.now(), ...config };
      },
      delete: async (id) => {
        // Simula l'eliminazione di una configurazione
        // // // console.log('Deleting config:', id);
        return true;
      }
    }
  }
};


