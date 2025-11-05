// Utility functions per la navigazione e altre operazioni comuni
export const createPageUrl = (page, params = {}) => {
  const baseUrl = `/${page}`;
  const queryParams = new URLSearchParams(params).toString();
  return queryParams ? `${baseUrl}?${queryParams}` : baseUrl;
};

export const formatDelay = (delay, unit = 'ms') => {
  if (unit === 'ms') {
    return `${delay.toFixed(2)}ms`;
  } else {
    return `${(delay / 1000).toFixed(3)}s`;
  }
};

export const calculateWavelength = (frequency) => {
  const SPEED_OF_SOUND = 343; // m/s
  return SPEED_OF_SOUND / frequency;
};

// Altre utility functions possono essere aggiunte qui

