import React from 'react';

export const Input = ({ className = '', ...props }) => (
  <input className={className} {...props} />
);

export default Input;


