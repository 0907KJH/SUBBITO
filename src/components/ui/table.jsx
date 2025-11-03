import React from 'react';

export const Table = ({ children, className = '' }) => <table className={`w-full ${className}`}>{children}</table>;
export const TableHeader = ({ children, className = '' }) => <thead className={className}>{children}</thead>;
export const TableBody = ({ children, className = '' }) => <tbody className={className}>{children}</tbody>;
export const TableRow = ({ children, className = '' }) => <tr className={className}>{children}</tr>;
export const TableHead = ({ children, className = '' }) => <th className={`text-left p-2 ${className}`}>{children}</th>;
export const TableCell = ({ children, className = '' }) => <td className={`p-2 ${className}`}>{children}</td>;

export default Table;

