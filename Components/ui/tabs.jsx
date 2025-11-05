import React from 'react';

export const Tabs = ({ children, value, onChange, className = '' }) => (
  <div className={className}>{children}</div>
);

export const TabsList = ({ children, className = '' }) => <div className={className}>{children}</div>;
export const TabsTrigger = ({ children, value, onClick, className = '' }) => (
  <button onClick={() => onClick?.(value)} className={className}>{children}</button>
);

export const TabsContent = ({ children, className = '' }) => <div className={className}>{children}</div>;

export default Tabs;


