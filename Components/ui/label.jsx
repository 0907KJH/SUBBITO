import React from 'react';

export const Label = ({ children, className = '', ...props }) => (
  <label className={className} {...props}>{children}</label>
);

export default Label;

