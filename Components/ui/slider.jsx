import React from 'react';

export const Slider = ({ value, onChange, min = 0, max = 100, step = 1, className = '' }) => {
  const handleChange = (e) => {
    const v = Number(e.target.value);
    onChange?.(v);
  };
  return (
    <input type="range" value={Array.isArray(value) ? value[0] : (value ?? 0)} min={min} max={max} step={step} onChange={handleChange} className={className} />
  );
};

export default Slider;



