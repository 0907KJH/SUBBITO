import React from 'react';

export const Alert = ({ children, className = '' }) => (
  <div className={className}>{children}</div>
);

export const AlertDescription = ({ children }) => <div>{children}</div>;

export default Alert;



