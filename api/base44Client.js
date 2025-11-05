// Stub minimal per `base44` API client usato nell'app.
// Questo permette di eseguire l'app in locale senza dipendere dal servizio Base44.

export const base44 = {
  entities: {
    SubwooferConfig: {
      list: async () => [],
      create: async (data) => ({ id: `cloud_${Date.now()}`, ...data, created_date: new Date().toISOString() }),
      delete: async (id) => ({ success: true })
    }
  }
};

export default base44;


