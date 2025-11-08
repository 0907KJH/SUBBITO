import React from 'react';

export const Dialog = ({ children, open, onOpenChange }) => (
  <div style={{ display: open ? 'block' : 'none' }}>{children}</div>
);

export const DialogContent = ({ children, className = '' }) => <div className={className}>{children}</div>;
export const DialogHeader = ({ children, className = '' }) => <div className={className}>{children}</div>;
export const DialogFooter = ({ children, className = '' }) => <div className={className}>{children}</div>;
export const DialogTitle = ({ children, className = '' }) => <h3 className={className}>{children}</h3>;
export const DialogDescription = ({ children, className = '' }) => <p className={className}>{children}</p>;

export default Dialog;



