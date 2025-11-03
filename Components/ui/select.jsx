import React from 'react';

export const Select = ({ children, ...props }) => (
  <div {...props}>{children}</div>
);

export const SelectTrigger = ({ children, className = '' }) => (
  <div className={className}>{children}</div>
);

export const SelectContent = ({ children, className = '' }) => (
  <div className={className}>{children}</div>
);

export const SelectItem = ({ children, className = '', value }) => (
  <div data-value={value} className={className}>{children}</div>
);

export const SelectValue = ({ children }) => (
  <span>{children}</span>
);

export default Select;

