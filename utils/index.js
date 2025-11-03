export function createPageUrl(pageName) {
  // Mappa semplice: Home -> /, SavedConfigs -> /saved, etc.
  const map = {
    Home: '/',
    Overview: '/overview',
    Prediction: '/prediction',
    Report: '/report',
    SavedConfigs: '/saved',
    Visualization: '/visualization'
  };
  return map[pageName] || '/';
}

export default { createPageUrl };

